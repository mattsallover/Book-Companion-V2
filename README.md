# Book Companion

An AI-powered web application that enables readers to have immersive, personalized conversations with book authors. Built with React, Express, PostgreSQL, and Google's Gemini AI, featuring a beautiful iMessage-style interface.

## Features

- **iMessage-Style Interface**: Beautiful, familiar messaging UI optimized for mobile
- **Magic Link Authentication**: Passwordless sign-in via email
- **AI Author Personas**: Converse with book authors powered by Gemini AI
- **Intelligent Research**: Automatic author and book research using Google Search
- **Persistent Conversations**: All conversations saved and synced across devices
- **Streaming Responses**: Real-time AI responses with markdown support
- **Mobile-First Design**: Responsive design that works beautifully on all devices

## Tech Stack

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- React Markdown
- Lucide React (icons)

**Backend:**
- Node.js 18+
- Express.js
- PostgreSQL
- JWT Authentication
- Resend (email)
- Google Generative AI (Gemini)

## Railway Deployment (Easiest Method)

### Prerequisites
1. A [Railway](https://railway.app) account
2. A [Resend](https://resend.com) API key for sending emails
3. A [Google AI Studio](https://makersuite.google.com/app/apikey) API key for Gemini

### Steps

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Create New Project on Railway**
   - Go to [Railway](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add PostgreSQL Database**
   - In your Railway project, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway will automatically provision a database

4. **Set Environment Variables**

   In Railway, go to your app service → Variables, and add:

   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=your-random-secret-key-here
   RESEND_API_KEY=re_your_resend_api_key
   RESEND_FROM_EMAIL=your-verified@email.com
   GOOGLE_API_KEY=your-google-api-key
   NODE_ENV=production
   APP_URL=${{RAILWAY_PUBLIC_DOMAIN}}
   ```

   Note: Railway will automatically provide `DATABASE_URL` when you add PostgreSQL.

5. **Initialize Database**

   Once deployed, run the schema:
   - Go to your PostgreSQL service
   - Click "Data" tab
   - Click "Query" and paste contents of `backend/schema.sql`
   - Execute the query

6. **Generate Domain**
   - Go to your app service → Settings → Networking
   - Click "Generate Domain"
   - Your app will be available at the generated URL!

## Local Development

### Prerequisites
- Node.js 18+ installed
- PostgreSQL installed and running
- API keys for Resend and Google AI

### Setup

1. **Clone the repository**
   ```bash
   git clone YOUR_REPO_URL
   cd book-companion
   ```

2. **Install dependencies**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Set up environment variables**

   Create `backend/.env`:
   ```
   DATABASE_URL=postgresql://localhost:5432/bookcompanion
   JWT_SECRET=your-local-secret-key
   RESEND_API_KEY=your-resend-api-key
   RESEND_FROM_EMAIL=your-email@example.com
   GOOGLE_API_KEY=your-google-api-key
   NODE_ENV=development
   PORT=3000
   APP_URL=http://localhost:3000
   ```

4. **Create database and run schema**
   ```bash
   createdb bookcompanion
   psql bookcompanion < backend/schema.sql
   ```

5. **Start development servers**

   Terminal 1 (Backend):
   ```bash
   cd backend
   node server.js
   ```

   Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm run dev
   ```

6. **Access the app**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

## Getting API Keys

### Resend (Email)
1. Go to [resend.com](https://resend.com)
2. Sign up for free account
3. Verify a domain or use their test domain
4. Get your API key from the dashboard

### Google AI (Gemini)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key for your environment variables

## Project Structure

```
book-companion/
├── frontend/
│   ├── src/
│   │   ├── BookCompanion.jsx   # Main React component
│   │   ├── index.css            # Global styles
│   │   └── main.jsx             # React entry point
│   ├── index.html               # HTML template
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── backend/
│   ├── server.js                # Express server
│   ├── schema.sql               # Database schema
│   └── package.json
├── package.json                 # Root package.json
├── nixpacks.toml               # Railway build config
├── .env.example                # Environment template
└── README.md
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `RESEND_API_KEY` | Resend email API key | Yes |
| `RESEND_FROM_EMAIL` | Verified sender email | Yes |
| `GOOGLE_API_KEY` | Google Gemini API key | Yes |
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Server port (default: 3000) | No |
| `APP_URL` | Full app URL for magic links | Yes |

## Features in Detail

### Magic Link Authentication
Users enter their email and receive a secure magic link. Clicking the link automatically signs them in with no password required.

### Author Research
When starting a new conversation, the app uses Gemini AI with Google Search to research:
- Main arguments and frameworks from the book
- Author's background and communication style
- Key quotes and principles
- The book's impact and reception

### AI Conversations
The AI embodies the author's persona and adapts to different conversation modes:
- **Exploration**: Asks thoughtful questions, draws connections
- **Learning**: Explains clearly with book examples
- **Application**: Provides practical guidance
- **Questioning**: Engages intellectually, defends positions

### Conversation Management
- All conversations automatically saved to database
- Access from any device with the same account
- Beautiful iMessage-style list view with previews
- Timestamps showing recency

## Troubleshooting

### Railway Build Fails
- Check that all environment variables are set
- Ensure `GOOGLE_API_KEY` and `RESEND_API_KEY` are valid
- Check Railway build logs for specific errors

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Ensure database schema has been run
- Check Railway PostgreSQL service is running

### Magic Links Not Sending
- Verify `RESEND_API_KEY` is correct
- Check `RESEND_FROM_EMAIL` is verified in Resend
- Ensure `APP_URL` matches your Railway domain

### AI Not Responding
- Verify `GOOGLE_API_KEY` is valid
- Check you haven't exceeded API quota
- Look at backend logs for errors

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
