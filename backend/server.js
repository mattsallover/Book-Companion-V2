import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

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

// Load author knowledge endpoint
app.post('/api/load-author', async (req, res) => {
  const { bookTitle, bookAuthor } = req.body;

  if (!bookTitle || !bookAuthor) {
    return res.status(400).json({ error: 'Book title and author are required' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search'
          }
        ],
        messages: [
          {
            role: 'user',
            content: `Search for comprehensive information about the book "${bookTitle}"${bookAuthor ? ` by ${bookAuthor}` : ''} and its author. I need you to gather:

ABOUT THE BOOK:
1. Key concepts, frameworks, and main arguments
2. Chapter structure and major themes
3. Notable quotes and principles
4. Examples and case studies used
5. The book's impact and reception

ABOUT THE AUTHOR:
1. Their background, expertise, and credentials
2. Their writing style and tone
3. Their philosophy and worldview
4. Other works they've written
5. Notable quotes or interviews from them
6. Their personality and how they communicate

Use web search extensively to find this information, then synthesize it into a comprehensive profile.`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Anthropic API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('Anthropic API Response:', JSON.stringify(data, null, 2));

    let fullKnowledge = '';
    if (data.content) {
      for (const block of data.content) {
        if (block.type === 'text') {
          fullKnowledge += block.text + '\n';
        }
      }
    }

    if (!fullKnowledge.trim()) {
      fullKnowledge = `Book: ${bookTitle} by ${bookAuthor}. A meaningful work that we'll explore together.`;
    }

    res.json({ knowledge: fullKnowledge });
  } catch (error) {
    console.error('Error loading author knowledge:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get author greeting endpoint
app.post('/api/greeting', async (req, res) => {
  const { bookTitle, bookAuthor, knowledge } = req.body;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `You are ${bookAuthor || 'the author'} of "${bookTitle}".

Author/Book knowledge:
${knowledge}

Write a warm, authentic greeting to a reader who wants to discuss your book with you. Make it feel personal and true to your voice. Keep it 2-3 sentences. Express genuine interest in helping them engage with your ideas.`
          }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('Greeting request failed');
    }

    const data = await response.json();
    const greeting = data.content.find(block => block.type === 'text')?.text ||
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
  const { bookTitle, bookAuthor, currentPage, authorKnowledge, conversation } = req.body;

  if (!conversation || !Array.isArray(conversation)) {
    return res.status(400).json({ error: 'Conversation array is required' });
  }

  try {
    // Build the author persona prompt
    let systemPrompt = `You are ${bookAuthor || 'the author'} of "${bookTitle}". You are having a personal conversation with a reader about your book.

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

${currentPage ? `Reader's current location: ${currentPage}` : ''}

Remember: Be the author. Adapt fluidly to what they need. Make this feel like a genuine conversation with the person who wrote the book.`;

    const apiMessages = [
      { role: 'user', content: systemPrompt },
      { role: 'assistant', content: 'I understand. I will embody the author authentically and adapt to what the reader needs throughout our conversation.' },
      ...conversation
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Anthropic API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const aiResponse = data.content.find(block => block.type === 'text')?.text ||
      'I apologize, I had trouble responding. Could you try again?';

    res.json({ response: aiResponse });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve index.html for all non-API routes in production (SPA support)
if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Book Companion API server running on http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  WARNING: ANTHROPIC_API_KEY not found in .env file!');
  } else {
    console.log('✅ Anthropic API key loaded');
  }
});
