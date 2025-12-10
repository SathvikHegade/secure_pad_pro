# SecureNote - Professional Note Management

A modern, secure note-taking platform with **public/private notes**, **custom URLs**, **bcrypt security**, **AI summarization**, and **auto-delete** functionality. Production-ready with PostgreSQL + Cloudinary storage.

![Version](https://img.shields.io/badge/version-3.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![Database](https://img.shields.io/badge/database-PostgreSQL-336791)

## ✨ Features

### 🎯 Core Features
- 🔗 **Custom URLs** - Create memorable URLs like `New5` or `myproject123`
- 🌐 **Public/Private Notes** - Choose between public (no password) or private (password-protected) notes
- 🔐 **bcrypt Security** - Industry-standard password hashing (10 rounds)
- 💾 **Auto-Save** - Notes saved automatically every 2 seconds
- ⏰ **Auto-Delete** - Note content automatically deleted after 24 hours
- 📎 **File Uploads** - Up to 10MB (PDF, JPG, PNG, DOCX) via Cloudinary
- 👁️ **File Preview** - View PDFs and images instantly
- ✨ **AI Summarization** - Powered by Google Gemini 2.5 Flash
- 📱 **Responsive Design** - Works on mobile, tablet, and desktop
- 🌙 **Dark Mode** - Toggle between light and dark themes
- 🗄️ **PostgreSQL Database** - Reliable, scalable data storage

### 🔒 Security Features
- **Public/Private Mode** - Optional password protection
- **bcrypt Password Hashing** - 10 salt rounds, no plain text storage
- **Custom URL Validation** - Alphanumeric, hyphens, underscores only (3-50 chars)
- **Unique URL Enforcement** - Each custom URL can only be used once
- **MIME Type Validation** - File headers checked, not just extensions
- **File Size Limits** - 10MB maximum per upload
- **Secure Error Messages** - Generic messages prevent enumeration attacks
- **Brute Force Protection** - Rate limiting on failed login attempts

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│          Frontend (Browser)                  │
│  • Homepage: Login/Create Pad                │
│  • Public/Private Note Selection             │
│  • Pad Editor: Auto-save, File uploads       │
│  • AI Summarization UI                       │
└─────────────┬────────────────────────────────┘
              │ REST API (JSON)
┌─────────────▼────────────────────────────────┐
│         Backend (Node.js/Express)            │
│  • Custom URL Management                     │
│  • Public/Private Note Logic                 │
│  • bcrypt Password Hashing                   │
│  • Auto-Delete Service (hourly)              │
│  • File Validation & Cloudinary Upload       │
│  • Google Gemini AI Integration              │
│  • Security Logging & Monitoring             │
└─────────────┬────────────────────────────────┘
              │
┌─────────────▼────────────────────────────────┐
│          Storage Layer                       │
│  • PostgreSQL Database (pads, files, logs)   │
│  • Cloudinary (file storage CDN)             │
└──────────────────────────────────────────────┘
```

## 📁 Project Structure

```
secure_pad_pro/
├── server.js              # Express backend with all routes
├── db.js                  # PostgreSQL database operations
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (not in git)
├── .env.example           # Environment template
├── README.md              # This file
├── SETUP.md               # PostgreSQL setup guide
├── QUICKSTART.md          # Quick deployment guide
├── render.yaml            # Render.com deployment config
├── public/
│   ├── index.html         # Homepage (login/create pad)
│   ├── index.js           # Homepage JavaScript
│   ├── pad.html           # Pad editor interface
│   ├── script.js          # Pad editor JavaScript
│   ├── style.css          # Global styles (professional design)
│   └── manifest.json      # PWA manifest
├── pads/                  # Legacy JSON storage (deprecated)
└── uploads/               # Legacy uploads (deprecated)
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your Gemini API key
```

Get your Gemini API key: https://makersuite.google.com/app/apikey

### 3. Run the Server

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

### 4. Open in Browser

Navigate to `http://localhost:3000`

## 📚 Full Documentation

See **[SETUP.md](./SETUP.md)** for:
- Detailed installation instructions
- Configuration options
- Deployment guides (Render, Heroku, Railway, etc.)
- Complete API documentation
- Database schema
- Security best practices
- Troubleshooting guide

## 🎯 How to Use

### Creating a New Note

1. Go to the homepage
2. Click **"Create New Note"** tab
3. Choose **Public** or **Private**:
   - **Public**: No password required, anyone with URL can access
   - **Private**: Password-protected, only you can access
4. Enter a custom URL name (e.g., "myproject123" or "New5")
5. If private, create and confirm a secure password
6. Click **"Create My Note"**
7. Start writing - auto-saves every 2 seconds!

### Accessing an Existing Note

**Public Notes:**
1. Go to homepage
2. Enter the URL name
3. Leave password field **empty**
4. Click **"Access My Note"**

**Private Notes:**
1. Go to homepage
2. Enter the URL name
3. Enter your password
4. Click **"Access My Note"**

### Using Features

**Auto-Delete (24 Hours):**
- Note content automatically deletes after 24 hours of last edit
- Timer resets every time you save changes
- URL and structure remain, only content is cleared

**AI Summarization:**
1. Write at least 50 characters in your note
2. Click **"Summarize"** button
3. Google Gemini AI generates a concise summary
4. View document statistics and insights

**File Uploads:**
1. Click **"Upload"** button
2. Select file (PDF, JPG, PNG, DOCX up to 10MB)
3. Files stored on Cloudinary CDN
4. Click to preview or download

## 🔑 Environment Variables

Create a `.env` file with:

```env
# Server Port (default: 3000)
PORT=3000

# Node Environment
NODE_ENV=production

# PostgreSQL Database URL (required)
DATABASE_URL=postgresql://user:password@host:5432/database

# Google Gemini API Key (required for AI summarization)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=models/gemini-2.5-flash

# Cloudinary Configuration (required for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Get API Keys:**
- **Gemini API**: https://makersuite.google.com/app/apikey (Free tier available)
- **Cloudinary**: https://cloudinary.com/users/register/free (25GB free storage)
- **PostgreSQL**: Render.com or Supabase (free tier available)

## 🌐 Deployment

### Deploy to Render

1. Create account at https://render.com
2. Create new **PostgreSQL Database** (free tier)
3. Create new **Web Service**
4. Connect your repository
5. Set environment variables:
   - `DATABASE_URL` (from PostgreSQL dashboard)
   - `GEMINI_API_KEY` (from Google AI Studio)
   - `CLOUDINARY_CLOUD_NAME` (from Cloudinary dashboard)
   - `CLOUDINARY_API_KEY` (from Cloudinary dashboard)
   - `CLOUDINARY_API_SECRET` (from Cloudinary dashboard)
6. Deploy!

**Important:** Get free Cloudinary account at https://cloudinary.com (25GB storage free)

### Deploy to Other Platforms

See [SETUP.md](./SETUP.md) for deployment guides for:
- Heroku
- Railway
- DigitalOcean
- AWS
- Any Node.js hosting platform

## 🛡️ Security

## 🛡️ Security

### Password Security
- **bcrypt hashing** with 10 salt rounds
- No plain text password storage
- Timing-safe password comparison
- Optional for public notes

### Public/Private Notes
- **Public notes**: No password required, accessible to anyone with URL
- **Private notes**: Password-protected, bcrypt hashed
- Frontend dynamically shows/hides password fields

### Input Validation
- Custom URL names: `^[a-zA-Z0-9_-]{3,50}$`
- Password minimum: 4 characters (only for private notes)
- File size limit: 10MB per file
- Allowed file types: PDF, JPG, PNG, DOCX

### File Security
- MIME type validation using magic bytes
- Cloudinary CDN storage with secure URLs
- Automatic expiration after 24 hours
- Secure file ID generation (32-char hex)

### Auto-Delete Protection
- Content automatically cleared after 24 hours
- Timer resets on every save
- Prevents data accumulation
- Note structure preserved, only content cleared

## 📊 Database Schema

### PostgreSQL Tables

**pads** table:
```sql
CREATE TABLE pads (
  id SERIAL PRIMARY KEY,
  pad_id VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  content TEXT DEFAULT '',
  is_public BOOLEAN DEFAULT false,
  content_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**files** table:
```sql
CREATE TABLE files (
  id SERIAL PRIMARY KEY,
  pad_id VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  cloudinary_url TEXT,
  cloudinary_public_id TEXT,
  size INTEGER NOT NULL,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (pad_id) REFERENCES pads(pad_id) ON DELETE CASCADE
);
```

**security_logs** table:
```sql
CREATE TABLE security_logs (
  id SERIAL PRIMARY KEY,
  pad_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pad_id) REFERENCES pads(pad_id) ON DELETE CASCADE
);
```

**Key Features:**
- `is_public`: Determines if note requires password
- `content_created_at`: Tracks content age for auto-delete (24hr)
- `cloudinary_url`: CDN URL for uploaded files
- Foreign keys ensure data integrity with CASCADE delete

## 🔧 API Endpoints

### Authentication & Note Management
- `POST /api/create-pad` - Create new note (public or private)
  - Body: `{ urlName, password?, isPublic }`
- `POST /api/login` - Access existing note
  - Body: `{ urlName, password? }`
  - Public notes: password optional
- `GET /api/check-url/:urlName` - Check URL availability

### Content Operations
- `POST /api/pad/:padId/get` - Get note content
  - Body: `{ password? }` (optional for public notes)
- `POST /api/pad/:padId/save` - Save note content
  - Body: `{ password, content }`
  - Resets 24hr auto-delete timer

### File Operations
- `POST /api/upload/:padId` - Upload file to Cloudinary
  - Multipart form data
  - Returns Cloudinary URL
- `POST /files/:padId/:fileId` - Get file metadata
- `DELETE /api/pad/:padId/file/:fileId` - Delete file

### AI Features
- `POST /api/summarize/:padId` - Generate AI summary with Gemini
  - Body: `{ password, content }`

### Background Services
- Auto-delete cleanup: Runs hourly, clears content older than 24 hours
- File expiry cleanup: Removes expired Cloudinary files

See [POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md) for complete API documentation.

## 🐛 Troubleshooting

### Common Issues

**"Gemini API key not configured"**
- Ensure `.env` file exists with valid `GEMINI_API_KEY`
- Get free key at https://makersuite.google.com/app/apikey

**"This URL name is already taken"**
- Choose a different custom URL name
- Try adding numbers or hyphens

**Database connection failed**
- Verify `DATABASE_URL` in `.env` is correct
- Check PostgreSQL server is running
- See [POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md) for setup

**File upload fails**
- Check file size (max 10MB)
- Verify file type is allowed (PDF, JPG, PNG, DOCX)
- Ensure Cloudinary credentials are correct in `.env`

**Public note still asking for password**
- Clear browser cache (Ctrl+Shift+Delete)
- Use incognito/private window to test
- Verify `is_public=true` in database

**Content disappeared after 24 hours**
- This is expected - auto-delete feature
- Timer resets on every save
- URL and files remain, only text content is cleared

See [SETUP.md](./SETUP.md) for more troubleshooting tips.

## 📦 Dependencies

### Production
- `express` - Web framework
- `pg` - PostgreSQL client
- `multer` - File upload handling
- `cors` - Cross-origin resource sharing
- `bcrypt` - Password hashing
- `cloudinary` - File storage CDN
- `@google/generative-ai` - Google Gemini SDK
- `dotenv` - Environment variable management

### Development
- `nodemon` - Auto-restart on file changes

## 🚀 What's New in v3.0

- ✅ **Public/Private Notes** - Choose between password-protected or open access
- ✅ **Auto-Delete Content** - Notes automatically cleared after 24 hours
- ✅ **PostgreSQL Database** - Migrated from JSON to robust database
- ✅ **Cloudinary Storage** - Professional CDN for file uploads
- ✅ **Professional UI** - Removed emojis, added hamburger menu
- ✅ **Security Logging** - Track access attempts and monitor usage
- ✅ **Improved Performance** - Background cleanup jobs, optimized queries

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - See LICENSE file for details

## 👨‍💻 Developer

**T S Sathvik Hegade**
- 📧 Email: sathvikhegade3@gmail.com
- 🎓 Institution: BMS Institute of Technology and Management
- 💻 Skills: Machine Learning, Deep Learning, C++, Python

## 🙏 Acknowledgments

- **Google Gemini AI** - Advanced text summarization
- **PostgreSQL** - Reliable database system
- **Cloudinary** - Professional file storage CDN
- **bcrypt** - Secure password hashing library
- **Express.js** - Fast web framework
- **Render.com** - Free hosting platform

---

**Need Help?** 
- 📖 Read [POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md) for database setup
- 📖 Read [QUICKSTART.md](./QUICKSTART.md) for deployment
- 📧 Email: sathvikhegade3@gmail.com
- 🐛 Report bugs via email

**Made with dedication by T S Sathvik Hegade** with all routes
├── package.json           # Dependencies and scripts
├── .env.example           # Environment variables template
├── SETUP.md              # Comprehensive setup guide
├── README.md             # This file
├── package.json           # Dependencies
├── README.md             # This file
├── .gitignore            # Git ignore
├── render.yaml           # Render config
├── public/
│   ├── index.html        # Landing page (optional)
│   ├── pad.html          # Main pad interface
│   ├── style.css         # Styling
│   ├── script.js         # Client logic + AI
│   ├── manifest.json     # PWA manifest
│   └── icon.svg          # App icon
├── pads/                 # JSON storage (auto-created)
└── uploads/              # File storage (auto-created)
```

## 🚀 Quick Start

### Local Development

```bash
# 1. Clone or create project directory
mkdir secure-pad-pro
cd secure-pad-pro

# 2. Install dependencies
npm install

# 3. Start server
npm start

# 4. Open browser
# Visit http://localhost:3000
```

## 🌐 Deployment

### Option 1: Render (Recommended)

**100% Free Tier - No credit card required**

1. **Push to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_GITHUB_URL
git push -u origin main
```

2. **Deploy on Render:**
   - Go to https://render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Use these settings:
     - **Name:** secure-pad-pro
     - **Environment:** Node
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
     - **Instance Type:** Free
   - Click "Create Web Service"

3. **Access your app:**
   - URL: `https://your-app-name.onrender.com`

**Note:** Free tier may sleep after inactivity but wakes up on first request.

### Option 2: Railway

**Free $5 credit monthly**

1. **Push to GitHub** (same as above)

2. **Deploy on Railway:**
   - Go to https://railway.app
   - Click "Start a New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway auto-detects Node.js
   - Click "Deploy"

3. **Generate domain:**
   - Go to Settings → Generate Domain
   - Access at: `https://your-app.up.railway.app`

### Option 3: Cyclic.sh

**Free unlimited apps**

1. Go to https://cyclic.sh
2. Connect GitHub
3. Deploy repository
4. Done!

## 🔧 Configuration

### Environment Variables

No environment variables required! Everything works out of the box.

### Custom Port

```bash
PORT=8080 npm start
```

### File Size Limit

Edit `server.js`:
```javascript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // Change to desired size
```

### File Expiry Time

Edit `server.js`:
```javascript
expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
// Change to: 48 * 60 * 60 * 1000 for 48 hours
```

## 🧪 Testing

### Manual Testing

1. **Create Pad:**
   - Visit `/pad/test123`
   - Set password "test123"
   - Verify pad is created

2. **Save Notes:**
   - Type text
   - Wait 2 seconds
   - Check "Saved" status appears

3. **Upload File:**
   - Click upload zone
   - Select a PDF or image
   - Verify file appears in list

4. **Preview File:**
   - Click "Preview" button
   - Verify modal opens with content

5. **AI Summarization:**
   - Write at least 50 characters
   - Click "Summarize"
   - Wait for AI model to load (first time only)
   - Verify summary appears

6. **Password Protection:**
   - Close browser
   - Reopen `/pad/test123`
   - Enter correct password → access granted
   - Enter wrong password → access denied

### API Testing with curl

```bash
# Create pad
curl -X POST http://localhost:3000/api/pad/test/create \
  -H "Content-Type: application/json" \
  -d '{"password":"test123"}'

# Verify password
curl -X POST http://localhost:3000/api/pad/test/verify \
  -H "Content-Type: application/json" \
  -d '{"password":"test123"}'

# Save content
curl -X POST http://localhost:3000/api/pad/test/save \
  -H "Content-Type: application/json" \
  -d '{"password":"test123","content":"Hello World"}'

# Get content
curl -X POST http://localhost:3000/api/pad/test/get \
  -H "Content-Type: application/json" \
  -d '{"password":"test123"}'
```

## 🔒 Security

### Implemented

✅ **Password Hashing** - SHA-256, never stored in plain text  
✅ **MIME Validation** - Magic byte checking prevents file spoofing  
✅ **File Size Limits** - Prevents abuse  
✅ **Auto-Expiry** - Files deleted after 24 hours  
✅ **No SQL Injection** - JSON-based storage  
✅ **CORS Protection** - Optional CORS configuration

### Best Practices

- Use strong passwords (8+ characters, mixed case, numbers)
- Don't share URLs publicly if content is sensitive
- Files expire in 24 hours - download important files
- AI runs locally - no data sent to external services

### Recommended Enhancements for Production

1. **Rate Limiting:**
```bash
npm install express-rate-limit
```

2. **HTTPS Only:**
```javascript
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

3. **Helmet.js for security headers:**
```bash
npm install helmet
```

## 📊 Performance

- **Initial Load:** < 2s
- **Auto-Save:** Every 2 seconds
- **File Upload:** < 5s for 10MB
- **AI Model Load:** ~ 30s (first time only, cached after)
- **Summarization:** ~ 5-10s depending on text length

## 🐛 Troubleshooting

### Server won't start

```bash
# Check if port is in use
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Try different port
PORT=8080 npm start
```

### Files not uploading

- Check file size < 10MB
- Verify file type is allowed (PDF, JPG, PNG, DOCX)
- Check disk space

### AI summarization fails

- First load takes ~30s to download model
- Requires modern browser (Chrome, Firefox, Safari)
- Fallback summary shown if AI fails
- Check browser console for errors

### Pad not saving

- Check password is correct
- Verify `pads/` directory exists and is writable
- Check server logs for errors

## 🎨 Customization

### Change Theme Colors

Edit `public/style.css`:
```css
:root {
  --primary: #667eea;  /* Change to your color */
  --secondary: #48bb78;
  /* ... */
}
```

### Add Custom Logo

Replace icon in `public/icon.svg`

### Modify Landing Page

Create `public/index.html` to customize homepage

## 🚀 Future Enhancements

Potential features to add:

- [ ] Markdown support in editor
- [ ] Real-time collaborative editing
- [ ] Export to PDF
- [ ] Version history
- [ ] Custom expiry times per file
- [ ] Encryption at rest
- [ ] 2FA authentication
- [ ] Dark mode
- [ ] Mobile apps (React Native)
- [ ] Browser extension

## 📝 API Documentation

### POST `/api/pad/:padId/create`

Create new pad with password.

**Request:**
```json
{
  "password": "string (min 4 chars)"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST `/api/pad/:padId/verify`

Verify password for existing pad.

**Request:**
```json
{
  "password": "string"
}
```

**Response:**
```json
{
  "success": true|false
}
```

### POST `/api/pad/:padId/get`

Get pad content.

**Request:**
```json
{
  "password": "string"
}
```

**Response:**
```json
{
  "content": "string",
  "files": [...]
}
```

### POST `/api/pad/:padId/save`

Save pad content.

**Request:**
```json
{
  "password": "string",
  "content": "string"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST `/api/upload/:padId`

Upload file (multipart/form-data).

**Form Data:**
- `file`: File to upload
- `password`: Pad password

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "string",
    "name": "string",
    "size": number,
    "uploadedAt": "ISO date",
    "expiresAt": "ISO date"
  }
}
```

## 📄 License

MIT License - feel free to use, modify, and distribute.

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 💬 Support

- **Issues:** Open a GitHub issue
- **Questions:** Start a discussion
- **Security:** Report privately to [your-email]

## 🙏 Acknowledgments

- **Transformers.js** by Xenova for local AI
- **Express.js** for the backend framework
- **Multer** for file uploads

---

**Made with ❤️ for secure, private note-taking**

**Deploy now and enjoy your free, secure notepad!** 🚀