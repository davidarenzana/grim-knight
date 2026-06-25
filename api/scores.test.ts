import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The real serverless handler is exercised here (not a mocked `fetch`): a unit
// test that stubbed the network shipped a production crash once because the
// function itself was never loaded or run. We mock only the Upstash client and
// rate limiter and fake the Vercel req/res, so every branch of the handler's own
// logic — including the security gates — runs for real.
const { redisMock, rlMock } = vi.hoisted(() => ({
  redisMock: { get: vi.fn(), set: vi.fn() },
  rlMock: { limit: vi.fn() },
}))
vi.mock('@upstash/redis', () => ({ Redis: vi.fn(() => redisMock) }))
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    vi.fn(() => rlMock),
    { slidingWindow: vi.fn(() => ({})) },
  ),
}))

import handler from './scores.js'
import type { HighScore } from '../src/core/rules/highscores.js'

interface FakeRes {
  statusCode: number
  body: unknown
  headers: Record<string, string>
  setHeader: (k: string, v: string) => void
  status: (c: number) => FakeRes
  json: (b: unknown) => FakeRes
}

const mockRes = (): FakeRes => {
  const res = { statusCode: 0, body: undefined as unknown, headers: {} as Record<string, string> }
  return Object.assign(res, {
    setHeader: (k: string, v: string) => {
      res.headers[k] = v
    },
    status(c: number) {
      res.statusCode = c
      return this as FakeRes
    },
    json(b: unknown) {
      res.body = b
      return this as FakeRes
    },
  }) as FakeRes
}

/** Invoke the default handler with a fake Vercel req/res and return the res. */
const call = async (
  method: string,
  opts: { body?: unknown; headers?: Record<string, string> } = {},
): Promise<FakeRes> => {
  const res = mockRes()
  const req = { method, body: opts.body, headers: opts.headers ?? {} }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await handler(req as any, res as any)
  return res
}

const sample: HighScore[] = [
  { name: 'AAA', score: 5000, level: 3, loop: 1 },
  { name: 'BBB', score: 1000, level: 1, loop: 1 },
]
const validRun = { name: 'ZED', score: 4200, level: 2, loop: 1 }

describe('api/scores handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // The 502 path logs the cause for the Vercel runtime logs; keep test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    process.env.KV_REST_API_URL = 'https://stub.upstash.io'
    process.env.KV_REST_API_TOKEN = 'stub-token'
    redisMock.get.mockResolvedValue(null)
    redisMock.set.mockResolvedValue('OK')
    rlMock.limit.mockResolvedValue({ success: true, limit: 20, remaining: 19, reset: 0 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.KV_REST_API_URL
    delete process.env.KV_REST_API_TOKEN
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('sets Cache-Control: no-store on every response', async () => {
    const res = await call('GET')
    expect(res.headers['Cache-Control']).toBe('no-store')
  })

  describe('GET', () => {
    it('returns the stored top-ten, validated and sorted descending', async () => {
      redisMock.get.mockResolvedValue([sample[1], sample[0]]) // out of order on purpose
      const res = await call('GET')
      expect(res.statusCode).toBe(200)
      expect(res.body).toEqual([sample[0], sample[1]])
    })

    it('degrades to an empty board when the store is not configured', async () => {
      delete process.env.KV_REST_API_URL
      delete process.env.KV_REST_API_TOKEN
      const res = await call('GET')
      expect(res.statusCode).toBe(200)
      expect(res.body).toEqual([])
      expect(redisMock.get).not.toHaveBeenCalled()
    })

    it('returns 502 with a GENERIC message (no internal detail) on a storage error', async () => {
      redisMock.get.mockRejectedValue(new Error('WRONGPASS invalid auth token'))
      const res = await call('GET')
      expect(res.statusCode).toBe(502)
      expect(res.body).toEqual({ error: 'leaderboard storage unavailable' })
      // The cause is logged for ops but never returned to the client.
      expect(JSON.stringify(res.body)).not.toContain('WRONGPASS')
    })
  })

  describe('POST', () => {
    it('validates, inserts, persists and returns { table, rank }', async () => {
      redisMock.get.mockResolvedValue([])
      const res = await call('POST', { body: validRun })
      expect(res.statusCode).toBe(200)
      expect(res.body).toMatchObject({ rank: 0 })
      const table = (res.body as { table: HighScore[] }).table
      expect(table[0]).toEqual(validRun)
      expect(redisMock.set).toHaveBeenCalledTimes(1)
      expect(redisMock.set.mock.calls[0]?.[1]).toEqual(table)
    })

    it('rejects an invalid submission with 400 and never writes', async () => {
      const res = await call('POST', { body: { name: 'ZED', score: -5, level: 1, loop: 1 } })
      expect(res.statusCode).toBe(400)
      expect(redisMock.set).not.toHaveBeenCalled()
    })

    it('returns 503 when the store is not configured', async () => {
      delete process.env.KV_REST_API_URL
      delete process.env.KV_REST_API_TOKEN
      const res = await call('POST', { body: validRun })
      expect(res.statusCode).toBe(503)
    })

    it('returns 502 when persisting fails', async () => {
      redisMock.get.mockResolvedValue([])
      redisMock.set.mockRejectedValue(new Error('upstash down'))
      const res = await call('POST', { body: validRun })
      expect(res.statusCode).toBe(502)
    })

    it('accepts a same-origin write (Origin host matches the serving host)', async () => {
      redisMock.get.mockResolvedValue([])
      const res = await call('POST', {
        body: validRun,
        headers: { host: 'grim-knight.vercel.app', origin: 'https://grim-knight.vercel.app' },
      })
      expect(res.statusCode).toBe(200)
    })

    it('rejects a cross-site write by Origin with 403 and never writes', async () => {
      const res = await call('POST', {
        body: validRun,
        headers: { host: 'grim-knight.vercel.app', origin: 'https://evil.example' },
      })
      expect(res.statusCode).toBe(403)
      expect(redisMock.set).not.toHaveBeenCalled()
    })

    it('rejects a cross-site write by Referer when Origin is absent', async () => {
      const res = await call('POST', {
        body: validRun,
        headers: { host: 'grim-knight.vercel.app', referer: 'https://evil.example/x' },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  describe('rate limiting', () => {
    it('returns 429 with a Retry-After header when the limit is exceeded', async () => {
      rlMock.limit.mockResolvedValue({
        success: false,
        limit: 20,
        remaining: 0,
        reset: Date.now() + 5000,
      })
      const res = await call('GET')
      expect(res.statusCode).toBe(429)
      expect(Number(res.headers['Retry-After'])).toBeGreaterThanOrEqual(1)
      expect(redisMock.get).not.toHaveBeenCalled()
    })

    it('is keyed by the forwarded client IP', async () => {
      await call('GET', { headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } })
      expect(rlMock.limit).toHaveBeenCalledWith('203.0.113.7')
    })
  })

  it('rejects unsupported methods with 405 and an Allow header', async () => {
    const res = await call('DELETE')
    expect(res.statusCode).toBe(405)
    expect(res.headers['Allow']).toBe('GET, POST')
  })
})
