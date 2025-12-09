# 🔔 Security Alerts Setup Guide

SecureNote now supports real-time email alerts for security events!

## Features

Users can optionally provide an email address when creating a note to receive alerts for:

- ✅ **Note Access** - When someone successfully opens the note
- ⚠️ **Failed Login Attempts** - Wrong password attempts
- 🚨 **Brute Force Detection** - Multiple failed attempts (5+ in 15 minutes)
- 📤 **File Uploads** - When files are added to the note
- 📥 **File Downloads** - When files are accessed
- 🗑️ **File Deletions** - When files are removed

## Email Configuration

### Option 1: Gmail (Recommended for Personal Use)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password
3. **Add to Render Environment Variables:**
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your.email@gmail.com
   SMTP_PASS=your_16_char_app_password
   APP_URL=https://your-app.onrender.com
   ```

### Option 2: SendGrid (Recommended for Production)

1. **Sign up** at https://sendgrid.com (Free tier: 100 emails/day)
2. **Create API Key:**
   - Settings → API Keys → Create API Key
   - Full Access or Mail Send only
3. **Add to Render Environment Variables:**
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASS=your_sendgrid_api_key
   APP_URL=https://your-app.onrender.com
   ```

### Option 3: Other SMTP Providers

**Outlook/Hotmail:**
```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

**Yahoo:**
```
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
```

**Custom SMTP:**
- Check your email provider's SMTP documentation
- Common ports: 587 (TLS), 465 (SSL), 25 (unencrypted)

## Setup on Render

1. **Go to your Render dashboard**
2. **Select your SecureNote service**
3. **Navigate to "Environment"**
4. **Add the following variables:**
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_SECURE`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `APP_URL` (your Render app URL)
5. **Save Changes** - Render will automatically redeploy

## User Experience

### Creating a Note with Alerts

1. User goes to homepage
2. Clicks "Create New Note"
3. Fills in:
   - Custom URL name
   - Password
   - **Email (Optional)** ← New field!
4. When provided, the email receives:
   - Immediate confirmation of note creation
   - All security events for that specific note

### Alert Email Example

```
🔓 Your SecureNote was accessed

Note ID: my-project

Time: Dec 9, 2025 10:30 AM
IP Address: 203.0.113.45
Browser: Chrome on Windows

If this wasn't you, please verify your note's security.

[View Your Note]
```

### Brute Force Alert Example

```
🚨 SECURITY ALERT: Brute Force Attack Detected

Multiple failed password attempts detected from the same IP address.

Note ID: my-project

Time: Dec 9, 2025 10:35 AM
IP Address: 203.0.113.45
Failed Attempts: 7

⚠️ Action Recommended: If this wasn't you, consider changing your password immediately.

[View Your Note]
```

## Privacy & Security

- ✅ Email addresses are **optional** - users can skip this field
- ✅ Emails are **stored encrypted** in PostgreSQL
- ✅ Emails are **only used for alerts** - never shared or sold
- ✅ Each note owner only receives alerts for **their own note**
- ✅ Alert rate limiting prevents email spam
- ✅ Users can disable alerts by deleting and recreating without email

## Testing

1. **Create a test note** with your email
2. **Access the note** → Should receive access alert
3. **Try wrong password** → Should receive failed login alert
4. **Upload a file** → Should receive file upload alert
5. **Download a file** → Should receive download alert
6. **Delete a file** → Should receive deletion alert

## Disabling Alerts

If SMTP variables are not configured:
- The app works normally
- No alerts are sent
- Console shows: `⚠ Email alerts disabled - SMTP configuration missing`

## Troubleshooting

**Emails not sending?**
- Check Render logs for SMTP errors
- Verify SMTP credentials are correct
- Check spam/junk folder
- Ensure 2FA and App Password for Gmail
- Test with a simple SMTP tester tool

**Getting too many alerts?**
- Alerts are sent for every security event
- This is by design for maximum security visibility
- Consider using a dedicated email or email filtering rules

**Want to change alert email?**
- Currently, email is set at note creation
- To change: Delete note and recreate with new email
- Future update may add email update feature

## Free Tier Limits

**Gmail:**
- 500 emails/day (App Password)
- Free forever

**SendGrid:**
- 100 emails/day
- Free forever

**Mailgun:**
- 5,000 emails/month for 3 months
- Then paid

## Support

For issues or questions:
- Check server logs in Render dashboard
- Verify environment variables are set correctly
- Test SMTP credentials with online SMTP tester
- Email notifications are logged in console

---

**Note:** This is an optional feature. SecureNote works perfectly without email configuration!
