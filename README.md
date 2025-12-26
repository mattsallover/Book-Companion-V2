<div align="center">

# 📚 Book Companion

### Have Deep, Personal Conversations with Book Authors

*An AI-powered companion that brings authors to life, turning reading into an interactive dialogue*

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-4285F4?style=flat&logo=google&logoColor=white)](https://ai.google.dev/)

[Features](#-features) • [Demo](#-how-it-works) • [Installation](#-quick-start) • [Tech Stack](#-tech-stack) • [Contributing](#-contributing)

</div>

---

## ✨ What is Book Companion?

Book Companion transforms how you engage with books by creating an **authentic AI representation of the author** that you can chat with anytime. Ask questions, explore concepts, debate ideas, or get personalized guidance—all in the author's unique voice and style.

### 🎯 Why Book Companion?

- **📖 Books are static** — You can't ask questions or explore ideas beyond what's written
- **💭 Authors are busy** — You'll never get direct access to most authors
- **🧠 Learning is personal** — Generic book summaries don't address your specific context
- **🔄 Reading is evolving** — Modern readers want interaction, not just consumption

**Book Companion solves these problems** by creating an immersive, conversational experience that extends your reading journey.

---

## 🚀 Features

### 🎭 Authentic Author Personas
The AI deeply studies the author's writing style, tone, personality, and speech patterns to create authentic responses—**not generic AI language**.

### 🔍 Intelligent Research
Automatically researches the book and author using Google Search, gathering:
- Main arguments and frameworks
- Author's background and philosophy
- Distinctive voice and communication style
- Key quotes and examples

### 💬 iMessage-Style Interface
Beautiful, familiar messaging UI optimized for mobile with:
- Smooth streaming responses
- Markdown formatting support
- Persistent conversation history
- Cross-device sync

### 🎨 Adaptive Conversation Modes
The author naturally adapts to your needs:
- **Exploration** — Asks thoughtful questions, draws connections
- **Learning** — Explains concepts with examples from the book
- **Application** — Provides practical, actionable guidance
- **Questioning** — Engages intellectually, defends ideas

### 🔐 Simple Authentication
Quick username/password authentication—no email verification needed.

### 📱 Mobile-First Design
Responsive, beautiful design that works seamlessly on all devices.

---

## 🎬 How It Works

1. **📝 Enter a Book** — Type the book title and author name (typos are automatically corrected!)
2. **🔬 AI Research** — The system researches the book and author's unique voice
3. **👋 Meet the Author** — Receive a personalized greeting in the author's style
4. **💬 Start Chatting** — Ask questions, explore ideas, or dive deep into concepts
5. **💾 Continue Anytime** — All conversations are saved and synced across devices

---

## 🛠 Tech Stack

<table>
<tr>
<td width="50%">

### Frontend
- **React 18** — Modern UI framework
- **Vite** — Lightning-fast build tool
- **Tailwind CSS** — Utility-first styling
- **React Markdown** — Rich text rendering
- **Lucide React** — Beautiful icons

</td>
<td width="50%">

### Backend
- **Node.js 18+** — JavaScript runtime
- **Express.js** — Web framework
- **PostgreSQL** — Relational database
- **JWT** — Secure authentication
- **Google Gemini AI** — Advanced AI with search

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Prerequisites

You'll need:
- [Node.js 18+](https://nodejs.org/) installed
- [PostgreSQL](https://www.postgresql.org/) database
- [Google AI Studio](https://makersuite.google.com/app/apikey) API key (free tier available)

### Local Development

**1. Clone the repository**
```bash
git clone https://github.com/mattsallover/Book-Companion-V2.git
cd Book-Companion-V2
```

**2. Install dependencies**
```bash
cd backend && npm install
cd ../frontend && npm install
```

**3. Set up environment variables**

Create `backend/.env`:
```env
DATABASE_URL=postgresql://localhost:5432/bookcompanion
JWT_SECRET=your-super-secret-jwt-key-here
GOOGLE_API_KEY=your-google-api-key
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
```

**4. Initialize the database**
```bash
createdb bookcompanion
psql bookcompanion < backend/schema.sql
```

**5. Start the development servers**

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

**6. Open your browser**
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

---

## ☁️ Deploy to Railway

The easiest way to deploy Book Companion is using [Railway](https://railway.app).

### One-Click Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

### Manual Deployment

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/mattsallover/Book-Companion-V2.git
   git push -u origin main
   ```

2. **Create Railway Project**
   - Go to [Railway](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

3. **Add PostgreSQL**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway auto-provisions the database

4. **Set Environment Variables**
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=your-random-secret-key
   GOOGLE_API_KEY=your-google-api-key
   NODE_ENV=production
   APP_URL=${{RAILWAY_PUBLIC_DOMAIN}}
   ```

5. **Initialize Database Schema**
   - Go to PostgreSQL service → "Data" tab
   - Click "Query" and paste contents of `backend/schema.sql`
   - Execute the query

6. **Generate Domain**
   - Go to your app service → Settings → Networking
   - Click "Generate Domain"
   - Your app is live! 🎉

---

## 🗂 Project Structure

```
book-companion/
├── frontend/
│   ├── src/
│   │   ├── BookCompanion.jsx   # Main React component
│   │   ├── index.css            # Global styles
│   │   └── main.jsx             # React entry point
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
├── backend/
│   ├── server.js                # Express server
│   ├── schema.sql               # Database schema
│   └── package.json
├── PRD.md                       # Product Requirements Document
└── README.md
```

---

## 🔑 Getting API Keys

### Google AI (Gemini)
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy and add to your `.env` file

**Free Tier:** 60 requests per minute — perfect for personal use!

---

## 🎨 Screenshots

<div align="center">

### Beautiful iMessage-Style Interface
*Familiar, intuitive design optimized for mobile*

### Streaming AI Responses
*Real-time responses with markdown formatting*

### Persistent Conversations
*Access your conversations from any device*

</div>

---

## 📚 Example Use Cases

### 📖 Book Study
> "I just finished *Thinking in Systems* by Donella Meadows. Can you explain leverage points using an example from my workplace?"

### 💡 Concept Exploration
> "What would happen if we applied your iceberg model to social media algorithms?"

### 🎯 Practical Application
> "I'm trying to identify feedback loops in my startup. Can you walk me through your framework?"

### 🤔 Critical Thinking
> "Your book emphasizes stocks and flows, but what about network effects? How does that fit?"

---

## 🛡️ Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ | `postgresql://localhost:5432/bookcompanion` |
| `JWT_SECRET` | Secret key for JWT tokens | ✅ | `your-super-secret-key-123` |
| `GOOGLE_API_KEY` | Google Gemini API key | ✅ | `AIzaSy...` |
| `NODE_ENV` | Environment mode | ✅ | `development` or `production` |
| `PORT` | Server port | ❌ | `3000` (default) |
| `APP_URL` | Full application URL | ✅ | `http://localhost:3000` |

---

## 🐛 Troubleshooting

<details>
<summary><strong>Database connection issues</strong></summary>

- Verify PostgreSQL is running: `psql --version`
- Check `DATABASE_URL` is correct in `.env`
- Ensure database exists: `psql -l`
- Run schema: `psql bookcompanion < backend/schema.sql`
</details>

<details>
<summary><strong>AI not responding</strong></summary>

- Verify `GOOGLE_API_KEY` is valid
- Check you haven't exceeded API quota
- Look at backend terminal for error messages
- Ensure you have internet connection
</details>

<details>
<summary><strong>Frontend won't start</strong></summary>

- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf .vite`
- Check Node.js version: `node --version` (must be 18+)
</details>

---

## 🌟 Future Roadmap

### 🔜 Coming Soon
- [ ] **Multi-Author Conversations** — Chat with multiple authors simultaneously
- [ ] **Dark Mode** — Easy on the eyes
- [ ] **Export Conversations** — Save as Markdown or PDF
- [ ] **Voice Input/Output** — Talk to authors naturally

### 💡 Under Consideration
- [ ] Cross-book synthesis and connections
- [ ] Reading progress tracking
- [ ] Conversation sharing (read-only links)
- [ ] Mobile apps (iOS & Android)
- [ ] Browser extensions

---

## 🤝 Contributing

Contributions are welcome! Whether it's bug fixes, new features, or documentation improvements.

### How to Contribute

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Write clean, readable code
- Follow existing code style
- Test your changes locally
- Update documentation as needed

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google Gemini AI** — Powering intelligent conversations
- **Railway** — Simple, powerful deployment
- **React Team** — Amazing frontend framework
- **Tailwind CSS** — Beautiful utility-first CSS

---

<div align="center">

### Built with ❤️ for readers who want to go deeper

**[⭐ Star this repo](https://github.com/mattsallover/Book-Companion-V2)** if you find it useful!

</div>