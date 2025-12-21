# GitHub Setup & Railway Deployment Guide

## Quick Setup for GitHub Upload

Follow these steps to upload your Book Companion app to GitHub and deploy to Railway.

---

## Step 1: Prepare Repository

Check that you're ready to upload:

```bash
# Check git status
git status

# See what files will be committed
git add -n .
```

**Files that should NOT be committed** (already in .gitignore):
- `.env` (your API keys)
- `node_modules/` (dependencies)
- `dist/` and `build/` (build outputs)

---

## Step 2: Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `Book-Companion`
3. Description: `AI-powered conversations with book authors`
4. **Public** or **Private** (your choice)
5. **Do NOT initialize** with README, .gitignore, or license
6. Click **"Create repository"**

---

## Step 3: Push to GitHub

Copy your repository URL from GitHub, then run:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Book Companion with Magic Link auth and persistence"

# Add remote (REPLACE with your GitHub URL)
git remote add origin https://github.com/YOUR_USERNAME/Book-Companion.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Success!** Your code is now on GitHub ✅

---

## Step 4: Deploy to Railway from GitHub

### A. Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Click **"Login"**
3. Sign in with GitHub
4. Authorize Railway

### B. Create New Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Authorize Railway to access your repositories
4. Choose **Book-Companion** from the list
5. Railway automatically deploys!

### C. Add PostgreSQL Database
1. In your Railway project, click **"New"**
2. Select **"Database"**
3. Choose **"Add PostgreSQL"**
4. Railway automatically creates `DATABASE_URL` variable

### D. Configure Environment Variables

Click on your backend service → **"Variables"** tab

Add these variables:

| Variable | Value | How to Get |
|----------|-------|------------|
| `GOOGLE_API_KEY` | Your Google AI key | [Get key](https://aistudio.google.com/app/apikey) |
| `JWT_SECRET` | Random string | Run: `openssl rand -base64 32` |
| `EMAIL_API_KEY` | Your Resend key | [Sign up](https://resend.com) → Create API key |
| `EMAIL_FROM` | noreply@resend.dev | Use Resend test domain or your verified domain |
| `APP_URL` | (will update later) | Leave blank for now |
| `NODE_ENV` | production | Type exactly: `production` |

### E. Get Railway URL
1. Wait for deployment to complete (~2 mins)
2. Click your service → **"Settings"** → **"Domains"**
3. Railway shows a URL like: `your-app-abc123.up.railway.app`
4. **Copy this URL**

### F. Update APP_URL
1. Go back to **"Variables"** tab
2. Edit `APP_URL` variable
3. Set it to: `https://your-app-abc123.up.railway.app` (use your actual URL)
4. Railway will redeploy automatically

### G. Initialize Database
In your **local terminal**, connect to Railway's PostgreSQL and run the init script:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Get psql connection string from Railway dashboard
# PostgreSQL service → Connect → Copy connection string

# Run init script (replace with your connection string)
psql postgresql://user:pass@host:port/railway -f backend/init-db.sql
```

**Alternative method (using Railway dashboard):**
1. PostgreSQL service → Click **"Connect"**
2. Under "Available Plugins", find **"PostgreSQL Console"**
3. Copy contents of `backend/init-db.sql`
4. Paste into console and execute

---

## Step 5: Test Your Deployment

1. Visit your Railway URL: `https://your-app-abc123.up.railway.app`
2. Click **"Sign In"**
3. Enter your email
4. Check email → Click magic link
5. You should be logged in!
6. Try creating a conversation

---

## Step 6: Future Updates

Now whenever you make changes:

```bash
# Make your changes
# ...

# Commit and push
git add .
git commit -m "Description of changes"
git push origin main
```

**Railway automatically deploys** new changes! 🚀

---

## Troubleshooting

### "Permission denied" when pushing to GitHub
```bash
# Use HTTPS with personal access token or SSH keys
# See: https://docs.github.com/en/authentication
```

### Railway build fails
- Check build logs in Railway dashboard
- Ensure `railway.json` and `nixpacks.toml` are committed
- Verify all environment variables are set

### Database connection error
- Confirm PostgreSQL service is running in Railway
- Check `DATABASE_URL` is automatically set
- Verify init script ran successfully

### Magic link emails not sending
- Check Resend API key is correct
- Verify EMAIL_FROM matches resend.dev or your verified domain
- Check Resend dashboard for sending logs

---

## What You Should Have Now

✅ Code on GitHub  
✅ Backend deployed on Railway  
✅ PostgreSQL database on Railway  
✅ Environment variables configured  
✅ Database initialized with tables  
✅ Auto-deployment on git push  
✅ Working Magic Link authentication  
✅ Conversation persistence  

---

## Next Steps

1. **Share your app** - Send the Railway URL to friends!
2. **Test on iPhone** - Visit URL in Safari
3. **Custom domain** (optional) - Add in Railway Settings → Domains
4. **Monitor** - Check Railway logs and Resend email stats

---

## Cost Tracking

**Railway Free Tier:**
- $5 credit per month
- Enough for ~100-500 hours of usage
- Good for development/testing

**When to upgrade:**
- If you use free credit before month end
- For production usage
- Pro plan: $20/month with $10 included usage

---

**Congratulations!** Your Book Companion app is now live on the internet! 🎉

For detailed deployment steps, see:
- [`RAILWAY_DEPLOYMENT.md`](RAILWAY_DEPLOYMENT.md) - Full Railway guide
- [`README.md`](README.md) - Project overview
