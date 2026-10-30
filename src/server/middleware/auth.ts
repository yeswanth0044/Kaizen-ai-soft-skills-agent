import type { Request, Response, NextFunction } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../firebaseAdmin.ts';

export interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authentication required. Please sign in to access KAIZEN coaching services.',
    });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Missing authentication token.' });
    return;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Firebase token verification error:', err);
    res.status(401).json({
      error: 'Your session token has expired or is invalid. Please sign in again.',
    });
  }
};

interface RateBucket {
  timestamps: number[];
}

const buckets = new Map<string, RateBucket>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;

export const aiRateLimiter = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const key = req.user?.uid || req.ip || 'anonymous';
  const now = Date.now();
  const existing = buckets.get(key) || { timestamps: [] };

  existing.timestamps = existing.timestamps.filter((t) => now - t < WINDOW_MS);

  if (existing.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - existing.timestamps[0])) / 1000);
    res.status(429).json({
      error: `Rate limit reached (${MAX_REQUESTS_PER_WINDOW} AI coaching requests per minute). Please wait ${retryAfterSec}s before submitting again.`,
    });
    return;
  }

  existing.timestamps.push(now);
  buckets.set(key, existing);
  next();
};
