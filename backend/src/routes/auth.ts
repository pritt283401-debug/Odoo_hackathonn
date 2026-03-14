import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { query, queryOne, execute } from '../db/connection';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ─────────────────────────────────────────────────
// POST /api/auth/signup
// ─────────────────────────────────────────────────
router.post(
  '/signup',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['MANAGER', 'STAFF']).withMessage('Invalid role'),
    body('mobile').optional().trim(),
  ],
  validate,
  async (req: any, res: any) => {
    const { name, email, password, role = 'STAFF', mobile } = req.body;

    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const id   = uuid();

    await execute(
      'INSERT INTO users (id, email, password, name, mobile, role) VALUES (?, ?, ?, ?, ?, ?)',
      [id, email, hash, name, mobile || null, role]
    );

    // Create default categories for new user
    const defaultCategories = ['Electronics', 'Hardware', 'Raw Materials', 'Finished Goods', 'Office Supplies'];
    for (const catName of defaultCategories) {
      await execute(
        'INSERT INTO categories (id, user_id, name, description) VALUES (?, ?, ?, ?)',
        [uuid(), id, catName, 'Default category']
      );
    }

    const user = await queryOne<any>('SELECT id, email, name, mobile, role, created_at FROM users WHERE id = ?', [id]);

    const token = jwt.sign(
      { id: user!.id, email: user!.email, name: user!.name, role: user!.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any
    );

    res.status(201).json({ success: true, message: 'Account created', token, user });
  }
);

// ─────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  async (req: any, res: any) => {
    const { email, password } = req.body;

    const user = await queryOne<any>('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any
    );

    const { password: _pw, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser });
  }
);

// ─────────────────────────────────────────────────
// POST /api/auth/forgot-password  → generate OTP
// ─────────────────────────────────────────────────
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  validate,
  async (req: any, res: any) => {
    const { email } = req.body;

    const user = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });
    }

    // Invalidate existing OTPs for this email
    await execute('UPDATE otp_tokens SET used = 1 WHERE email = ? AND used = 0', [email]);

    const otp      = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await execute(
      'INSERT INTO otp_tokens (id, email, otp, expires_at) VALUES (?, ?, ?, ?)',
      [uuid(), email, otp, expiresAt]
    );

    // In production: send email. For dev, return OTP in response.
    res.json({
      success: true,
      message: 'OTP generated (dev mode - OTP included in response)',
      otp,   // REMOVE IN PRODUCTION
      expiresAt,
    });
  }
);

// ─────────────────────────────────────────────────
// POST /api/auth/reset-password  → verify OTP, set new password
// ─────────────────────────────────────────────────
router.post(
  '/reset-password',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  async (req: any, res: any) => {
    const { email, otp, password } = req.body;

    const record = await queryOne<any>(
      `SELECT * FROM otp_tokens
       WHERE email = ? AND otp = ? AND used = 0 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );

    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const hash = await bcrypt.hash(password, 10);
    await execute('UPDATE users SET password = ? WHERE email = ?', [hash, email]);
    await execute('UPDATE otp_tokens SET used = 1 WHERE id = ?', [record.id]);

    res.json({ success: true, message: 'Password reset successfully' });
  }
);

// ─────────────────────────────────────────────────
// GET /api/auth/me  → get current user info
// ─────────────────────────────────────────────────
router.get('/me', requireAuth, async (req: any, res: any) => {
  const user = await queryOne<any>(
    'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
    [req.user!.id]
  );
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user });
});

export default router;
