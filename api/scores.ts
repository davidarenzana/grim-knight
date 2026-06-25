import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import {
  insertScore,
  normalizeTable,
  parseSubmission,
  type HighScore,
} from '../src/core/rules/highscores.js'

/**
 * Online leaderboard endpoint (Vercel Function + Upstash Redis).
 *
 * The whole top-ten lives under ONE key as a JSON value, so each request is at
 * most 1 GET + 1 SET — microscopic against the Upstash free tier. All table math
 * (validate, insert, cap, sort) reuses the pure core in
 * `src/core/rules/highscores.ts`, so the rules are identical on client and
 * server and there is no duplicated logic.
 *
 * The endpoint is anonymous and client-writable, so it is hardened in depth:
 *   1. per-IP rate limiting (caps floods / Upstash-quota abuse),
 *   2. a same-origin check on writes (blocks other sites' browser JS),
 *   3. strict server-side re-validation of every field (`parseSubmission`) —
 *      never trust the client; SQL/NoSQL/command injection is impossible because
 *      the Redis key is a constant and values are stored as JSON.
 * None of this authenticates the player: a hand-crafted POST with a plausible
 * score can still forge an entry (accepted for an arcade demo — see ADR 0008).
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

// Shared across warm invocations so a blocked IP short-circuits in memory
// without a Redis round-trip while the burst lasts.
const rlCache = new Map<string, number>()

/** Per-IP limiter: 20 requests / 10 s — invisible to a real player, harsh on a flood. */
function getRatelimit(redis: Redis): Ratelimit {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '10 s'),
    ephemeralCache: rlCache,
    prefix: 'grim:rl',
  })
}

/** Best-effort client IP from the proxy headers Vercel sets. */
function clientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for']
  const raw = Array.isArray(fwd) ? fwd[0] : fwd
  return raw?.split(',')[0]?.trim() || 'unknown'
}

/**
 * Defense-in-depth same-origin check for writes: reject a POST whose Origin (or
 * Referer) is a DIFFERENT host than the one serving the function — this blocks
 * another website's browser JS from writing through a visitor. It is NOT a wall:
 * a non-browser client can omit or spoof these headers, so it pairs with the
 * rate limiter and server-side re-validation. Absent headers are allowed (some
 * privacy setups strip Referer) so we never reject a legitimate player.
 */
function crossSite(req: VercelRequest): boolean {
  const host = req.headers.host
  if (!host) return false
  const hostOf = (u?: string): string | null => {
    if (!u) return null
    try {
      return new URL(u).host
    } catch {
      return null
    }
  }
  const origin = hostOf(req.headers.origin)
  if (origin) return origin !== host
  const referer = hostOf(req.headers.referer)
  if (referer) return referer !== host
  return false
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
    // Throttle every request by IP (a read flood burns the quota too). Only
    // possible once the store is wired up; the unconfigured path degrades below.
    if (redis) {
      const { success, reset } = await getRatelimit(redis).limit(clientIp(req))
      if (!success) {
        res.setHeader('Retry-After', String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))))
        res.status(429).json({ error: 'rate limit exceeded' })
        return
      }
    }

    if (req.method === 'GET') {
      // Degrade to an empty board if the store isn't wired up yet, so the game
      // still loads before the Upstash integration is connected.
      const table = redis ? await readTable(redis) : []
      res.status(200).json(table)
      return
    }

    if (req.method === 'POST') {
      if (crossSite(req)) {
        res.status(403).json({ error: 'cross-site request rejected' })
        return
      }
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
    // must not crash the function with an opaque FUNCTION_INVOCATION_FAILED. Log
    // the real cause for the Vercel runtime logs, but return a GENERIC message so
    // internal error strings are never leaked to the client.
    console.error('[api/scores] storage error:', err instanceof Error ? err.message : String(err))
    res.status(502).json({ error: 'leaderboard storage unavailable' })
  }
}
