import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['admin', 'tech']).default('tech'),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /auth/register — admin only in production
router.post('/register', async (req, res, next) => {
  try {
    const body = RegisterSchema.parse(req.body);
    const hash = await bcrypt.hash(body.password, 12);
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, email, role, first_name, last_name, created_at`,
      [body.email, hash, body.role, body.firstName, body.lastName]
    );
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /auth/login
router.post('/login', async (req, res, next) => {
  try {
    const body = LoginSchema.parse(req.body);
    const { rows } = await query(
      'SELECT * FROM users WHERE email=$1 AND active=true',
      [body.email]
    );
    const user = rows[0];
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(body.password, user.password_hash as string);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '8h' }
    );
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name },
    });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, email, role, first_name, last_name, phone, clerk_id FROM users WHERE id=$1',
      [req.user!.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /auth/users — admin only
router.get('/users', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, email, role, first_name, last_name, active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
