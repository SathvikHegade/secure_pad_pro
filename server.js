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
    const { urlName, password } = req.body;
    
    // Validate URL name
    if (!urlName || !isValidCustomUrl(urlName)) {
      return res.status(400).json({ 
        error: 'Invalid URL name. Use 3-50 characters (letters, numbers, hyphens, underscores only)' 
      });
    }
    
    // Validate password
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    
    // Check if URL already exists
    if (await db.padExists(urlName)) {
      return res.status(409).json({ error: 'This URL name is already taken.' });
    }
    
    // Create pad with hashed password
    const passwordHash = await hashPassword(password);
    await db.createPad(urlName, passwordHash);
    
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
    
    if (!urlName || !password) {
      return res.status(400).json({ error: 'URL name and password are required' });
    }
    
    // Check if pad exists
    const pad = await db.getPad(urlName);
    if (!pad) {
      return res.status(401).json({ error: 'Incorrect URL or password.' });
    }
    
    // Verify password
    const isValid = await verifyPassword(password, pad.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect URL or password.' });
    }
    
    res.json({ success: true, padId: urlName });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Incorrect URL or password.' });
  }
});

// Get pad content (requires password)
app.post('/api/pad/:padId/get', async (req, res) => {
  try {
    const { padId } = req.params;
    const { password } = req.body;
    
    const pad = await db.getPad(padId);
    if (!pad) {
      return res.status(404).json({ error: 'Pad not found' });
    }
    
    // Verify password
    const isValid = await verifyPassword(password, pad.password_hash);
    if (!isValid) {
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
      uploadedAt: f.uploaded_at
    }));
    
    res.json({ content: pad.content || '', files });
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
    
    // Verify password
    const isValid = await verifyPassword(password, pad.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password' });
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
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    const { padId } = req.params;
    const { password } = req.body;
    
    // Verify pad and password
    const pad = await db.getPad(padId);
    if (!pad) {
      return res.status(404).json({ error: 'Pad not found' });
    }
    
    const isValid = await verifyPassword(password, pad.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    
    // Validate MIME
    const fileBuffer = req.file.buffer;
    if (!validateMime(fileBuffer, req.file.originalname)) {
      return res.status(400).json({ error: 'Invalid or corrupted file' });
    }
    
    // Save file
    const fileId = generateId();
    const ext = path.extname(req.file.originalname);
    const filename = `${fileId}${ext}`;
    const padDir = path.join(UPLOADS_DIR, padId);
    await fs.mkdir(padDir, { recursive: true });
    
    const filepath = path.join(padDir, filename);
    await fs.writeFile(filepath, fileBuffer);
    
    // Calculate expiration (24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Save to database
    const fileData = await db.addFile(
      padId,
      filename,
      req.file.originalname,
      filepath,
      req.file.size,
      req.file.mimetype,
      expiresAt
    );
    
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
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
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
      // Delete physical file
      try {
        await fs.unlink(file.path);
      } catch (err) {
        console.error('File deletion error:', err);
      }
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
    const filepath = path.join(UPLOADS_DIR, padId, filename);
    
    await fs.access(filepath);
    res.sendFile(filepath);
  } catch (error) {
    res.status(404).json({ error: 'File not found' });
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
    
    // Delete physical files
    for (const file of expiredFiles) {
      try {
        await fs.unlink(file.path);
      } catch (err) {
        console.error(`Failed to delete file: ${file.path}`, err);
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
    
    // Start cleanup interval
    setInterval(cleanupExpiredFiles, 60 * 60 * 1000); // Every hour
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔════════════════════════════════════════╗
║      SECURENOTE - SERVER RUNNING      ║
╠════════════════════════════════════════╣
║  Port: ${PORT.toString().padEnd(31)}║
║  Mode: Production                      ║
║  Storage: PostgreSQL + Disk            ║
║  AI: Google Gemini (${GEMINI_MODEL.padEnd(16)}) ║
║  Password: bcrypt (${SALT_ROUNDS} rounds)${' '.repeat(13)}║
╚════════════════════════════════════════╝
`);
      
      // Run initial cleanup
      cleanupExpiredFiles();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
