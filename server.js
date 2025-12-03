// server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Storage paths (primary is NOTES_DIR; legacy PAD_DIR checked for compatibility)
const NOTES_DIR = path.join(__dirname, 'notes');
const LEGACY_PADS_DIR = path.join(__dirname, 'pads'); // for backward compatibility
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed file types (extensions)
const ALLOWED_EXTS = ['.pdf', '.jpg', '.jpeg', '.png', '.docx'];

// Initialize directories
async function initDirs() {
  await fs.mkdir(NOTES_DIR, { recursive: true });
  await fs.mkdir(LEGACY_PADS_DIR, { recursive: true }); // keep available but empty normally
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  console.log('✓ Storage directories initialized');
}

// Hash password with SHA-256
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate secure file ID
function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

// Validate MIME type using magic bytes (basic)
function validateMime(buffer, filename) {
  const ext = path.extname(filename).toLowerCase();
  if (buffer.length < 8) return false;

  const header = buffer.slice(0, 8).toString('hex');

  if (ext === '.pdf') return header.startsWith('25504446'); // %PDF
  if (ext === '.jpg' || ext === '.jpeg') return header.startsWith('ffd8ff'); // JPEG
  if (ext === '.png') return header.startsWith('89504e47'); // PNG
  if (ext === '.docx') return header.startsWith('504b0304') || header.startsWith('504b0506'); // ZIP based
  return false;
}

// Multer configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(ALLOWED_EXTS.includes(ext) ? null : new Error('Invalid file type'), ALLOWED_EXTS.includes(ext));
  }
});

// Helper: path to JSON metadata file (tries notes dir then legacy pads dir)
async function getMetaPath(noteId) {
  const notePath = path.join(NOTES_DIR, `${noteId}.json`);
  try {
    await fs.access(notePath);
    return notePath;
  } catch {
    // try legacy
    const legacyPath = path.join(LEGACY_PADS_DIR, `${noteId}.json`);
    try {
      await fs.access(legacyPath);
      return legacyPath;
    } catch {
      // return primary path (doesn't exist yet) so callers can write there
      return notePath;
    }
  }
}

// Read metadata (returns object or throws)
async function readMeta(noteId) {
  const metaPath = await getMetaPath(noteId);
  const content = await fs.readFile(metaPath, 'utf-8');
  return JSON.parse(content);
}

// Write metadata (always writes to NOTES_DIR)
async function writeMeta(noteId, data) {
  const metaPath = path.join(NOTES_DIR, `${noteId}.json`);
  await fs.writeFile(metaPath, JSON.stringify(data, null, 2));
  return metaPath;
}

// ============================================
// ROUTES (primary routes use "note"; legacy "pad" routes forward)
// ============================================

// Root redirect
app.get('/', (req, res) => {
  res.redirect('/note/default');
});

// Serve note interface (same HTML as before)
app.get('/note/:noteId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pad.html'));
});

// Legacy pad route -> forward to same UI (keeps compatibility)
app.get('/pad/:padId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pad.html'));
});

// ---------- Check exists ----------
app.get('/api/note/:noteId/exists', async (req, res) => {
  try {
    const metaPath = await getMetaPath(req.params.noteId);
    await fs.access(metaPath);
    res.json({ exists: true });
  } catch {
    res.json({ exists: false });
  }
});

// Legacy alias
app.get('/api/pad/:padId/exists', (req, res) => {
  // forward to note handler
  req.params.noteId = req.params.padId;
  app._router.handle(req, res, require('url').parse(req.url));
});

// ---------- Create note ----------
app.post('/api/note/:noteId/create', async (req, res) => {
  try {
    const { noteId } = req.params;
    const { password } = req.body;

    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const noteData = {
      content: '',
      files: [],
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    await writeMeta(noteId, noteData);
    res.json({ success: true });
  } catch (error) {
    console.error('Create error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Legacy alias
app.post('/api/pad/:padId/create', (req, res) => {
  req.params.noteId = req.params.padId;
  app._router.handle(req, res, require('url').parse(req.url));
});

// ---------- Verify password ----------
app.post('/api/note/:noteId/verify', async (req, res) => {
  try {
    const { noteId } = req.params;
    const { password } = req.body;

    const metaPath = await getMetaPath(noteId);
    const data = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
    const isValid = data.passwordHash === hashPassword(password);
    res.json({ success: isValid });
  } catch (err) {
    res.status(404).json({ success: false, error: 'Note not found' });
  }
});

// Legacy alias
app.post('/api/pad/:padId/verify', (req, res) => {
  req.params.noteId = req.params.padId;
  app._router.handle(req, res, require('url').parse(req.url));
});

// ---------- Get note content ----------
app.post('/api/note/:noteId/get', async (req, res) => {
  try {
    const { noteId } = req.params;
    const { password } = req.body;

    const data = await readMeta(noteId);
    if (data.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    res.json({ content: data.content, files: data.files });
  } catch (err) {
    res.status(404).json({ error: 'Note not found' });
  }
});

// Legacy alias
app.post('/api/pad/:padId/get', (req, res) => {
  req.params.noteId = req.params.padId;
  app._router.handle(req, res, require('url').parse(req.url));
});

// ---------- Save note content ----------
app.post('/api/note/:noteId/save', async (req, res) => {
  try {
    const { noteId } = req.params;
    const { password, content } = req.body;

    const data = await readMeta(noteId);
    if (data.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    data.content = content;
    data.lastModified = new Date().toISOString();
    await writeMeta(noteId, data);

    res.json({ success: true });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Legacy alias
app.post('/api/pad/:padId/save', (req, res) => {
  req.params.noteId = req.params.padId;
  app._router.handle(req, res, require('url').parse(req.url));
});

// ---------- Upload file ----------
app.post('/api/upload/:noteId', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const { noteId } = req.params;
    const { password } = req.body;

    const data = await readMeta(noteId);
    if (data.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Validate MIME via magic bytes
    const fileBuffer = req.file.buffer;
    if (!validateMime(fileBuffer, req.file.originalname)) {
      return res.status(400).json({ error: 'Invalid or corrupted file' });
    }

    // Save file on disk
    const fileId = generateId();
    const ext = path.extname(req.file.originalname);
    const noteDir = path.join(UPLOADS_DIR, noteId);
    await fs.mkdir(noteDir, { recursive: true });

    const filePath = path.join(noteDir, `${fileId}${ext}`);
    await fs.writeFile(filePath, fileBuffer);

    const fileInfo = {
      id: fileId,
      name: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    data.files.push(fileInfo);
    await writeMeta(noteId, data);

    res.json({ success: true, file: fileInfo });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Legacy alias (pad upload)
app.post('/api/upload/:padId', (req, res) => {
  req.params.noteId = req.params.padId;
  app._router.handle(req, res, require('url').parse(req.url));
});

// ---------- Download / Preview file ----------
app.post('/files/:noteId/:fileId', async (req, res) => {
  try {
    const { noteId, fileId } = req.params;
    const { password } = req.body;

    const data = await readMeta(noteId);
    if (data.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileInfo = data.files.find(f => f.id === fileId);
    if (!fileInfo) return res.status(404).json({ error: 'File not found' });

    if (new Date(fileInfo.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'File expired' });
    }

    const noteDir = path.join(UPLOADS_DIR, noteId);
    const filesOnDisk = await fs.readdir(noteDir).catch(() => []);
    const fileName = filesOnDisk.find(f => f.startsWith(fileId));
    if (!fileName) return res.status(404).json({ error: 'File not found on disk' });

    res.download(path.join(noteDir, fileName), fileInfo.name);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Legacy alias
app.post('/files/:padId/:fileId', (req, res) => {
  req.params.noteId = req.params.padId;
  app._router.handle(req, res, require('url').parse(req.url));
});

// ============================================
// CLEANUP: remove expired files and update metadata
// ============================================
async function cleanupExpired() {
  try {
    console.log('Running cleanup...');
    const metaFiles = await fs.readdir(NOTES_DIR).catch(() => []);
    let cleaned = 0;

    for (const metaFile of metaFiles) {
      if (!metaFile.endsWith('.json')) continue;
      const noteId = path.basename(metaFile, '.json');
      const metaPath = path.join(NOTES_DIR, metaFile);
      const data = JSON.parse(await fs.readFile(metaPath, 'utf-8'));

      const now = new Date();
      const expired = data.files.filter(f => new Date(f.expiresAt) < now);

      for (const file of expired) {
        try {
          const noteDir = path.join(UPLOADS_DIR, noteId);
          const files = await fs.readdir(noteDir).catch(() => []);
          const fileName = files.find(f => f.startsWith(file.id));
          if (fileName) {
            await fs.unlink(path.join(noteDir, fileName));
            cleaned++;
          }
        } catch (err) {
          console.error(`Error deleting file ${file.id}:`, err);
        }
      }

      data.files = data.files.filter(f => new Date(f.expiresAt) >= now);
      await writeMeta(noteId, data);
    }

    console.log(`✓ Cleanup complete. Removed ${cleaned} expired files.`);
  } catch (err) {
    console.error('Cleanup error:', err);
  }
}

// Run cleanup every hour
setInterval(cleanupExpired, 60 * 60 * 1000);

// ============================================
// SERVER START
// ============================================
initDirs().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════╗
║   SECURE NOTE PRO - SERVER RUNNING     ║
╠════════════════════════════════════════╣
║  Port: ${PORT.toString().padEnd(31)}║
║  Mode: Production                      ║
║  Storage: JSON + Disk                  ║
║  AI: Client-side (Transformers.js)     ║
╚════════════════════════════════════════╝
    `);

    // Initial cleanup
    cleanupExpired();
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

