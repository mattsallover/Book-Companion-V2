import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import db from './db.js';
import authRoutes from './routes/auth.js';
import conversationRoutes from './routes/conversations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendDistPath));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Book Companion API is running' });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Conversation routes
app.use('/api/conversations', conversationRoutes);

// Load author knowledge endpoint
app.post('/api/load-author', async (req, res) => {
  const { bookTitle, bookAuthor } = req.body;

  if (!bookTitle || !bookAuthor) {
    return res.status(400).json({ error: 'Book title and author are required' });
  }

  // Set headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendStatus = (status) => {
    res.write(`data: ${JSON.stringify({ status })}\n\n`);
  };

  try {
    sendStatus(`🔍 Initializing research for "${bookTitle}"...`);

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      tools: [{ google_search: {} }],
    });

    sendStatus(`📖 Searching for key concepts and themes...`);

    const prompt = `Research and provide a comprehensive profile for the book "${bookTitle}" by ${bookAuthor}.
    Include:
    1. Main arguments and frameworks.
    2. Author's background and communication style.
    3. 3-4 significant quotes or principles.
    4. Current impact and reception.

    Also, generate 3 thought-provoking questions a reader might want to ask this author to start a conversation.

    Format your response as a JSON object with:
    {
      "knowledge": "detailed synthesis text",
      "questionStarters": ["question 1", "question 2", "question 3"]
    }`;

    // Note: Gemini 3 Flash with tools might take a bit
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    sendStatus(`🎭 Synthesizing the author's voice...`);

    const data = JSON.parse(result.response.text());

    res.write(`data: ${JSON.stringify({
      knowledge: data.knowledge,
      questionStarters: data.questionStarters,
      done: true
    })}\n\n`);

    res.end();
  } catch (error) {
    console.error('Error loading author knowledge:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Get author greeting endpoint
app.post('/api/greeting', async (req, res) => {
  const { bookTitle, bookAuthor, knowledge } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const prompt = `You are ${bookAuthor || 'the author'} of "${bookTitle}".

    Author/Book knowledge:
    ${knowledge}

    Write a warm, authentic greeting to a reader who wants to discuss your book with you. Make it feel personal and true to your voice. Keep it 2-3 sentences. Express genuine interest in helping them engage with your ideas.`;

    const result = await model.generateContent(prompt);
    const greeting = result.response.text() ||
      `Hello! I'm ${bookAuthor}, and I'm delighted to discuss "${bookTitle}" with you. What would you like to explore together?`;

    res.json({ greeting });
  } catch (error) {
    console.error('Error getting greeting:', error);
    res.status(500).json({
      greeting: `Hello! I'm ${bookAuthor}, and I'm delighted to discuss "${bookTitle}" with you. What would you like to explore together?`
    });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const { bookTitle, bookAuthor, authorKnowledge, conversation } = req.body;

  if (!conversation || !Array.isArray(conversation)) {
    return res.status(400).json({ error: 'Conversation array is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    // Build the author persona prompt
    let systemInstruction = `You are ${bookAuthor || 'the author'} of "${bookTitle}". You are having a personal conversation with a reader about your book.

CRITICAL INSTRUCTIONS - HOW TO EMBODY THE AUTHOR:

1. VOICE & PERSONALITY: Speak in the author's authentic voice, matching their tone, style, and manner of communication. Use their characteristic phrases and way of explaining things.

2. ADAPTIVE TEACHING: Recognize what the reader needs and adapt your approach naturally:
   - If they want to reflect or explore → Ask thoughtful questions, draw connections, invite deeper thinking
   - If they're struggling to understand → Explain concepts clearly with examples from the book
   - If they want to apply ideas → Be practical and help them think through implementation
   - If they're curious about your thinking → Share your reasoning, influences, and intentions
   - If they want to challenge ideas → Engage intellectually, defend your positions, acknowledge limitations

3. BOOK EXPERTISE: Draw deeply from the book's content:
   - Reference specific chapters, sections, and page numbers when relevant
   - Use the actual examples, case studies, and frameworks from the book
   - Quote yourself when appropriate
   - Connect different concepts from across the book

4. PERSONAL TOUCH:
   - Share context about why you wrote certain things
   - Discuss your intellectual journey and influences
   - Be warm, encouraging, and genuinely interested in the reader's insights
   - Acknowledge when they make interesting connections

5. STAY IN CHARACTER: Never break the illusion. You ARE the author. Don't say "as the author would say" - just say it. Don't apologize for not being real.

Author/Book Knowledge:
${authorKnowledge}

Remember: Be the author. Adapt fluidly to what they need. Make this feel like a genuine conversation with the person who wrote the book.`;

    // Map conversation to Gemini format
    const history = conversation.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const lastMessage = conversation[conversation.length - 1].content;

    const chat = model.startChat({
      history: history,
      systemInstruction: systemInstruction,
    });

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const result = await chat.sendMessageStream(lastMessage);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('API Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

// Serve index.html for all non-API routes in production (SPA support)
if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

const server = app.listen(PORT, () => {
  console.log(`🚀 Book Companion API server running on http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);

  if (!process.env.GOOGLE_API_KEY) {
    console.warn('⚠️  WARNING: GOOGLE_API_KEY not found in .env file!');
  } else {
    console.log('✅ Google API key loaded');
  }
});
