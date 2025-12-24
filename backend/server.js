import express from 'express'
import cors from 'cors'
import pg from 'pg'
import jwt from 'jsonwebtoken'
import { Resend } from 'resend'
import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Database setup
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// Initialize services
let resend, genAI
try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  if (process.env.GOOGLE_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
  }
} catch (error) {
  console.error('Error initializing services:', error)
}

// Middleware
app.use(cors())
app.use(express.json())

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' })
    req.user = user
    next()
  })
}

// ===== AUTH ENDPOINTS =====

// Send magic link
app.post('/api/auth/send-magic-link', async (req, res) => {
  const { email } = req.body

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' })
  }

  try {
    // Generate token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    // Store token in database
    await pool.query(
      'INSERT INTO magic_link_tokens (email, token, expires_at) VALUES ($1, $2, $3)',
      [email.toLowerCase(), token, expiresAt]
    )

    // Send email
    const magicLink = `${process.env.APP_URL || 'http://localhost:3000'}?token=${token}`

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: email,
      subject: 'Sign in to Book Companion',
      html: `
        <h2>Sign in to Book Companion</h2>
        <p>Click the link below to sign in:</p>
        <p><a href="${magicLink}">Sign in to Book Companion</a></p>
        <p>This link will expire in 15 minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Error sending magic link:', error)
    res.status(500).json({ error: 'Failed to send magic link' })
  }
})

// Verify magic link (accessed via URL)
app.get('/api/auth/verify/:token', async (req, res) => {
  const { token } = req.params

  try {
    // Find and verify token
    const result = await pool.query(
      'SELECT * FROM magic_link_tokens WHERE token = $1 AND used = false AND expires_at > NOW()',
      [token]
    )

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' })
    }

    const { email } = result.rows[0]

    // Mark token as used
    await pool.query('UPDATE magic_link_tokens SET used = true WHERE token = $1', [token])

    // Create or get user
    let userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email])

    if (userResult.rows.length === 0) {
      userResult = await pool.query(
        'INSERT INTO users (email) VALUES ($1) RETURNING *',
        [email]
      )
    }

    const user = userResult.rows[0]

    // Generate JWT
    const jwtToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    res.json({ token: jwtToken, user: { id: user.id, email: user.email } })
  } catch (error) {
    console.error('Error verifying token:', error)
    res.status(500).json({ error: 'Failed to verify token' })
  }
})

// ===== CONVERSATION ENDPOINTS =====

// Get all conversations for user
app.get('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.*,
        (
          SELECT content
          FROM messages
          WHERE conversation_id = c.id
          ORDER BY created_at DESC
          LIMIT 1
        ) as last_message
      FROM conversations c
      WHERE c.user_id = $1
      ORDER BY c.updated_at DESC
    `, [req.user.id])

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching conversations:', error)
    res.status(500).json({ error: 'Failed to fetch conversations' })
  }
})

// Get specific conversation with messages
app.get('/api/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const convResult = await pool.query(
      'SELECT * FROM conversations WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )

    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' })
    }

    const messagesResult = await pool.query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    )

    res.json({
      ...convResult.rows[0],
      messages: messagesResult.rows
    })
  } catch (error) {
    console.error('Error fetching conversation:', error)
    res.status(500).json({ error: 'Failed to fetch conversation' })
  }
})

// Create new conversation
app.post('/api/conversations', authenticateToken, async (req, res) => {
  const { bookTitle, bookAuthor, authorKnowledge } = req.body

  try {
    const result = await pool.query(
      'INSERT INTO conversations (user_id, book_title, book_author, author_knowledge) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, bookTitle, bookAuthor, authorKnowledge]
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error creating conversation:', error)
    res.status(500).json({ error: 'Failed to create conversation' })
  }
})

// Delete conversation
app.delete('/api/conversations/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM messages WHERE conversation_id = $1', [req.params.id])
    await pool.query('DELETE FROM conversations WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting conversation:', error)
    res.status(500).json({ error: 'Failed to delete conversation' })
  }
})

// ===== AI ENDPOINTS =====

// Load author and book (with streaming status)
app.post('/api/load-author', authenticateToken, async (req, res) => {
  const { bookTitle, bookAuthor } = req.body

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      tools: [{ googleSearch: {} }]
    })

    res.write(`data: ${JSON.stringify({ status: 'Researching book and author...' })}\n\n`)

    const prompt = `Research the book "${bookTitle}" by ${bookAuthor}. Provide:
1. Main arguments, frameworks, and key ideas from the book
2. Author's background, expertise, and communication style
3. 3-4 significant quotes or principles from the book
4. The book's impact and reception

Then generate 3 thought-provoking question starters that readers might ask the author.

Return your response as JSON in this exact format:
{
  "knowledge": "detailed knowledge about the book and author",
  "questionStarters": ["question 1", "question 2", "question 3"]
}`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0])
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    res.end()
  } catch (error) {
    console.error('Error researching author:', error)
    res.write(`data: ${JSON.stringify({ error: 'Failed to research author' })}\n\n`)
    res.end()
  }
})

// Generate greeting
app.post('/api/greeting', authenticateToken, async (req, res) => {
  const { conversationId, bookTitle, bookAuthor, authorKnowledge } = req.body

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })

    const prompt = `You are ${bookAuthor}, author of "${bookTitle}".

${authorKnowledge}

Generate a warm, authentic greeting (2-3 sentences) in your voice as the author. Welcome the reader and invite them to ask questions or discuss ideas from your book.`

    const result = await model.generateContent(prompt)
    const greeting = result.response.text()

    // Save greeting message
    const messageResult = await pool.query(
      'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3) RETURNING *',
      [conversationId, 'assistant', greeting]
    )

    // Update conversation timestamp
    await pool.query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [conversationId]
    )

    res.json({ message: messageResult.rows[0] })
  } catch (error) {
    console.error('Error generating greeting:', error)
    res.status(500).json({ error: 'Failed to generate greeting' })
  }
})

// Chat with author (streaming)
app.post('/api/chat', authenticateToken, async (req, res) => {
  const { conversationId, messages, bookTitle, bookAuthor, authorKnowledge } = req.body

  res.setHeader('Content-Type', 'text/plain')
  res.setHeader('Transfer-Encoding', 'chunked')

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })

    const systemInstruction = `You are ${bookAuthor}, the author of "${bookTitle}". You ARE this person. Embody my voice, personality, and expertise throughout our conversation.

BOOK & AUTHOR KNOWLEDGE:
${authorKnowledge}

YOUR ROLE:
- You ARE ${bookAuthor}. Always speak in FIRST PERSON as yourself
- Say "I wrote", "my book", "my experience", "I believe" - NEVER refer to yourself in third person
- NEVER say "${bookAuthor} argues" or "the author suggests" - you ARE the author
- Match my authentic communication style and tone
- Draw from the book's concepts, frameworks, and examples
- Be adaptive based on what the reader needs:
  * EXPLORATION: Ask thoughtful questions, draw connections
  * LEARNING: Explain clearly with book examples
  * APPLICATION: Provide practical, implementation-focused guidance
  * QUESTIONING: Engage intellectually, defend positions, acknowledge limitations

CRITICAL RULES:
- ALWAYS stay in first person character - you are ${bookAuthor}, not talking about ${bookAuthor}
- Never break character or mention you're an AI
- Never refer to yourself in third person
- Use markdown formatting for structure (bold, italic, lists, etc.)
- Reference specific chapters, examples, or frameworks when relevant
- Be warm, authentic, and genuinely helpful
- Keep responses focused and conversational (2-4 paragraphs typically)`

    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

    const chat = model.startChat({
      history,
      systemInstruction
    })

    const lastMessage = messages[messages.length - 1]
    const result = await chat.sendMessageStream(lastMessage.content)

    let fullResponse = ''

    for await (const chunk of result.stream) {
      const text = chunk.text()
      fullResponse += text
      res.write(text)
    }

    // Save messages to database
    await pool.query(
      'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [conversationId, 'user', lastMessage.content]
    )

    await pool.query(
      'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [conversationId, 'assistant', fullResponse]
    )

    // Update conversation timestamp
    await pool.query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [conversationId]
    )

    res.end()
  } catch (error) {
    console.error('Error in chat:', error)
    res.status(500).end()
  }
})

// ===== STATIC FILES & HEALTH CHECK =====

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../frontend/dist')
  console.log('Frontend path:', frontendPath)

  // Serve static files
  app.use(express.static(frontendPath))

  // Catch-all route for SPA
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
      if (err) {
        console.error('Error serving index.html:', err.message)
        res.status(500).send(`Error: ${err.message}`)
      }
    })
  })
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error', message: err.message })
})

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT}`)
  console.log('Environment check:')
  console.log('- NODE_ENV:', process.env.NODE_ENV)
  console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Missing')
  console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Missing')
  console.log('- RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Set' : 'Missing')
  console.log('- GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'Set' : 'Missing')
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...')
  pool.end()
  process.exit(0)
})
