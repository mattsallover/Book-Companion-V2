import express from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

// GET /api/conversations - List user's conversations
router.get('/', requireAuth, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT c.id, c.book_title, c.book_author, c.created_at, c.updated_at,
              COUNT(m.id) as message_count
       FROM conversations c
       LEFT JOIN messages m ON c.id = m.conversation_id
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.updated_at DESC`,
            [req.user.id]
        );

        res.json({ conversations: result.rows });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// GET /api/conversations/:id - Get specific conversation with messages
router.get('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;

    try {
        // Get conversation
        const convResult = await db.query(
            'SELECT * FROM conversations WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (convResult.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const conversation = convResult.rows[0];

        // Get messages
        const messagesResult = await db.query(
            'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
            [id]
        );

        res.json({
            conversation: {
                ...conversation,
                messages: messagesResult.rows
            }
        });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({ error: 'Failed to fetch conversation' });
    }
});

// POST /api/conversations - Create or update conversation
router.post('/', requireAuth, async (req, res) => {
    const { bookTitle, bookAuthor, authorKnowledge, messages, conversationId } = req.body;

    if (!bookTitle || !bookAuthor) {
        return res.status(400).json({ error: 'Book title and author are required' });
    }

    try {
        let conversation;

        if (conversationId) {
            // Update existing conversation
            const updateResult = await db.query(
                `UPDATE conversations 
         SET updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
                [conversationId, req.user.id]
            );

            if (updateResult.rows.length === 0) {
                return res.status(404).json({ error: 'Conversation not found' });
            }

            conversation = updateResult.rows[0];
        } else {
            // Create new conversation
            const insertResult = await db.query(
                `INSERT INTO conversations (user_id, book_title, book_author, author_knowledge)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
                [req.user.id, bookTitle, bookAuthor, authorKnowledge]
            );

            conversation = insertResult.rows[0];
        }

        // Save messages if provided
        if (messages && Array.isArray(messages)) {
            for (const msg of messages) {
                await db.query(
                    'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
                    [conversation.id, msg.role, msg.content]
                );
            }
        }

        res.json({
            success: true,
            conversation: {
                id: conversation.id,
                bookTitle: conversation.book_title,
                bookAuthor: conversation.book_author
            }
        });
    } catch (error) {
        console.error('Error saving conversation:', error);
        res.status(500).json({ error: 'Failed to save conversation' });
    }
});

// POST /api/conversations/:id/messages - Add message to conversation
router.post('/:id/messages', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { role, content } = req.body;

    if (!role || !content) {
        return res.status(400).json({ error: 'Role and content are required' });
    }

    try {
        // Verify conversation ownership
        const convResult = await db.query(
            'SELECT * FROM conversations WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (convResult.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        // Insert message
        const messageResult = await db.query(
            'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3) RETURNING *',
            [id, role, content]
        );

        // Update conversation timestamp
        await db.query(
            'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [id]
        );

        res.json({
            success: true,
            message: messageResult.rows[0]
        });
    } catch (error) {
        console.error('Error adding message:', error);
        res.status(500).json({ error: 'Failed to add message' });
    }
});

// DELETE /api/conversations/:id - Delete conversation
router.delete('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query(
            'DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        res.json({ success: true, message: 'Conversation deleted' });
    } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({ error: 'Failed to delete conversation' });
    }
});

export default router;
