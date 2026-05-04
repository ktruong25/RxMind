import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken } from '@clerk/backend';
import { query } from '../db';
import type { AuthUser, UserRole } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Tries Clerk token first, falls back to legacy JWT
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.slice(7);

  // Try Clerk verification first
  if (process.env.CLERK_SECRET_KEY) {
    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      const clerkId = payload.sub;
      const { rows } = await query<AuthUser>(
        'SELECT id, email, role, clerk_id as "clerkId" FROM users WHERE clerk_id=$1 AND active=true',
        [clerkId]
      );
      if (rows[0]) {
        req.user = rows[0];
        return next();
      }
    } catch {
      // Fall through to legacy JWT
    }
  }

  // Legacy JWT
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
