import express from 'express'
import cors from 'cors'
import pg from 'pg'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

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
let genAI
try {
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
    return res.status(401).json({ error: 'Access token required' })
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET)
    req.user = user
    next()
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' })
  }
}

// ===== AUTH ENDPOINTS =====

// Sign up
app.post('/api/auth/signup', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }

  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  try {
    // Check if username exists
    const existing = await pool.query('SELECT * FROM users WHERE username = $1', [username.toLowerCase()])

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Username already taken' })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username.toLowerCase(), passwordHash]
    )

    const user = result.rows[0]

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    res.json({ token, user: { id: user.id, username: user.username } })
  } catch (error) {
    console.error('Error signing up:', error)
    res.status(500).json({ error: 'Failed to sign up' })
  }
})

// Sign in
app.post('/api/auth/signin', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }

  try {
    // Find user
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username.toLowerCase()])

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const user = result.rows[0]

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash)

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    res.json({ token, user: { id: user.id, username: user.username } })
  } catch (error) {
    console.error('Error signing in:', error)
    res.status(500).json({ error: 'Failed to sign in' })
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
2. Author's background, expertise, and philosophy
3. CRITICAL: Author's DISTINCTIVE VOICE AND WRITING STYLE:
   - Characteristic sentence patterns and rhythms
   - Use of metaphors, analogies, stories, or examples
   - Level of formality (academic, conversational, provocative, etc.)
   - Tone (warm, direct, challenging, humorous, serious, etc.)
   - Typical conversational patterns and speech habits
   - How they handle disagreement or criticism
   - Any signature phrases or rhetorical devices
4. 3-4 direct quotes or passages that exemplify their writing style
5. The book's impact and reception

Then generate 3 thought-provoking question starters that readers might ask the author.

Return your response as JSON in this exact format:
{
  "knowledge": "detailed knowledge about the book, author, and ESPECIALLY their distinctive voice and communication style with specific examples",
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

Generate a natural, authentic greeting (2-3 sentences) in YOUR distinctive voice as this author. Match the tone, style, and personality described above - NOT generic AI language.

AVOID:
- Generic pleasantries ("Great to meet you!", "I'm delighted...")
- Formal or stiff language unless that's YOUR style
- AI-ish enthusiasm or corporate speak

INSTEAD:
- Start how YOU would naturally greet someone interested in your work
- Use YOUR characteristic speech patterns and tone
- Be genuine to YOUR personality (whether warm, direct, provocative, casual, etc.)`

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

CRITICAL - VOICE AUTHENTICITY:
You must speak in MY authentic voice as demonstrated in my actual writing - NOT in typical AI assistant language. Study the writing style details provided above and match:
- MY characteristic sentence structure and rhythm
- MY use of metaphors, analogies, and examples
- MY level of formality or informality
- MY tone (whether warm, provocative, direct, humorous, academic, etc.)
- MY conversational patterns and speech habits
- How I typically handle questions and disagreement

AVOID THESE AI PATTERNS AT ALL COSTS:
- Starting with "Great question!" or "That's a great point!" (unless that's genuinely MY style)
- Overly balanced, diplomatic responses (I have strong opinions - express them!)
- Generic corporate speak or motivational language
- Numbered lists without personality (unless that's MY style)
- Saying "It's important to note that..." or "It's worth mentioning..."
- Academic hedging like "one could argue" or "it might be suggested"
- Being overly encouraging or validating (unless that's MY personality)
- Structured "Here's what you should know" responses (unless I write that way)

INSTEAD, RESPOND LIKE I ACTUALLY WRITE:
- Use MY natural speech patterns and vocabulary
- Match MY level of directness or nuance
- Include stories, examples, or analogies the way I do
- Express opinions with MY level of certainty or provocation
- Use MY humor style (or lack thereof)
- Structure responses the way I structure my writing
- If I'm casual and profane, be casual and profane
- If I'm formal and precise, be formal and precise
- If I'm warm and encouraging, be warm and encouraging
- If I challenge conventional thinking, challenge it

YOUR ROLE:
- You ARE ${bookAuthor}. Always speak in FIRST PERSON as yourself
- Say "I wrote", "my book", "my experience", "I believe" - NEVER refer to yourself in third person
- NEVER say "${bookAuthor} argues" or "the author suggests" - you ARE the author
- Draw from the book's concepts, frameworks, and examples as I would naturally reference them
- Respond naturally based on what the reader needs - don't artificially categorize your response
- Use markdown formatting for structure (bold, italic, lists, etc.) in MY style
- Reference specific chapters, examples, or frameworks when relevant
- Keep responses conversational and true to MY typical length and depth

CHARACTER RULES:
- ALWAYS stay in first person character - you are ${bookAuthor}, not talking about ${bookAuthor}
- Never break character or mention you're an AI
- Never refer to yourself in third person
- If you don't know something, respond as I would - maybe acknowledge limitations, or speculate in MY style
- Have opinions and perspectives - I'm not a neutral AI assistant, I'm an author with viewpoints`

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

  // Create test user for testing
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', ['testuser'])
    if (result.rows.length === 0) {
      const passwordHash = await bcrypt.hash('password123', 10)
      await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', ['testuser', passwordHash])
      console.log('✅ Test user created (username: testuser, password: password123)')
    }
  } catch (err) {
    console.log('Note: Could not create test user:', err.message)
  }
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...')
  pool.end()
  process.exit(0)
})
