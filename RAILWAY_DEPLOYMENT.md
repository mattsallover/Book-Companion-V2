# Railway Deployment from GitHub

This guide shows you how to deploy Book Companion to Railway using GitHub integration.

## Prerequisites

- GitHub account
- Railway account ([railway.app](https://railway.app))
- Resend account ([resend.com](https://resend.com)) - free tier
- Google AI API key ([aistudio.google.com](https://aistudio.google.com/app/apikey))

---

## Step 1: Push to GitHub

If you haven't already pushed your code to GitHub:

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit: Book Companion with auth and persistence"

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/Book-Companion.git
git branch -M main
git push -u origin main
```

---

## Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your **Book-Companion** repository
5. Railway will detect the configuration from `railway.json`

---

## Step 3: Add PostgreSQL Database

1. In your Railway project, click **"New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway automatically creates a `DATABASE_URL` environment variable
3. The database is now linked to your backend service

---

## Step 4: Set Environment Variables

Click on your backend service → **"Variables"** tab → Add the following:

```env
GOOGLE_API_KEY=<your Google AI API key>
JWT_SECRET=<generate with: openssl rand -base64 32>
EMAIL_API_KEY=<your Resend API key>
EMAIL_FROM=noreply@yourdomain.com
APP_URL=<will be set after getting Railway URL>
NODE_ENV=production
PORT=3001
```

### How to Get These Values:

**GOOGLE_API_KEY:**
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key

**JWT_SECRET:**
Run this command in your terminal:
```bash
openssl rand -base64 32
```
Copy the output

**EMAIL_API_KEY:**
1. Sign up at [resend.com](https://resend.com)
2. Go to API Keys
3. Create a new key
4. Copy it

**EMAIL_FROM:**
- Use `noreply@resend.dev` for testing (Resend's test domain)
- Or verify your own domain in Resend for production

---

## Step 5: Initialize the Database

Once PostgreSQL is running on Railway, you need to create the tables.

### Option A: Using Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Connect to database and run init script
railway run psql $DATABASE_URL -f backend/init-db.sql
```

### Option B: Using Railway Dashboard

1. Go to your PostgreSQL service in Railway
2. Click **"Connect"** → **"PostgreSQL Console"**
3. This opens a psql terminal in your browser
4. Copy the contents of `backend/init-db.sql`
5. Paste into the console and run

---

## Step 6: Get Your Railway URL

1. Go to your backend service in Railway
2. Click **"Settings"** → **"Domains"**
3. Railway auto-generates a URL like `your-app.up.railway.app`
4. Copy this URL

---

## Step 7: Update Environment Variables

1. Go back to **"Variables"** tab
2. Update `APP_URL`:
   ```
   APP_URL=https://your-app.up.railway.app
   ```
3. Railway will automatically redeploy

---

## Step 8: Test Your Deployment

1. Visit your Railway URL: `https://your-app.up.railway.app`
2. Click **"Sign In"**
3. Enter your email
4. Check your email for the magic link
5. Click the link → You should be logged in!
6. Try creating a conversation

---

## Automatic Deployments

Railway is now connected to your GitHub repository and will:
- ✅ Auto-deploy on every push to `main`
- ✅ Deploy on every pull request (preview deployments)
- ✅ Show build logs in real-time

To trigger a deployment:
```bash
git add .
git commit -m "Update feature"
git push origin main
```

Railway will automatically build and deploy!

---

## Custom Domain (Optional)

To use your own domain:

1. In Railway → **Settings** → **Domains**
2. Click **"Add Custom Domain"**
3. Enter your domain (e.g., `bookcompanion.yourdomain.com`)
4. Add the CNAME record to your DNS provider:
   ```
   CNAME bookcompanion <your-app>.up.railway.app
   ```

---

## Monitoring & Logs

**View Logs:**
- Railway Dashboard → Your Service → **"Deployments"** tab
- Click on any deployment to see logs

**Monitor Database:**
- PostgreSQL Service → **"Metrics"** tab
- See connection count, storage, queries

---

## Troubleshooting

### Build Fails

**Check:**
- Railway build logs in Deployments tab
- Ensure `railway.json` and `nixpacks.toml` are in repository
- Verify Node.js version (should be 20)

### Database Connection Error

**Fix:**
1. Verify PostgreSQL service is running
2. Check `DATABASE_URL` is set in Variables
3. Confirm `init-db.sql` was run successfully

### Magic Link Emails Not Sending

**Fix:**
1. Verify `EMAIL_API_KEY` is correct
2. Check Resend dashboard for sending limits
3. Ensure `EMAIL_FROM` matches a verified domain

### App URL Not Working

**Fix:**
1. Check `APP_URL` matches your Railway domain
2. Ensure it uses `https://` (not `http://`)
3. Verify backend service is running

---

## Cost Estimate

Railway Free Tier:
- $5 credit/month
- Usually enough for development/testing
- Covers PostgreSQL + backend hosting

For production:
- ~$5-10/month depending on usage
- Upgrade to Pro ($20/month) for more resources

---

## Next Steps

1. ✅ Deploy backend to Railway
2. ⏭️ [Deploy frontend to Vercel](VERCEL_DEPLOYMENT.md) (optional - for separate frontend)
3. 🧪 Test on iPhone/iPad
4. 📱 Share with users!

---

**Need Help?**
- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Resend Docs: [resend.com/docs](https://resend.com/docs)
- GitHub Issues: [Your repo issues](https://github.com/YOUR_USERNAME/Book-Companion/issues)
