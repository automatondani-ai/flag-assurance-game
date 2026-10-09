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
import { createHash, randomUUID } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { NORMALISED_COUNTRY_MAP } from './countries.js';

// ── Environment validation (cold-start guard) ─────────────────────────────────
if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
  throw new Error(
    'Missing required environment variables: KV_REST_API_URL, KV_REST_API_TOKEN',
  );
}

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// ── CORS origin whitelist ──────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://flag-explorers.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

// ── Redis keys ────────────────────────────────────────────────────────────────
const LEADERBOARD_KEY = 'flag:leaderboard';
// Hash: player key (name + region) → that player's leaderboard row, so each player
// keeps a single row per region holding their best score.
const BEST_KEY = 'flag:leaderboard:best';
// GET reads this many rows to find the top 10 different players.
const GET_WINDOW = 100;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip HTML tags and dangerous characters from user-supplied strings. */
function sanitise(s: string): string {
  return String(s)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"'`]/g, '')
    .trim();
}

/**
 * Leaderboard identity: the same name (ignoring case and spacing) in the same region
 * counts as one player, e.g. "crystal|africa".
 */
function playerKey(name: string, region: string): string {
  // Not normaliseAnswer: names keep accents and a leading "the", and existing
  // keys in flag:leaderboard:best were made this way.
  const norm = (s: string) => s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
  return `${norm(name)}|${norm(region)}`;
}

/**
 * The stored sorted-set member for an entry. @upstash/redis parses JSON members on
 * read; re-serialising gives back the exact string that JSON.stringify stored.
 */
function toMember(raw: unknown): string {
  return typeof raw === 'string' ? raw : JSON.stringify(raw);
}

/** Attach security headers to every response. */
function setSecurityHeaders(res: VercelResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

// ── Answer rule ───────────────────────────────────────────────────────────────
// Keep this block identical in api/leaderboard.ts and src/utils/gameUtils.ts:
// the server and client can't import each other, and the score the player sees
// must be the score the leaderboard stores.

/** A country's accepted spellings (name and aliases), normalised. */
type AnswerForms = { key: string; forms: string[] };

/**
 * Lower-case without accents ("São Tomé" → "sao tome"), straight apostrophes,
 * "&" read as "and", single spaces, and no leading "the" ("The Gambia").
 */
function normaliseAnswer(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/&/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^the /, '');
}

/**
 * Most typos allowed: none for short forms of up to 3 letters (so "u" isn't
 * "US"), 1 for names of up to 7 letters, 2 for longer ones.
 */
function allowedEdits(length: number): number {
  return length <= 3 ? 0 : length <= 7 ? 1 : 2;
}

/**
 * Edit distance where swapping two neighbouring letters counts as one edit
 * (optimal string alignment), so "nigeira" is one typo away from "nigeria".
 */
function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * Right when the answer is within the allowed typos of one of the target's
 * spellings and no other country's spelling is closer ("Iraq" is not a typo of
 * "Iran"). Ties count as right. Also returns the closest country's key.
 */
function judgeAnswer(
  input: string,
  targetKey: string,
  countries: AnswerForms[],
): { correct: boolean; closestKey: string | null } {
  const answer = normaliseAnswer(input);
  if (answer.length === 0 || answer.length > 45) return { correct: false, closestKey: null };

  let targetDist = Infinity;
  let targetLength = 0;
  let bestDist = Infinity;
  let bestKey: string | null = null;
  for (const country of countries) {
    for (const form of country.forms) {
      // Over 2 edits never decides anything: 2 is the most typos ever allowed.
      if (Math.abs(form.length - answer.length) > 2) continue;
      const dist = editDistance(answer, form);
      if (country.key === targetKey && dist < targetDist) {
        targetDist = dist;
        targetLength = form.length;
      }
      if (dist < bestDist) {
        bestDist = dist;
        bestKey = country.key;
      }
    }
  }
  const correct = targetDist <= allowedEdits(targetLength) && targetDist <= bestDist;
  return { correct, closestKey: correct ? targetKey : bestKey };
}

// ── End of answer rule ────────────────────────────────────────────────────────

/** Every country's accepted spellings, keyed by country code. */
const ANSWER_FORMS: AnswerForms[] = [...NORMALISED_COUNTRY_MAP.values()].map(c => ({
  key:   c.code,
  forms: [c.normName, ...c.normAliases].map(normaliseAnswer),
}));

/**
 * Timing validation: reject submissions that are impossibly fast.
 * Bots and script-kiddies tend to POST instantly; humans need real time per question.
 */
const MIN_SECONDS_PER_ANSWER = 2;
const MIN_TOTAL_SECONDS      = 10;

function validateTiming(duration: number, gameLength: number): boolean {
  if (duration < MIN_TOTAL_SECONDS) return false;
  if (gameLength > 0 && duration < gameLength * MIN_SECONDS_PER_ANSWER) return false;
  return true;
}

/** SHA-256 fingerprint of a submission for replay-attack detection. */
function createSubmissionHash(body: Record<string, unknown>): string {
  const payload = JSON.stringify({
    name:       body.name,
    answers:    body.answers,
    gameLength: body.gameLength,
    duration:   body.duration,
    region:     body.region,
  });
  return createHash('sha256').update(payload).digest('hex');
}

// ── Name validation ───────────────────────────────────────────────────────────

const RESERVED_NAMES = new Set([
  'admin', 'administrator', 'moderator', 'mod', 'system',
  'null', 'undefined', 'anonymous', 'bot', 'server',
]);

const PROFANITY_LIST = [
  'fuck', 'shit', 'bitch', 'cunt', 'nigger', 'nigga', 'faggot',
];

function validateName(name: string): { valid: boolean; reason?: string } {
  const lower = name.toLowerCase();
  if (RESERVED_NAMES.has(lower)) {
    return { valid: false, reason: 'reserved name' };
  }
  if (PROFANITY_LIST.some(p => lower.includes(p))) {
    return { valid: false, reason: 'inappropriate name' };
  }
  // Reject invisible / directional control characters used in homoglyph attacks
  if (/[​-‍﻿‪-‮⁦-⁩]/.test(name)) {
    return { valid: false, reason: 'invalid characters' };
  }
  return { valid: true };
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
    // ── GET — top 10, one row per player and region ─────────────────────────
    if (req.method === 'GET') {
      const entries = await redis.zrange(LEADERBOARD_KEY, 0, GET_WINDOW - 1, {
        rev: true,
        withScores: true,
      }) as (string | number)[];

      // entries alternates [member, score, member, score, ...], best first
      const parsed: (LeaderboardEntry & { rank: number })[] = [];
      const seen    = new Set<string>();
      const repeats: string[] = [];
      for (let i = 0; i < entries.length; i += 2) {
        try {
          const raw = entries[i];
          // @upstash/redis may auto-parse JSON objects — handle both
          const entry: LeaderboardEntry =
            typeof raw === 'string' ? JSON.parse(raw) : (raw as unknown as LeaderboardEntry);
          const key = playerKey(entry.name, entry.region);
          if (seen.has(key)) {
            // A lower score by a player already listed for this region.
            repeats.push(toMember(raw));
            continue;
          }
          seen.add(key);
          if (parsed.length < 10) parsed.push({ ...entry, rank: parsed.length + 1 });
        } catch {
          // skip malformed entries silently
        }
      }

      // Remove repeat rows (saved before scores were kept per player) so they stop
      // taking up room in the window.
      if (repeats.length > 0) {
        await redis.zrem(LEADERBOARD_KEY, ...repeats);
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

      // ── Honeypot check (bot trap) ──────────────────────────────────────────
      // Legitimate clients always send honeypot: '' (empty string).
      // Bots that blindly fill all POST fields are silently accepted but not stored.
      if (typeof body.honeypot === 'string' && body.honeypot !== '') {
        return res.status(200).json({ success: true });
      }

      // name: non-empty string, max 100 chars
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

      // ── Timing validation ──────────────────────────────────────────────────
      if (!validateTiming(body.duration as number, body.gameLength as number)) {
        return res.status(400).json({ error: 'Invalid submission: timing' });
      }

      // ── Replay attack prevention ───────────────────────────────────────────
      const hash    = createSubmissionHash(body);
      const hashKey = `submission:${hash}`;
      const exists  = await redis.exists(hashKey);
      if (exists) {
        return res.status(409).json({ error: 'Duplicate submission' });
      }

      // ── Per-answer validation + server-side scoring ────────────────────────
      let score        = 0;
      let correctCount = 0;

      for (const raw of body.answers) {
        if (typeof raw !== 'object' || raw === null) {
          return res.status(400).json({ error: 'Invalid submission: malformed answer' });
        }

        const answer = raw as Record<string, unknown>;

        // countryCode: string, max 4 chars
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
        const country = NORMALISED_COUNTRY_MAP.get(answer.countryCode);
        if (!country) {
          return res.status(400).json({ error: 'Invalid submission: unknown countryCode' });
        }

        // Server recalculates correctness with the same rule the client shows
        const isCorrect = judgeAnswer(answer.playerInput, country.code, ANSWER_FORMS).correct;

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

      // ── Name content validation ────────────────────────────────────────────
      const nameCheck = validateName(name);
      if (!nameCheck.valid) {
        return res.status(400).json({ error: `Invalid submission: ${nameCheck.reason}` });
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

      // Record this submission's hash (TTL 24 h) to block replay attacks.
      await redis.set(hashKey, 1, { ex: 86400 });

      // One row per player and region: store this game only if it beats their best.
      const key        = playerKey(name, region);
      const previous   = await redis.hget<unknown>(BEST_KEY, key);
      const prevMember = previous == null ? null : toMember(previous);
      const prevScore  = prevMember ? await redis.zscore(LEADERBOARD_KEY, prevMember) : null;
      if (prevScore !== null && prevScore >= entry.score) {
        return res.status(200).json({ success: true, best: false });
      }

      // Store in sorted set using server-verified score as the sort key.
      // UUID in entry prevents duplicate-member collisions.
      const memberKey = JSON.stringify(entry);
      await redis.zadd(LEADERBOARD_KEY, { score: entry.score, member: memberKey });
      if (prevMember) await redis.zrem(LEADERBOARD_KEY, prevMember);
      await redis.hset(BEST_KEY, { [key]: memberKey });

      // Keep only top 1000 entries to prevent unbounded growth.
      await redis.zremrangebyrank(LEADERBOARD_KEY, 0, -1001);

      return res.status(200).json({ success: true, best: true });
    }

  } catch (err) {
    console.error('[leaderboard] handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
