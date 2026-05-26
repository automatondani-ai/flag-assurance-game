import { kv } from '@vercel/kv';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export type LeaderboardEntry = {
  name: string;
  score: number;
  percentage: number;
  duration: number;
  date: string;
  region: string;
  gameLength: number;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Fetch top 10 by score (descending) from Redis sorted set
    const entries = await kv.zrange('leaderboard', 0, 9, {
      rev: true,
      withScores: true,
    }) as (string | number)[];

    // entries alternates [member, score, member, score, ...]
    const parsed: (LeaderboardEntry & { rank: number })[] = [];
    for (let i = 0; i < entries.length; i += 2) {
      try {
        const raw = entries[i];
        // @vercel/kv may auto-parse JSON objects — handle both string and object
        const entry: LeaderboardEntry =
          typeof raw === 'string' ? JSON.parse(raw) : (raw as unknown as LeaderboardEntry);
        parsed.push({ ...entry, rank: Math.floor(i / 2) + 1 });
      } catch {
        // skip malformed entries
      }
    }
    return res.status(200).json({ leaderboard: parsed });
  }

  if (req.method === 'POST') {
    const entry: LeaderboardEntry = req.body;

    // Validate required fields
    if (!entry.name || typeof entry.score !== 'number') {
      return res.status(400).json({ error: 'Invalid entry' });
    }

    // Sanitise name — strip HTML, limit to 30 chars
    entry.name = String(entry.name).replace(/<[^>]*>/g, '').slice(0, 30).trim();
    entry.date = new Date().toISOString();

    // Store in sorted set with score as the sort key.
    // Unique member key = full JSON so each game session is distinct.
    const memberKey = JSON.stringify(entry);
    await kv.zadd('leaderboard', {
      score: entry.score,
      member: memberKey,
    });

    // Keep only top 50 entries to prevent unbounded growth.
    // ZREMRANGEBYRANK removes from lowest rank (0) up to and including rank -51,
    // which retains only the top 50 highest scores.
    await kv.zremrangebyrank('leaderboard', 0, -51);

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
