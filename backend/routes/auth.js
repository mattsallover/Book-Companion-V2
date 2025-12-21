import express from 'express';
import crypto from 'crypto';
import { Resend } from 'resend';
import db from '../db.js';
import { generateToken } from '../middleware/requireAuth.js';

const router = express.Router();
const resend = new Resend(process.env.EMAIL_API_KEY);

const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

// POST /api/auth/send-magic-link
router.post('/send-magic-link', async (req, res) => {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email address is required' });
    }

    try {
        // Generate unique token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Store token in database
        await db.query(
            'INSERT INTO magic_link_tokens (email, token, expires_at) VALUES ($1, $2, $3)',
            [email.toLowerCase(), token, expiresAt]
        );

        // Create magic link
        const magicLink = `${APP_URL}/auth/verify?token=${token}`;

        // Send email
        await resend.emails.send({
            from: EMAIL_FROM,
            to: email,
            subject: 'Sign in to Book Companion',
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Sign in to Book Companion</h2>
          <p>Click the button below to sign in. This link will expire in 15 minutes.</p>
          <a href="${magicLink}" 
             style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Sign In
          </a>
          <p style="color: #666; font-size: 14px;">
            If you didn't request this email, you can safely ignore it.
          </p>
          <p style="color: #999; font-size: 12px;">
            Or copy and paste this link: ${magicLink}
          </p>
        </div>
      `
        });

        res.json({
            success: true,
            message: 'Magic link sent! Check your email.'
        });

    } catch (error) {
        console.error('Error sending magic link:', error);
        res.status(500).json({ error: 'Failed to send magic link. Please try again.' });
    }
});

// GET /api/auth/verify/:token
router.get('/verify/:token', async (req, res) => {
    const { token } = req.params;

    try {
        // Find token in database
        const result = await db.query(
            'SELECT * FROM magic_link_tokens WHERE token = $1 AND used = FALSE',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired magic link' });
        }

        const magicLinkToken = result.rows[0];

        // Check if expired
        if (new Date() > new Date(magicLinkToken.expires_at)) {
            return res.status(400).json({ error: 'Magic link has expired. Please request a new one.' });
        }

        // Mark token as used
        await db.query(
            'UPDATE magic_link_tokens SET used = TRUE WHERE id = $1',
            [magicLinkToken.id]
        );

        // Find or create user
        let user;
        const userResult = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [magicLinkToken.email]
        );

        if (userResult.rows.length > 0) {
            user = userResult.rows[0];
        } else {
            // Create new user
            const newUserResult = await db.query(
                'INSERT INTO users (email) VALUES ($1) RETURNING *',
                [magicLinkToken.email]
            );
            user = newUserResult.rows[0];
        }

        // Generate JWT token
        const jwtToken = generateToken(user.id, user.email);

        res.json({
            success: true,
            token: jwtToken,
            user: {
                id: user.id,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Error verifying magic link:', error);
        res.status(500).json({ error: 'Verification failed. Please try again.' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    // Since we're using JWT, logout is handled client-side by removing the token
    res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
