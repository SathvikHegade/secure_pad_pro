require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { initDatabase, db } = require('./db');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'models/gemini-2.5-flash';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Brute force protection tracking
const failedAttempts = new Map(); // IP -> { count, lastAttempt }

// Storage paths
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SALT_ROUNDS = 10;

// Allowed file types
const ALLOWED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
};

// Auto-delete content after 24 hours
function startAutoDeleteCleanup() {
  // Run cleanup every hour
  const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
  
  async function runCleanup() {
    try {
      const cleared = await db.clearExpiredContent();
      if (cleared.length > 0) {
        console.log(`🗑️ Auto-deleted content from ${cleared.length} pad(s) older than 24 hours`);
      }
    } catch (error) {
      console.error('Auto-delete cleanup error:', error);
    }
  }
  
  // Run immediately on startup
  runCleanup();
  
  // Then run every hour
  setInterval(runCleanup, CLEANUP_INTERVAL);
  console.log('✓ Auto-delete cleanup service started (runs every hour)');
}

// Initialize uploads directory
async function initDirs() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  console.log('✓ Storage directory initialized');
}

// Hash password with bcrypt
async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

// Verify password with bcrypt
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Generate secure file ID
function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

// Validate custom URL name
function isValidCustomUrl(urlName) {
  const regex = /^[a-zA-Z0-9_-]{3,50}$/;
  return regex.test(urlName);
}

// Validate MIME type using magic bytes
function validateMime(buffer, filename) {
  const ext = path.extname(filename).toLowerCase();
  if (buffer.length < 8) return false;
  
  const header = buffer.slice(0, 8).toString('hex');
  
  if (ext === '.pdf') return header.startsWith('25504446');
  if (ext === '.jpg' || ext === '.jpeg') return header.startsWith('ffd8ff');
  if (ext === '.png') return header.startsWith('89504e47');
  if (ext === '.docx') return header.startsWith('504b0304') || header.startsWith('504b0506');
  
  return false;
}

// Multer configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = Object.values(ALLOWED_TYPES).flat().includes(ext);
    cb(allowed ? null : new Error('Invalid file type'), allowed);
  }
});

// ============================================
// ROUTES
// ============================================

// Root - serve homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve pad interface
app.get('/pad/:padId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pad.html'));
});

// Check if custom URL is available
app.get('/api/check-url/:urlName', async (req, res) => {
  try {
    const { urlName } = req.params;
    
    if (!isValidCustomUrl(urlName)) {
      return res.json({ 
        available: false, 
        error: 'Invalid URL name. Use 3-50 characters (letters, numbers, hyphens, underscores only)' 
      });
    }
    
    const exists = await db.padExists(urlName);
    res.json({ available: !exists });
  } catch (error) {
    console.error('Check URL error:', error);
    res.status(500).json({ available: false, error: 'Server error' });
  }
});

// Create new pad with custom URL
app.post('/api/create-pad', async (req, res) => {
  try {
    const { urlName, password, isPublic } = req.body;
    
    // Validate URL name
    if (!urlName || !isValidCustomUrl(urlName)) {
      return res.status(400).json({ 
        error: 'Invalid URL name. Use 3-50 characters (letters, numbers, hyphens, underscores only)' 
      });
    }
    
    // Validate password only for private notes
    if (!isPublic && (!password || password.length < 4)) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    
    // Check if URL already exists
    if (await db.padExists(urlName)) {
      return res.status(409).json({ error: 'This URL name is already taken.' });
    }
    
    // Create pad with hashed password and privacy setting
    const passwordHash = isPublic ? await hashPassword('') : await hashPassword(password);
    await db.createPad(urlName, passwordHash, isPublic === true);
    
    res.json({ success: true, padId: urlName });
  } catch (error) {
    console.error('Create pad error:', error);
    res.status(500).json({ error: 'Failed to create pad' });
  }
});

// Login to existing pad
app.post('/api/login', async (req, res) => {
  try {
    const { urlName, password } = req.body;
    
    if (!urlName) {
      return res.status(400).json({ error: 'URL name is required' });
    }
    
    // Check if pad exists
    const pad = await db.getPad(urlName);
    if (!pad) {
      return res.status(401).json({ error: 'Note not found' });
    }
    
    // If note is public, allow access without password
    if (pad.is_public) {
      return res.json({ success: true, padId: urlName, isPublic: true });
    }
    
    // For private notes, verify password
    if (!password) {
      return res.status(400).json({ error: 'Password is required for private notes' });
    }
    
    const isValid = await verifyPassword(password, pad.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    
    res.json({ success: true, padId: urlName, isPublic: false });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Failed to access note' });
  }
});

// Get pad content (requires password)
app.post('/api/pad/:padId/get', async (req, res) => {
  try {
    const { padId } = req.params;
    const { password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    
    const pad = await db.getPad(padId);
    if (!pad) {
      return res.status(404).json({ error: 'Pad not found' });
    }
    
    // Check if note is public - skip password verification
    if (pad.is_public) {
      // Public note - no password required
      const filesData = await db.getFiles(padId);
      const files = filesData.map(f => ({
        id: f.id,
        name: f.original_name,
        filename: f.filename,
        size: f.size,
        type: f.mime_type,
        uploadedAt: f.uploaded_at,
        expiresAt: f.expires_at
      }));
      
      // Log access
      await db.logSecurityEvent(padId, 'note_accessed', ip, userAgent, true, 'public');
      
      return res.json({ content: pad.content || '', files, isPublic: true });
    }
    
    // Private note - verify password
    const isValid = await verifyPassword(password, pad.password_hash);
    if (!isValid) {
      // Log failed attempt
      await db.logSecurityEvent(padId, 'login_failed', ip, userAgent, false);
      
      // Check for brute force
      const recentFailed = await db.getRecentFailedAttempts(padId, 15);
      const ipAttempts = recentFailed.find(r => r.ip_address === ip);
      
      if (ipAttempts && parseInt(ipAttempts.count) >= 5) {
        // Brute force detected
        await db.logSecurityEvent(padId, 'brute_force', ip, userAgent, false, `${ipAttempts.count} failed attempts`);
      }
      
      return res.status(401).json({ error: 'Incorrect password' });
    }
    
    // Get files
    const filesData = await db.getFiles(padId);
    const files = filesData.map(f => ({
      id: f.id,
      name: f.original_name,
      filename: f.filename,
      size: f.size,
      type: f.mime_type,
      uploadedAt: f.uploaded_at,
      expiresAt: f.expires_at
    }));
    
    // Log successful access
    await db.logSecurityEvent(padId, 'note_accessed', ip, userAgent, true, 'private');
    
    res.json({ content: pad.content || '', files, isPublic: false });
  } catch (error) {
    console.error('Get pad error:', error);
    res.status(500).json({ error: 'Failed to load pad' });
  }
});

// Save pad content (auto-save)
app.post('/api/pad/:padId/save', async (req, res) => {
  try {
    const { padId } = req.params;
    const { password, content } = req.body;
    
    const pad = await db.getPad(padId);
    if (!pad) {
      return res.status(404).json({ error: 'Pad not found' });
    }
    
    // For public notes, skip password verification
    if (!pad.is_public) {
      // Verify password for private notes
      const isValid = await verifyPassword(password, pad.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Incorrect password' });
      }
    }
    
    // Update content
    await db.updatePad(padId, content);
    res.json({ success: true });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Upload file
app.post('/api/upload/:padId', upload.single('file'), async (req, res) => {
  try {
    console.log('[UPLOAD] Starting file upload...');
    
    if (!req.file) {
      console.error('[UPLOAD] No file provided');
      return res.status(400).json({ error: 'No file provided' });
    }
    
    console.log('[UPLOAD] File received:', req.file.originalname, req.file.size, 'bytes');
    
    const { padId } = req.params;
    const { password } = req.body;
    
    // Verify pad and password
    const pad = await db.getPad(padId);
    if (!pad) {
      console.error('[UPLOAD] Pad not found:', padId);
      return res.status(404).json({ error: 'Pad not found' });
    }
    
    const isValid = await verifyPassword(password, pad.password_hash);
    if (!isValid) {
      console.error('[UPLOAD] Incorrect password');
      return res.status(401).json({ error: 'Incorrect password' });
    }
    
    // Validate MIME
    const fileBuffer = req.file.buffer;
    if (!validateMime(fileBuffer, req.file.originalname)) {
      console.error('[UPLOAD] Invalid MIME type');
      return res.status(400).json({ error: 'Invalid or corrupted file' });
    }
    
    console.log('[UPLOAD] Validation passed, uploading to Cloudinary...');
    console.log('[UPLOAD] Cloudinary config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
      api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING'
    });
    
    // Generate unique filename
    const fileId = generateId();
    const ext = path.extname(req.file.originalname);
    const filename = `${fileId}${ext}`;
    
    // Determine Cloudinary resource type
    const isPdf = ext.toLowerCase() === '.pdf';
    const isDocx = ext.toLowerCase() === '.docx';
    const resourceType = (isPdf || isDocx) ? 'raw' : 'auto';
    
    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `securenote/${padId}`,
          public_id: `${fileId}${ext}`,
          resource_type: resourceType,
          type: 'upload',
          access_mode: 'public'
        },
        (error, result) => {
          if (error) {
            console.error('[UPLOAD] Cloudinary error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      uploadStream.end(fileBuffer);
    });
    
    console.log('[UPLOAD] ✓ Uploaded to Cloudinary:', uploadResult.secure_url);
    
    // Calculate expiration (24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Save to database with Cloudinary URL
    const fileData = await db.addFile(
      padId,
      filename,
      req.file.originalname,
      uploadResult.secure_url,
      uploadResult.public_id,
      req.file.size,
      req.file.mimetype,
      expiresAt
    );
    
    // Log file upload event
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    await db.logSecurityEvent(padId, 'file_uploaded', ip, userAgent, true, req.file.originalname);
    
    res.json({
      success: true,
      file: {
        id: fileData.id,
        name: fileData.original_name,
        filename: fileData.filename,
        size: fileData.size,
        type: fileData.mime_type,
        uploadedAt: fileData.uploaded_at
      }
    });
  } catch (error) {
    console.error('[UPLOAD] Upload error:', error);
    console.error('[UPLOAD] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      error: 'Upload failed',
      details: error.message 
    });
  }
});

// Delete file
app.delete('/api/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { padId, password } = req.body;
    
    // Verify pad and password
    const pad = await db.getPad(padId);
    if (!pad) {
      return res.status(404).json({ error: 'Pad not found' });
    }
    
    const isValid = await verifyPassword(password, pad.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    
    // Delete from database
    const file = await db.deleteFile(fileId);
    
    if (file) {
      // Delete from Cloudinary if exists
      if (file.cloudinary_public_id) {
        try {
          await cloudinary.uploader.destroy(file.cloudinary_public_id, {
            resource_type: file.filename.toLowerCase().endsWith('.pdf') || file.filename.toLowerCase().endsWith('.docx') ? 'raw' : 'image'
          });
          console.log(`✓ Deleted from Cloudinary: ${file.cloudinary_public_id}`);
        } catch (err) {
          console.error('Cloudinary deletion error:', err);
        }
      }
      
      // Log file deletion event
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');
      await db.logSecurityEvent(padId, 'file_deleted', ip, userAgent, true, file.original_name);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Download file
app.get('/api/file/:padId/:filename', async (req, res) => {
  try {
    const { padId, filename } = req.params;
    console.log(`[FILE REQUEST] padId: ${padId}, filename: ${filename}`);
    
    // Get file info from database
    const files = await db.getFiles(padId);
    const fileRecord = files.find(f => f.filename === filename);
    
    if (!fileRecord) {
      console.error(`[FILE ERROR] File not found in database: ${filename}`);
      return res.status(404).json({ error: 'File not found in database' });
    }
    
    if (!fileRecord.cloudinary_public_id) {
      return res.status(404).json({ error: 'File not available' });
    }
    
    console.log(`[FILE INFO] Public ID: ${fileRecord.cloudinary_public_id}`);
    console.log(`[FILE INFO] Stored URL: ${fileRecord.cloudinary_url}`);
    
    // Log file download event
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    await db.logSecurityEvent(padId, 'file_downloaded', ip, userAgent, true, fileRecord.original_name);
    
    // Determine resource type
    const isPdf = fileRecord.filename.toLowerCase().endsWith('.pdf');
    const isDocx = fileRecord.filename.toLowerCase().endsWith('.docx');
    const resourceType = (isPdf || isDocx) ? 'raw' : 'image';
    
    // Use Cloudinary API to get the resource directly
    try {
      const result = await cloudinary.api.resource(fileRecord.cloudinary_public_id, {
        resource_type: resourceType
      });
      
      console.log(`[FILE INFO] Cloudinary resource found: ${result.secure_url}`);
      
      // Fetch the file using the secure URL from the API response
      const cloudinaryResponse = await fetch(result.secure_url);
      
      if (!cloudinaryResponse.ok) {
        console.error(`[FILE ERROR] Cloudinary fetch returned ${cloudinaryResponse.status}`);
        return res.status(cloudinaryResponse.status).json({ 
          error: 'Failed to fetch file from storage',
          status: cloudinaryResponse.status
        });
      }
      
      // Set headers
      res.setHeader('Content-Type', fileRecord.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${fileRecord.original_name}"`);
      
      // Stream the file
      const buffer = await cloudinaryResponse.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (cloudinaryError) {
      console.error('[FILE ERROR] Cloudinary API error:', cloudinaryError);
      return res.status(500).json({ 
        error: 'Failed to retrieve file', 
        details: cloudinaryError.message 
      });
    }
  } catch (error) {
    console.error('[FILE ERROR]', error);
    res.status(500).json({ error: 'Failed to retrieve file' });
  }
});

// Test Gemini API connection
app.get('/api/test-gemini', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ 
        success: false, 
        error: 'GEMINI_API_KEY not set in environment variables' 
      });
    }
    
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent('Say hello in one word.');
    const response = await result.response;
    const text = response.text();
    
    res.json({ 
      success: true, 
      message: 'Gemini API is working!',
      model: GEMINI_MODEL,
      response: text,
      apiKeyConfigured: true
    });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message,
      status: error.status,
      statusText: error.statusText,
      model: GEMINI_MODEL,
      apiKeyConfigured: !!process.env.GEMINI_API_KEY
    });
  }
});

// Test Cloudinary configuration
app.get('/api/test-cloudinary', async (req, res) => {
  try {
    const config = {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'NOT SET',
      api_key: process.env.CLOUDINARY_API_KEY ? 'SET (hidden)' : 'NOT SET',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET (hidden)' : 'NOT SET'
    };
    
    // Check if all are configured
    const allConfigured = 
      process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET;
    
    if (!allConfigured) {
      return res.json({
        success: false,
        error: 'Cloudinary not fully configured',
        config
      });
    }
    
    // Try a simple test upload
    try {
      const testBuffer = Buffer.from('test');
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'securenote/test',
            resource_type: 'raw'
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(testBuffer);
      });
      
      // Delete the test file
      await cloudinary.uploader.destroy(result.public_id, { resource_type: 'raw' });
      
      res.json({
        success: true,
        message: 'Cloudinary is working!',
        config,
        test_upload: 'SUCCESS'
      });
    } catch (uploadError) {
      res.json({
        success: false,
        error: 'Cloudinary upload test failed',
        details: uploadError.message,
        config
      });
    }
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint - list files for a pad
app.get('/api/debug/files/:padId', async (req, res) => {
  try {
    const { padId } = req.params;
    const files = await db.getFiles(padId);
    
    // Check which files exist on disk
    const fileStatus = await Promise.all(files.map(async (f) => {
      let exists = false;
      try {
        if (f.path) {
          await fs.access(f.path);
          exists = true;
        }
      } catch (err) {
        exists = false;
      }
      
      return {
        id: f.id,
        filename: f.filename,
        original_name: f.original_name,
        cloudinary_url: f.cloudinary_url || null,
        cloudinary_public_id: f.cloudinary_public_id || null,
        path: f.path,
        size: f.size,
        exists_on_disk: exists,
        uploaded_at: f.uploaded_at
      };
    }));
    
    res.json({
      padId,
      uploadsDir: UPLOADS_DIR,
      __dirname: __dirname,
      files: fileStatus
    });
  } catch (error) {
    console.error('Debug files error:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI Summarization
app.post('/api/summarize', async (req, res) => {
  try {
    const { padId, password, content } = req.body;
    
    // Verify password
    const pad = await db.getPad(padId);
    if (!pad) {
      return res.status(404).json({ error: 'Pad not found' });
    }
    
    const isValid = await verifyPassword(password, pad.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Validate content
    if (!content || content.trim().length < 50) {
      return res.status(400).json({ error: 'Content must be at least 50 characters' });
    }
    
    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ 
        error: 'Gemini API key not configured. Please add GEMINI_API_KEY to .env file' 
      });
    }
    
    // Generate summary using Gemini
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(`Summarize the following text clearly and concisely:\n\n${content}`);
    const response = await result.response;
    const summary = response.text();
    
    res.json({ 
      success: true, 
      summary: summary.trim()
    });
  } catch (error) {
    console.error('Summarization error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      stack: error.stack
    });
    
    // Provide detailed error messages
    if (error.message && error.message.includes('API key')) {
      return res.status(503).json({ 
        error: 'Invalid Gemini API key. Please check your .env configuration' 
      });
    }
    
    if (error.message && error.message.includes('404')) {
      return res.status(503).json({ 
        error: `Model not found: ${GEMINI_MODEL}. The model may not be available for your API key.` 
      });
    }
    
    if (error.status === 403 || error.statusText === 'Forbidden') {
      return res.status(503).json({ 
        error: 'API key is invalid or does not have permission to access Gemini API' 
      });
    }
    
    res.status(500).json({ 
      error: `Summarization failed: ${error.message || 'Unknown error'}` 
    });
  }
});

// Cleanup expired files (runs every hour)
async function cleanupExpiredFiles() {
  try {
    console.log('Running cleanup...');
    const expiredFiles = await db.deleteExpiredFiles();
    
    // Delete from Cloudinary
    for (const file of expiredFiles) {
      try {
        if (file.cloudinary_public_id) {
          await cloudinary.uploader.destroy(file.cloudinary_public_id, { resource_type: 'raw' });
          console.log(`✓ Deleted from Cloudinary: ${file.cloudinary_public_id}`);
        }
      } catch (err) {
        console.error(`Failed to delete from Cloudinary: ${file.cloudinary_public_id}`, err);
      }
    }
    
    console.log(`✓ Cleanup complete. Removed ${expiredFiles.length} expired files.`);
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// ============================================
// START SERVER
// ============================================

async function startServer() {
  try {
    // Initialize database
    await initDatabase();
    
    // Initialize file storage
    await initDirs();
    
    // Start cleanup intervals
    setInterval(cleanupExpiredFiles, 60 * 60 * 1000); // Every hour
    setInterval(async () => {
      try {
        const cleared = await db.clearExpiredContent();
        if (cleared.length > 0) {
          console.log(`🗑️  Auto-deleted content from ${cleared.length} pad(s) older than 24 hours`);
        }
      } catch (error) {
        console.error('Auto-delete cleanup error:', error);
      }
    }, 60 * 60 * 1000); // Every hour
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔════════════════════════════════════════╗
║      SECURENOTE - SERVER RUNNING      ║
╠════════════════════════════════════════╣
║  Port: ${PORT.toString().padEnd(31)}║
║  Mode: Production                      ║
║  Storage: PostgreSQL + Cloudinary      ║
║  AI: Google Gemini (${GEMINI_MODEL.padEnd(16)}) ║
║  Password: bcrypt (${SALT_ROUNDS} rounds)${' '.repeat(13)}║
║  Alerts: Email (${process.env.SMTP_HOST ? 'Enabled' : 'Disabled'})${' '.repeat(17)}║
╚════════════════════════════════════════╝
`);
      
      // Run initial cleanups
      cleanupExpiredFiles();
      db.clearExpiredContent().then(cleared => {
        if (cleared.length > 0) {
          console.log(`🗑️  Auto-deleted content from ${cleared.length} pad(s) older than 24 hours`);
        }
      }).catch(err => console.error('Initial content cleanup error:', err));
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
