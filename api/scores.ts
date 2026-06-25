import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import {
  insertScore,
  normalizeTable,
  parseSubmission,
  type HighScore,
} from '../src/core/rules/highscores'

/**
 * Online leaderboard endpoint (Vercel Function + Upstash Redis).
 *
 * The whole top-ten lives under ONE key as a JSON value, so each request is at
 * most 1 GET + 1 SET — microscopic against the Upstash free tier. All table math
 * (validate, insert, cap, sort) reuses the pure core in
 * `src/core/rules/highscores.ts`, so the rules are identical on client and
 * server and there is no duplicated logic. The store is user-writable, so every
 * field is re-validated here (`parseSubmission`) — never trust the client.
 *
 *   GET  /api/scores  -> HighScore[] (top 10, descending)
 *   POST /api/scores  -> { table, rank }  body: { name, score, level, loop }
 */
const KEY = 'grim:highscores'

/** Build a Redis client from whatever env the integration injected, or null. */
function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? new Redis({ url, token }) : null
}

async function readTable(redis: Redis): Promise<HighScore[]> {
  // @upstash/redis auto-deserializes JSON values; normalizeTable tolerates junk.
  const raw: unknown = await redis.get(KEY)
  return normalizeTable(raw)
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store')
  const redis = getRedis()

  try {
    if (req.method === 'GET') {
      // Degrade to an empty board if the store isn't wired up yet, so the game
      // still loads before the Upstash integration is connected.
      const table = redis ? await readTable(redis) : []
      res.status(200).json(table)
      return
    }

    if (req.method === 'POST') {
      if (!redis) {
        res.status(503).json({ error: 'leaderboard storage not configured' })
        return
      }
      const entry = parseSubmission(req.body)
      if (!entry) {
        res.status(400).json({ error: 'invalid score submission' })
        return
      }
      const current = await readTable(redis)
      const { table, rank } = insertScore(current, entry)
      await redis.set(KEY, table)
      res.status(200).json({ table, rank })
      return
    }

    res.setHeader('Allow', 'GET, POST')
    res.status(405).json({ error: 'method not allowed' })
  } catch (err) {
    // A storage failure (bad/expired credentials, deleted DB, Upstash outage)
    // must not crash the function with an opaque FUNCTION_INVOCATION_FAILED.
    // Log the real cause for the Vercel runtime logs and return a clear,
    // debuggable JSON error so the client can show an honest error state.
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[api/scores] storage error:', detail)
    res.status(502).json({ error: 'leaderboard storage unavailable', detail })
  }
}
