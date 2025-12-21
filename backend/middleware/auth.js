import { clerkClient } from '@clerk/clerk-sdk-node';
import db from './db.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.substring(7);
    
    // Verify the token with Clerk
    const session = await clerkClient.sessions.verifySession(token);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Get or create user in our database
    const clerkUserId = session.userId;
    let userResult = await db.query(
      'SELECT * FROM users WHERE clerk_user_id = $1',
      [clerkUserId]
    );

    if (userResult.rows.length === 0) {
      // Create new user
      const insertResult = await db.query(
        'INSERT INTO users (clerk_user_id) VALUES ($1) RETURNING *',
        [clerkUserId]
      );
      userResult = insertResult;
    }

    // Attach user to request
    req.user = userResult.rows[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};
