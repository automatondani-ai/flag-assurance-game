/**
 * Global leaderboard API — backed by Upstash Redis (Vercel KV integration).
 *
 * Required environment variables (Vercel Storage → KV → flag-leaderboard):
 *   KV_REST_API_URL   — Upstash Redis REST endpoint
 *   KV_REST_API_TOKEN — read/write token
 */
import { Redis } from '@upstash/redis';
import { randomUUID } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// ── CORS origin whitelist ──────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://flag-explorers.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip HTML tags and dangerous characters from user-supplied strings. */
function sanitise(s: string): string {
  return String(s)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"'`]/g, '')
    .trim();
}

/** Attach security headers to every response. */
function setSecurityHeaders(res: VercelResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  id?: string;
  name: string;
  score: number;
  percentage: number;
  duration: number;
  date: string;
  region: string;
  gameLength: number;
};

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── CORS ────────────────────────────────────────────────────────────────────
  const origin = (req.headers['origin'] as string) || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ── Security headers on every response ──────────────────────────────────────
  setSecurityHeaders(res);

  // ── Preflight ────────────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ── Method guard ─────────────────────────────────────────────────────────────
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ── GET — fetch top 10 ──────────────────────────────────────────────────
    if (req.method === 'GET') {
      const entries = await redis.zrange('leaderboard', 0, 9, {
        rev: true,
        withScores: true,
      }) as (string | number)[];

      // entries alternates [member, score, member, score, ...]
      const parsed: (LeaderboardEntry & { rank: number })[] = [];
      for (let i = 0; i < entries.length; i += 2) {
        try {
          const raw = entries[i];
          // @upstash/redis may auto-parse JSON objects — handle both
          const entry: LeaderboardEntry =
            typeof raw === 'string' ? JSON.parse(raw) : (raw as unknown as LeaderboardEntry);
          parsed.push({ ...entry, rank: Math.floor(i / 2) + 1 });
        } catch {
          // skip malformed entries silently
        }
      }
      return res.status(200).json({ leaderboard: parsed });
    }

    // ── POST — submit a new score ───────────────────────────────────────────
    if (req.method === 'POST') {

      // ── Rate limiting ──────────────────────────────────────────────────────
      // Get the real client IP (Vercel forwards it in x-forwarded-for).
      const ip = (
        (req.headers['x-forwarded-for'] as string) ||
        req.socket?.remoteAddress ||
        'unknown'
      ).split(',')[0].trim();

      // Hourly bucket: 60 submissions per IP per hour (1/min average)
      const hourKey = `ratelimit:hour:${ip}:${Math.floor(Date.now() / 3_600_000)}`;
      const hourCount = await redis.incr(hourKey);
      if (hourCount === 1) await redis.expire(hourKey, 3600);
      if (hourCount > 60) {
        return res.status(429).json({ error: 'Too many submissions. Try again later.' });
      }

      // Per-minute burst bucket: 10 submissions per IP per minute
      const minKey = `ratelimit:min:${ip}:${Math.floor(Date.now() / 60_000)}`;
      const minCount = await redis.incr(minKey);
      if (minCount === 1) await redis.expire(minKey, 60);
      if (minCount > 10) {
        return res.status(429).json({ error: 'Slow down! Too many submissions per minute.' });
      }

      // ── Input validation ───────────────────────────────────────────────────
      const body = req.body as Record<string, unknown>;

      // name: non-empty string, max 100 chars (sanitised to 30 below)
      if (typeof body.name !== 'string' || body.name.trim().length === 0 || body.name.length > 100) {
        return res.status(400).json({ error: 'Invalid entry: name' });
      }

      // score: finite number within absolute bounds
      if (
        typeof body.score !== 'number' ||
        !isFinite(body.score) ||
        body.score < -99999 ||
        body.score > 99999
      ) {
        return res.status(400).json({ error: 'Invalid entry: score' });
      }

      // percentage: 0–100
      if (
        typeof body.percentage !== 'number' ||
        !isFinite(body.percentage) ||
        body.percentage < 0 ||
        body.percentage > 100
      ) {
        return res.status(400).json({ error: 'Invalid entry: percentage' });
      }

      // duration: non-negative integer, max 24 hours
      if (
        typeof body.duration !== 'number' ||
        !Number.isInteger(body.duration) ||
        body.duration < 0 ||
        body.duration > 86400
      ) {
        return res.status(400).json({ error: 'Invalid entry: duration' });
      }

      // gameLength: positive integer, max 250 (covers all continents combined).
      // Note: the ALL-mode sentinel (9999) is resolved to queue.length client-side
      // before submitting, so the actual value here is always a real game length.
      if (
        typeof body.gameLength !== 'number' ||
        !Number.isInteger(body.gameLength) ||
        body.gameLength < 1 ||
        body.gameLength > 250
      ) {
        return res.status(400).json({ error: 'Invalid entry: gameLength' });
      }

      // region: string, max 100 chars
      if (typeof body.region !== 'string' || body.region.length > 100) {
        return res.status(400).json({ error: 'Invalid entry: region' });
      }

      const rawScore      = body.score      as number;
      const rawPercentage = body.percentage as number;
      const rawDuration   = body.duration   as number;
      const rawGameLength = body.gameLength as number;

      // ── Score plausibility check ───────────────────────────────────────────
      // Score validation is best-effort. Full prevention would require stateful
      // server-side game sessions. These checks block obviously impossible values.
      // Each question awards ±assurance where assurance is 0–100, so bounds are:
      const maxPossibleScore = rawGameLength * 100;
      const minPossibleScore = rawGameLength * -100;
      if (rawScore > maxPossibleScore || rawScore < minPossibleScore) {
        return res.status(400).json({ error: 'Invalid entry: score out of range for game length' });
      }

      // ── Build sanitised entry ──────────────────────────────────────────────
      const name   = sanitise(String(body.name)).slice(0, 30);
      const region = sanitise(String(body.region)).slice(0, 100);

      if (!name) {
        return res.status(400).json({ error: 'Invalid entry: name empty after sanitisation' });
      }

      const entry: LeaderboardEntry = {
        id:         randomUUID(),   // prevents duplicate-member collisions in sorted set
        name,
        score:      rawScore,
        percentage: rawPercentage,
        duration:   rawDuration,
        date:       new Date().toISOString(), // always use server time — ignore client-supplied date
        region,
        gameLength: rawGameLength,
      };

      // Store in sorted set with score as the sort key.
      // The UUID in the entry ensures two identical name/score combos don't collide.
      const memberKey = JSON.stringify(entry);
      await redis.zadd('leaderboard', { score: entry.score, member: memberKey });

      // Keep only top 50 entries to prevent unbounded growth.
      // ZREMRANGEBYRANK removes from lowest rank (0) up to rank -51,
      // retaining only the top 50 highest scores.
      await redis.zremrangebyrank('leaderboard', 0, -51);

      return res.status(200).json({ success: true });
    }

  } catch (err) {
    // Never expose internal error details to the client
    console.error('[leaderboard] handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
