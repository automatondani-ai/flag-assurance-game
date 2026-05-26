/**
 * Global leaderboard API — backed by Upstash Redis (Vercel KV integration).
 *
 * Required environment variables (Vercel Storage → KV → flag-leaderboard):
 *   KV_REST_API_URL   — Upstash Redis REST endpoint
 *   KV_REST_API_TOKEN — read/write token
 *
 * Score security model:
 *   The client POSTs a list of answers (countryCode + playerInput + assurance).
 *   The server recalculates score, correctCount, and percentage independently
 *   using its own country list and answer-checking logic. The client's claimed
 *   score is never trusted — only the server-verified value is stored.
 */
import { Redis } from '@upstash/redis';
import { randomUUID } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { COUNTRY_MAP } from './countries.js';

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

/**
 * Classic Levenshtein edit-distance (DP, O(m*n)).
 * Used for server-side answer verification — no external dependencies needed.
 */
function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/**
 * Server-side answer check:
 * 1. Exact match against correct name
 * 2. Exact match against any alias
 * 3. Levenshtein ≤ 2 against correct name (covers common 1-2 char typos)
 *
 * No Fuse.js on the server — pure string operations, no external deps.
 * Input length is capped at 45 chars (same limit enforced by the client input).
 */
function serverCheckAnswer(
  input: string,
  correctName: string,
  aliases: string[] = [],
): boolean {
  const trimmed = input.trim();
  // Mirror the client-side 45-char guard
  if (trimmed.length > 45) return false;
  if (trimmed.length === 0) return false;

  const normalised = trimmed.toLowerCase();
  const target     = correctName.toLowerCase();

  if (normalised === target) return true;
  if (aliases.some(a => a.toLowerCase() === normalised)) return true;
  if (levenshtein(normalised, target) <= 2) return true;

  return false;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  id?: string;
  name: string;
  score: number;
  percentage: number;
  correctCount: number;
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

    // ── POST — verify answers and save score ────────────────────────────────
    if (req.method === 'POST') {

      // ── Rate limiting ──────────────────────────────────────────────────────
      const ip = (
        (req.headers['x-forwarded-for'] as string) ||
        req.socket?.remoteAddress ||
        'unknown'
      ).split(',')[0].trim();

      // Hourly bucket: 60 submissions per IP per hour
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

      // ── Top-level shape validation ─────────────────────────────────────────
      const body = req.body as Record<string, unknown>;

      // name: non-empty string
      if (typeof body.name !== 'string' || body.name.trim().length === 0 || body.name.length > 100) {
        return res.status(400).json({ error: 'Invalid submission: name' });
      }

      // region: string, max 100 chars
      if (typeof body.region !== 'string' || body.region.length > 100) {
        return res.status(400).json({ error: 'Invalid submission: region' });
      }

      // duration: non-negative integer, max 24 hours
      if (
        typeof body.duration !== 'number' ||
        !Number.isInteger(body.duration) ||
        body.duration < 0 ||
        body.duration > 86400
      ) {
        return res.status(400).json({ error: 'Invalid submission: duration' });
      }

      // gameLength: positive integer, max 250
      if (
        typeof body.gameLength !== 'number' ||
        !Number.isInteger(body.gameLength) ||
        body.gameLength < 1 ||
        body.gameLength > 250
      ) {
        return res.status(400).json({ error: 'Invalid submission: gameLength' });
      }

      // answers: must be an array
      if (!Array.isArray(body.answers)) {
        return res.status(400).json({ error: 'Invalid submission: answers must be an array' });
      }

      // answers.length must match declared gameLength
      if (body.answers.length !== body.gameLength) {
        return res.status(400).json({ error: 'Invalid submission: answers count mismatch' });
      }

      // Hard cap: can't have more answers than countries in our dataset
      if (body.answers.length > 181) {
        return res.status(400).json({ error: 'Invalid submission: too many answers' });
      }

      // ── Per-answer validation + server-side scoring ────────────────────────
      let score       = 0;
      let correctCount = 0;

      for (const raw of body.answers) {
        if (typeof raw !== 'object' || raw === null) {
          return res.status(400).json({ error: 'Invalid submission: malformed answer' });
        }

        const answer = raw as Record<string, unknown>;

        // countryCode: 2-char lowercase string
        if (typeof answer.countryCode !== 'string' || answer.countryCode.length > 4) {
          return res.status(400).json({ error: 'Invalid submission: answer.countryCode' });
        }

        // assurance: 0–100
        if (
          typeof answer.assurance !== 'number' ||
          !isFinite(answer.assurance) ||
          answer.assurance < 0 ||
          answer.assurance > 100
        ) {
          return res.status(400).json({ error: 'Invalid submission: answer.assurance' });
        }

        // skipped: boolean
        if (typeof answer.skipped !== 'boolean') {
          return res.status(400).json({ error: 'Invalid submission: answer.skipped' });
        }

        // playerInput: string (may be empty for skips)
        if (typeof answer.playerInput !== 'string') {
          return res.status(400).json({ error: 'Invalid submission: answer.playerInput' });
        }

        // Skipped questions contribute 0 to score
        if (answer.skipped) continue;

        // Look up country — reject entire submission if code is unrecognised
        const country = COUNTRY_MAP.get(answer.countryCode);
        if (!country) {
          return res.status(400).json({ error: 'Invalid submission: unknown countryCode' });
        }

        // Server recalculates correctness independently
        const isCorrect = serverCheckAnswer(
          answer.playerInput,
          country.name,
          country.aliases,
        );

        if (isCorrect) {
          score += answer.assurance as number;
          correctCount++;
        } else {
          score -= answer.assurance as number;
        }
      }

      const gameLength = body.gameLength as number;
      const percentage = gameLength > 0
        ? Math.round((correctCount / gameLength) * 100)
        : 0;

      // ── Build and store entry ──────────────────────────────────────────────
      const name   = sanitise(String(body.name)).slice(0, 30);
      const region = sanitise(String(body.region)).slice(0, 100);

      if (!name) {
        return res.status(400).json({ error: 'Invalid submission: name empty after sanitisation' });
      }

      const entry: LeaderboardEntry = {
        id:           randomUUID(),
        name,
        score,            // server-calculated — client's claimed value is never used
        percentage,       // server-calculated
        correctCount,     // server-calculated
        duration:         body.duration as number,
        date:             new Date().toISOString(),
        region,
        gameLength,
      };

      // Store in sorted set using server-verified score as the sort key.
      // UUID in entry prevents duplicate-member collisions.
      const memberKey = JSON.stringify(entry);
      await redis.zadd('leaderboard', { score: entry.score, member: memberKey });

      // Keep only top 50 entries to prevent unbounded growth.
      await redis.zremrangebyrank('leaderboard', 0, -51);

      return res.status(200).json({ success: true });
    }

  } catch (err) {
    console.error('[leaderboard] handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
