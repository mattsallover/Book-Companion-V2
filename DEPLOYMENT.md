# Book Companion - Deployment Guide

This guide covers deploying Book Companion to various hosting platforms.

## Table of Contents
1. [Railway Deployment](#railway-deployment)
2. [Render Deployment](#render-deployment)
3. [Docker Deployment](#docker-deployment)
4. [Environment Variables](#environment-variables)
5. [Custom Domain Setup](#custom-domain-setup)
6. [Troubleshooting](#troubleshooting)

---

## Railway Deployment

Railway offers one of the simplest deployment experiences with automatic detection.

### Prerequisites
- A Railway account ([railway.app](https://railway.app))
- Your Anthropic API key

### Steps

1. **Install Railway CLI** (optional but recommended):
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Deploy via CLI**:
   ```bash
   railway init
   railway up
   ```

3. **Or Deploy via GitHub**:
   - Push your code to GitHub
   - Go to [railway.app/new](https://railway.app/new)
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will auto-detect the configuration from `railway.json` and `nixpacks.toml`

4. **Set Environment Variables**:
   In the Railway dashboard:
   - Go to your project → Variables
   - Add the following:
     ```
     ANTHROPIC_API_KEY=sk-ant-api03-...
     PORT=5000
     NODE_ENV=production
     ```

5. **Generate Domain**:
   - Railway will automatically generate a domain like `yourapp.up.railway.app`
   - You can add a custom domain in Settings → Domains

### Railway Configuration Files
The project includes:
- `railway.json` - Railway-specific configuration
- `nixpacks.toml` - Build and start commands
- `Procfile` - Process configuration

---

## Render Deployment

Render provides free tier hosting with automatic deploys from GitHub.

### Prerequisites
- A Render account ([render.com](https://render.com))
- Your code pushed to GitHub
- Your Anthropic API key

### Option 1: Using render.yaml (Blueprint)

1. **Push to GitHub**:
   ```bash
   git push origin main
   ```

2. **Deploy via Blueprint**:
   - Go to [dashboard.render.com](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will read `render.yaml` and create both services

3. **Set Environment Variables**:
   For the `book-companion-api` service:
   - Go to Environment
   - Add:
     ```
     ANTHROPIC_API_KEY=sk-ant-api03-...
     NODE_ENV=production
     ```

### Option 2: Manual Setup

#### Backend Service

1. **Create Web Service**:
   - Dashboard → New → Web Service
   - Connect your repository
   - Settings:
     - Name: `book-companion-api`
     - Root Directory: `backend`
     - Environment: `Node`
     - Build Command: `npm install`
     - Start Command: `node server.js`

2. **Set Environment Variables**:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-...
   NODE_ENV=production
   PORT=10000
   ```

#### Frontend Service

1. **Create Static Site**:
   - Dashboard → New → Static Site
   - Connect your repository
   - Settings:
     - Name: `book-companion-frontend`
     - Root Directory: `frontend`
     - Build Command: `npm install && npm run build`
     - Publish Directory: `dist`

2. **Set Environment Variables**:
   ```
   VITE_API_URL=https://book-companion-api.onrender.com
   ```
   *(Replace with your actual backend URL)*

### Render Notes
- Free tier services spin down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- For production, consider upgrading to paid tier

---

## Docker Deployment

Use Docker for deployment to any platform that supports containers (AWS, GCP, Azure, DigitalOcean, etc.).

### Build and Run Locally

1. **Build the image**:
   ```bash
   docker build -t book-companion .
   ```

2. **Run the container**:
   ```bash
   docker run -p 5000:5000 \
     -e ANTHROPIC_API_KEY=your_api_key_here \
     -e NODE_ENV=production \
     book-companion
   ```

3. **Access the app**:
   Open `http://localhost:5000`

### Deploy to Docker Hub

1. **Tag and push**:
   ```bash
   docker tag book-companion yourusername/book-companion:latest
   docker push yourusername/book-companion:latest
   ```

### Deploy to AWS ECS, Google Cloud Run, etc.

Follow your cloud provider's container deployment documentation, using the Docker image you built.

---

## Environment Variables

### Backend (.env in root directory)

```env
# Required
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxx

# Optional
PORT=5000
NODE_ENV=production

# Future LLM support
# OPENAI_API_KEY=sk-...
# GOOGLE_API_KEY=...
# COHERE_API_KEY=...
```

### Frontend (.env in frontend directory)

```env
# Development
VITE_API_URL=http://localhost:5000

# Production (set by hosting provider or CI/CD)
# VITE_API_URL=https://your-api-domain.com
```

---

## Custom Domain Setup

### Railway

1. Go to your project → Settings → Domains
2. Click "Add Custom Domain"
3. Enter your domain (e.g., `bookcompanion.fisberglevine.org`)
4. Add the CNAME record to your DNS:
   ```
   CNAME bookcompanion [your-app].up.railway.app
   ```

### Render

1. Go to your service → Settings → Custom Domain
2. Click "Add Custom Domain"
3. Enter your domain
4. Add the CNAME record to your DNS:
   ```
   CNAME bookcompanion [your-service].onrender.com
   ```

### DNS Configuration for fisberglevine.org

If using a subdomain like `bookcompanion.fisberglevine.org`:

1. Log in to your domain registrar (e.g., Namecheap, GoDaddy, Cloudflare)
2. Go to DNS settings
3. Add a CNAME record:
   - Type: CNAME
   - Name: bookcompanion
   - Value: [your-railway-or-render-url]
   - TTL: Auto or 3600

---

## Troubleshooting

### Build Failures

**Issue**: Frontend build fails
- **Solution**: Ensure all dependencies are installed: `cd frontend && npm install`
- Check that `VITE_API_URL` is set correctly

**Issue**: Backend can't find .env
- **Solution**: Environment variables must be set in your hosting platform's dashboard, not in files

### Runtime Errors

**Issue**: "ANTHROPIC_API_KEY not found"
- **Solution**: Set the environment variable in your hosting platform's settings
- Verify the key starts with `sk-ant-`

**Issue**: CORS errors
- **Solution**: Ensure frontend is using the correct `VITE_API_URL`
- Check that backend CORS is enabled (it is by default)

**Issue**: 404 errors for frontend routes
- **Solution**: The `app.get('*')` catch-all in `backend/server.js` handles this
- Ensure `NODE_ENV=production` is set

### Performance Issues

**Issue**: Slow response times
- **Solution**: Render free tier spins down after inactivity
- Consider upgrading to a paid tier
- Railway has better always-on performance even on free tier

### API Quota Exceeded

**Issue**: "Rate limit exceeded" from Anthropic
- **Solution**: Check your API usage at [console.anthropic.com](https://console.anthropic.com)
- Consider implementing request queuing or rate limiting

---

## Testing Deployment

After deployment, verify:

1. **Health Check**: Visit `https://your-domain.com/health`
   - Should return: `{"status":"ok","message":"Book Companion API is running"}`

2. **Frontend**: Visit `https://your-domain.com`
   - Should load the Book Companion interface

3. **Full Flow**:
   - Enter a book title and author
   - Click "Start Conversation"
   - Verify the AI loads author knowledge
   - Send a test message

---

## Cost Estimates

### Railway
- Free tier: $5 credit/month
- Estimated usage: ~$3-5/month for light use
- Pro plan: $20/month with $10 credit

### Render
- Free tier: Available
- Starter plan: $7/month per service
- Total for both services: $14/month

### Anthropic API
- Claude Sonnet 4: ~$3 per million input tokens
- Estimated: $5-20/month depending on usage

---

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set `ANTHROPIC_API_KEY` in environment
- [ ] Set `VITE_API_URL` to your backend domain
- [ ] Test health check endpoint
- [ ] Verify HTTPS is working
- [ ] Test a complete conversation flow
- [ ] Set up custom domain (if desired)
- [ ] Monitor API usage in Anthropic console
- [ ] Set up error monitoring (optional: Sentry, etc.)

---

## Support

If you encounter issues:
1. Check the logs in your hosting platform's dashboard
2. Verify all environment variables are set correctly
3. Test the health endpoint
4. Review the [README.md](README.md) for local development setup

---

**Ready to Deploy!** Choose your platform and follow the steps above. Railway is recommended for the simplest experience.
