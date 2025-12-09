const { Pool } = require('pg');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('Initializing database...');
    
    // Create pads table
    await client.query(`
      CREATE TABLE IF NOT EXISTS pads (
        id SERIAL PRIMARY KEY,
        pad_id VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        content TEXT DEFAULT '',
        alert_email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add alert_email column if it doesn't exist (migration)
    try {
      await client.query(`
        ALTER TABLE pads 
        ADD COLUMN IF NOT EXISTS alert_email VARCHAR(255)
      `);
    } catch (err) {
      // Column might already exist
    }
    
    // Create security_logs table for tracking access attempts
    await client.query(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id SERIAL PRIMARY KEY,
        pad_id VARCHAR(255) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        success BOOLEAN,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pad_id) REFERENCES pads(pad_id) ON DELETE CASCADE
      )
    `);
    
    // Create index for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_security_logs_pad_id ON security_logs(pad_id);
      CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);
    `);
    
    // Create files table
    await client.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        pad_id VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        cloudinary_url TEXT,
        cloudinary_public_id TEXT,
        path TEXT,
        size INTEGER NOT NULL,
        mime_type VARCHAR(100),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        FOREIGN KEY (pad_id) REFERENCES pads(pad_id) ON DELETE CASCADE
      )
    `);
    
    // Add Cloudinary columns if they don't exist (migration for existing databases)
    try {
      await client.query(`
        ALTER TABLE files 
        ADD COLUMN IF NOT EXISTS cloudinary_url TEXT,
        ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT
      `);
      console.log('✓ Cloudinary columns added/verified');
    } catch (err) {
      // Columns might already exist, ignore error
      console.log('ℹ Cloudinary columns migration:', err.message);
    }
    
    // Remove NOT NULL constraint from path column (migration)
    try {
      await client.query(`
        ALTER TABLE files 
        ALTER COLUMN path DROP NOT NULL
      `);
      console.log('✓ Path column constraint removed');
    } catch (err) {
      console.log('ℹ Path column migration:', err.message);
    }
    
    // Create index on pad_id for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pads_pad_id ON pads(pad_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_files_pad_id ON files(pad_id)
    `);
    
    console.log('✓ Database tables initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Database query functions
const db = {
  // Check if pad exists
  async padExists(padId) {
    const result = await pool.query('SELECT pad_id FROM pads WHERE pad_id = $1', [padId]);
    return result.rows.length > 0;
  },
  
  // Create new pad
  async createPad(padId, passwordHash, alertEmail = null) {
    const result = await pool.query(
      'INSERT INTO pads (pad_id, password_hash, content, alert_email) VALUES ($1, $2, $3, $4) RETURNING *',
      [padId, passwordHash, '', alertEmail]
    );
    return result.rows[0];
  },
  
  // Get pad by ID
  async getPad(padId) {
    const result = await pool.query('SELECT * FROM pads WHERE pad_id = $1', [padId]);
    return result.rows[0];
  },
  
  // Update pad content
  async updatePad(padId, content) {
    const result = await pool.query(
      'UPDATE pads SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE pad_id = $2 RETURNING *',
      [content, padId]
    );
    return result.rows[0];
  },
  
  // Get files for pad
  async getFiles(padId) {
    const result = await pool.query(
      'SELECT * FROM files WHERE pad_id = $1 ORDER BY uploaded_at DESC',
      [padId]
    );
    return result.rows;
  },
  
  // Add file
  async addFile(padId, filename, originalName, cloudinaryUrl, cloudinaryPublicId, size, mimeType, expiresAt) {
    const result = await pool.query(
      `INSERT INTO files (pad_id, filename, original_name, cloudinary_url, cloudinary_public_id, size, mime_type, expires_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [padId, filename, originalName, cloudinaryUrl, cloudinaryPublicId, size, mimeType, expiresAt]
    );
    return result.rows[0];
  },
  
  // Delete file
  async deleteFile(fileId) {
    const result = await pool.query('DELETE FROM files WHERE id = $1 RETURNING *', [fileId]);
    return result.rows[0];
  },
  
  // Get expired files
  async getExpiredFiles() {
    const result = await pool.query(
      'SELECT * FROM files WHERE expires_at < CURRENT_TIMESTAMP'
    );
    return result.rows;
  },
  
  // Delete expired files
  async deleteExpiredFiles() {
    const result = await pool.query(
      'DELETE FROM files WHERE expires_at < CURRENT_TIMESTAMP RETURNING *'
    );
    return result.rows;
  },
  
  // Log security event
  async logSecurityEvent(padId, eventType, ipAddress, userAgent, success, details = null) {
    const result = await pool.query(
      `INSERT INTO security_logs (pad_id, event_type, ip_address, user_agent, success, details) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [padId, eventType, ipAddress, userAgent, success, details]
    );
    return result.rows[0];
  },
  
  // Get recent failed attempts for brute force detection
  async getRecentFailedAttempts(padId, minutes = 15) {
    const result = await pool.query(
      `SELECT COUNT(*) as count, ip_address 
       FROM security_logs 
       WHERE pad_id = $1 
       AND event_type = 'login_failed' 
       AND success = false 
       AND created_at > NOW() - INTERVAL '${minutes} minutes'
       GROUP BY ip_address`,
      [padId]
    );
    return result.rows;
  },
  
  // Get security logs for a pad
  async getSecurityLogs(padId, limit = 50) {
    const result = await pool.query(
      'SELECT * FROM security_logs WHERE pad_id = $1 ORDER BY created_at DESC LIMIT $2',
      [padId, limit]
    );
    return result.rows;
  }
};

module.exports = { pool, initDatabase, db };
