# 🌥️ Cloudinary Setup Guide

## Why Cloudinary?

Render's **free tier has ephemeral storage** - files uploaded are deleted when the server restarts or redeploys. Cloudinary provides **persistent cloud storage** (25GB free tier) for your uploaded files.

## Setup Steps

### 1. Create Cloudinary Account

1. Go to https://cloudinary.com
2. Click **"Sign Up Free"**
3. Create account with email or Google

### 2. Get API Credentials

1. After login, go to **Dashboard** (https://console.cloudinary.com/console)
2. You'll see:
   ```
   Cloud Name: your_cloud_name
   API Key: 123456789012345
   API Secret: aBcDeFgHiJkLmNoPqRsTuVwXyZ
   ```
3. Copy all three values

### 3. Add to Render Environment Variables

1. Go to your Render dashboard: https://dashboard.render.com
2. Select your **Web Service** (secure-pad-pro-15)
3. Go to **Environment** tab
4. Add these 3 new environment variables:

   | Key | Value |
   |-----|-------|
   | `CLOUDINARY_CLOUD_NAME` | your_cloud_name (from step 2) |
   | `CLOUDINARY_API_KEY` | your_api_key (from step 2) |
   | `CLOUDINARY_API_SECRET` | your_api_secret (from step 2) |

5. Click **"Save Changes"**
6. Render will **automatically redeploy** with Cloudinary enabled

### 4. Verify It's Working

Wait ~2 minutes for Render to redeploy, then:

1. Open your deployed app: https://secure-pad-pro-15.onrender.com
2. Create or login to a note
3. Upload a file (image or PDF)
4. Try to preview/download it
5. ✅ It should work now!

## How It Works

### Before (Filesystem - ❌ Broken on Render)
```
Upload → Save to /uploads/padId/file.png → ❌ Lost on restart
```

### After (Cloudinary - ✅ Persistent)
```
Upload → Save to Cloudinary → Get permanent URL → Store in PostgreSQL → ✅ Always available
```

## Free Tier Limits

- **Storage:** 25 GB
- **Bandwidth:** 25 GB/month
- **Transformations:** 25,000/month

Perfect for your SecureNote app! 🎉

## Troubleshooting

### Files still not working after setup?

1. **Check Render logs:**
   - Go to Render dashboard → Your service → Logs tab
   - Look for `"✓ Uploaded to Cloudinary: https://..."`
   
2. **Verify environment variables:**
   - Run debug endpoint: `https://secure-pad-pro-15.onrender.com/api/debug/files/YOUR_PAD_ID`
   - Should show `cloudinary_url` in file records

3. **Test upload:**
   - Upload a new file (old files won't work, they're on lost filesystem)
   - Only **newly uploaded** files will use Cloudinary

### Common Issues

**Q: Old files don't work?**  
A: Correct - files uploaded before Cloudinary setup were stored on ephemeral filesystem and are now gone. Upload new files.

**Q: Error "Missing required configuration"?**  
A: Check that all 3 Cloudinary env vars are set on Render (no typos!)

**Q: Upload fails?**  
A: Check Render logs for Cloudinary error messages. May need to verify API credentials.

## Next Steps

After setup:
- ✅ Files will persist forever (or until they expire after 24 hours as designed)
- ✅ Preview and download will work
- ✅ No more "File not found" errors
- ✅ Your app is production-ready!

---

**Need help?** Check Render logs or contact via email: sathvikhegade3@gmail.com
