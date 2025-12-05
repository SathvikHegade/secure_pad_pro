# 🔒 Secure Pad Pro

A professional, password-protected notepad with **custom URLs**, **bcrypt security**, and **AI-powered summarization** using Google Gemini. **Production-ready and fully secure.**

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)

## ✨ Features

### 🎯 Core Features
- 🔗 **Custom URLs** - Create memorable pad URLs like `/pad/myproject123`
- 🔐 **bcrypt Security** - Industry-standard password hashing (10 rounds)
- 💾 **Auto-Save** - Notes saved automatically every 2 seconds
- 📎 **File Uploads** - Up to 10MB (PDF, JPG, PNG, DOCX)
- 👁️ **File Preview** - View PDFs and images instantly
- ✨ **AI Summarization** - Google Gemini API integration
- ⏰ **Auto-Expiry** - Files automatically deleted after 24 hours
- 📱 **Responsive Design** - Works on mobile, tablet, and desktop
- 🌙 **Dark Mode** - Toggle between light and dark themes
- 🚀 **Production Ready** - Secure, scalable, and deployable

### 🔒 Security Features
- **bcrypt Password Hashing** - 10 salt rounds, no plain text storage
- **Custom URL Validation** - Alphanumeric, hyphens, underscores only (3-50 chars)
- **Unique URL Enforcement** - Each custom URL can only be used once
- **MIME Type Validation** - File headers checked, not just extensions
- **File Size Limits** - 10MB maximum per upload
- **Password-Protected Access** - Every operation requires password verification
- **Secure Error Messages** - Generic messages prevent enumeration attacks

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│          Frontend (Browser)                  │
│  • Homepage: Login/Create Pad                │
│  • Pad Editor: Auto-save, File uploads       │
│  • AI Summarization UI                       │
└─────────────┬────────────────────────────────┘
              │ REST API (JSON)
┌─────────────▼────────────────────────────────┐
│         Backend (Node.js/Express)            │
│  • Custom URL Management                     │
│  • bcrypt Password Hashing                   │
│  • File Validation & Storage                 │
│  • Google Gemini API Integration             │
│  • Automatic File Cleanup (hourly)           │
└─────────────┬────────────────────────────────┘
              │
┌─────────────▼────────────────────────────────┐
│          Storage Layer                       │
│  • /pads/{customUrl}.json (pad data)         │
│  • /uploads/{customUrl}/* (files)            │
└──────────────────────────────────────────────┘
```

## 📁 Project Structure

```
securenote/
├── server.js              # Express backend with all routes
├── package.json           # Dependencies and scripts
├── .env.example           # Environment variables template
├── SETUP.md              # Comprehensive setup guide
├── README.md             # This file
├── public/
│   ├── index.html        # Homepage (login/create pad)
│   ├── index.js          # Homepage JavaScript
│   ├── pad.html          # Pad editor interface
│   ├── script.js         # Pad editor JavaScript
│   ├── style.css         # Global styles
│   └── manifest.json     # PWA manifest
├── pads/                 # JSON pad storage
│   └── {customUrl}.json  # Individual pad files
└── uploads/              # File uploads storage
    └── {customUrl}/      # Per-pad upload directory
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

### Creating a New Pad

1. Go to the homepage
2. Click "Create New Pad" tab
3. Enter a custom URL name (e.g., "myproject123")
4. Create a secure password
5. Confirm your password
6. Click "Create My Pad"
7. Start writing!

### Accessing an Existing Pad

1. Go to the homepage
2. Click "Access Existing Pad" tab
3. Enter your custom URL name
4. Enter your password
5. Click "Access My Pad"

### Using AI Summarization

1. Write at least 50 characters in your pad
2. Click the "✨ Summarize" button
3. Google Gemini AI generates a concise summary
4. View document statistics and insights

## 🔑 Environment Variables

Create a `.env` file with:

```env
# Server Port (default: 3000)
PORT=3000

# PostgreSQL Database URL
DATABASE_URL=postgresql://user:password@host:5432/database

# Google Gemini API Key (required for AI summarization)
GEMINI_API_KEY=your_api_key_here

# Gemini Model (optional, default: gemini-2.5-flash)
GEMINI_MODEL=models/gemini-2.5-flash

# Cloudinary (required for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

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

### Password Security
- **bcrypt hashing** with 10 salt rounds
- No plain text password storage
- Timing-safe password comparison

### Input Validation
- Custom URL names: `^[a-zA-Z0-9_-]{3,50}$`
- Password minimum: 4 characters (configurable)
- File size limit: 10MB per file
- Allowed file types: PDF, JPG, PNG, DOCX

### File Security
- MIME type validation using magic bytes
- Files stored in isolated directories
- Automatic expiration after 24 hours
- Secure file ID generation (32-char hex)

## 📊 Database Schema

### Pad Object
```json
{
  "padId": "myproject123",
  "content": "Your notes here...",
  "files": [...],
  "passwordHash": "$2b$10$...",
  "createdAt": "2025-12-05T10:00:00.000Z",
  "updatedAt": "2025-12-05T10:30:00.000Z"
}
```

See [SETUP.md](./SETUP.md) for complete schema documentation.

## 🔧 API Endpoints

### Authentication
- `POST /api/create-pad` - Create new pad with custom URL
- `POST /api/login` - Login to existing pad
- `GET /api/check-url/:urlName` - Check URL availability

### Pad Operations
- `POST /api/pad/:padId/get` - Get pad content
- `POST /api/pad/:padId/save` - Save pad content

### File Operations
- `POST /api/upload/:padId` - Upload file
- `POST /files/:padId/:fileId` - Download file

### AI Features
- `POST /api/summarize/:padId` - Generate AI summary

See [SETUP.md](./SETUP.md) for complete API documentation with request/response examples.

## 🐛 Troubleshooting

### Common Issues

**"Gemini API key not configured"**
- Ensure `.env` file exists with valid `GEMINI_API_KEY`

**"This URL name is already taken"**
- Choose a different custom URL name

**File upload fails**
- Check file size (max 10MB)
- Verify file type is allowed
- Ensure `uploads/` directory is writable

See [SETUP.md](./SETUP.md) for more troubleshooting tips.

## 📦 Dependencies

### Production
- `express` - Web framework
- `multer` - File upload handling
- `cors` - Cross-origin resource sharing
- `bcrypt` - Password hashing
- `@google/generative-ai` - Google Gemini SDK
- `dotenv` - Environment variable management

### Development
- `nodemon` - Auto-restart on file changes

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

- Google Gemini AI for text summarization
- bcrypt library for secure password hashing
- Express.js framework
- Multer for file handling

---

**Need Help?** 
- 📖 Read the [SETUP.md](./SETUP.md) guide
- 📧 Email: sathvikhegade3@gmail.com
- 🐛 Report bugs via email

**Made with ❤️ by T S Sathvik Hegade** with all routes
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