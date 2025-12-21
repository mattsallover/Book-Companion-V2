# Post-Deployment Setup Checklist

Your Railway deployment was successful! 🎉 Now complete these configuration steps:

## Step 1: Set Environment Variables

In Railway dashboard → Your Service → **Variables** tab, add:

### Required Variables

| Variable | Value | How to Get |
|----------|-------|------------|
| `GOOGLE_API_KEY` | Your Google AI key | [Get key here](https://aistudio.google.com/app/apikey) |
| `JWT_SECRET` | Random secure string | Run: `openssl rand -base64 32` |
| `EMAIL_API_KEY` | Your Resend API key | [Sign up at Resend](https://resend.com) → API Keys |
| `EMAIL_FROM` | `noreply@resend.dev` | Or your verified domain |
| `APP_URL` | Your Railway URL | Get from Railway Settings → Domains |
| `NODE_ENV` | `production` | Type exactly: `production` |

### Get Your Railway URL
1. Click on your service in Railway
2. Go to **Settings** → **Domains**
3. Copy the auto-generated URL (e.g., `https://your-app-xyz123.up.railway.app`)
4. Use this for `APP_URL`

---

## Step 2: Initialize PostgreSQL Database

You need to run the `init-db.sql` script on your Railway PostgreSQL database.

### Option A: Using Railway CLI (Recommended)

```bash
# Install Railway CLI (if not already installed)
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Connect to PostgreSQL and run init script
railway run psql $DATABASE_URL -f backend/init-db.sql
```

### Option B: Using Railway Dashboard

1. Go to PostgreSQL service in Railway
2. Click **"Connect"**
3. Look for **"PostgreSQL Console"** or connection string
4. If using console:
   - Open the web-based console
   - Copy contents of `backend/init-db.sql`
   - Paste and execute
5. If using connection string:
   - Copy the connection string
   - Run locally: `psql "postgresql://..." -f backend/init-db.sql`

---

## Step 3: Verify Deployment

### Test the Health Endpoint
Visit: `https://your-app-xyz123.up.railway.app/health`

Should return:
```json
{
  "status": "ok",
  "message": "Book Companion API is running"
}
```

### Test the Frontend
Visit: `https://your-app-xyz123.up.railway.app`

Should see the Book Companion app!

---

## Step 4: Test Authentication

1. Click **"Sign In"** button
2. Enter your email
3. Check your email for magic link
4. Click the link
5. You should be logged in!

**Troubleshooting:**
- If no email arrives, check Resend dashboard for logs
- Verify `EMAIL_API_KEY` and `EMAIL_FROM` are correct
- Check Railway logs for errors

---

## Step 5: Test Conversation Saving

1. Enter a book title and author
2. Start a conversation
3. Send a few messages
4. Click **"Save"** button
5. Refresh the page
6. Click **"History"** to see your saved conversation

---

## Quick Reference Commands

### Generate JWT Secret
```bash
openssl rand -base64 32
```

### View Railway Logs
```bash
railway logs
```

### Connect to PostgreSQL
```bash
railway connect postgresql
```

---

## Checklist

- [ ] Get Google AI API key
- [ ] Get Resend API key (sign up at resend.com)
- [ ] Generate JWT secret
- [ ] Get Railway URL
- [ ] Set all environment variables in Railway
- [ ] Initialize database with `init-db.sql`
- [ ] Test health endpoint
- [ ] Test frontend loads
- [ ] Test magic link login
- [ ] Test conversation saving
- [ ] Test on iPhone/mobile device

---

## What's Next?

Once everything is working:
- Share your app URL with others!
- Test on iPhone Safari
- Consider adding a custom domain (Railway Settings → Domains)
- Monitor usage in Railway dashboard

---

**Need Help?**
- Check Railway logs for errors
- Verify all env variables are set correctly
- Ensure database was initialized
- Check Resend dashboard for email delivery logs
