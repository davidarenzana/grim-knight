import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The real serverless handler is exercised here (not a mocked `fetch`): a unit
// test that stubbed the network shipped a production crash once because the
// function itself was never loaded or run. We mock only the Upstash client and
// fake the Vercel req/res, so every branch of the handler's own logic runs.
const { redisMock } = vi.hoisted(() => ({
  redisMock: { get: vi.fn(), set: vi.fn() },
}))
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => redisMock),
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
const call = async (method: string, body?: unknown): Promise<FakeRes> => {
  const res = mockRes()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await handler({ method, body } as any, res as any)
  return res
}

const sample: HighScore[] = [
  { name: 'AAA', score: 5000, level: 3, loop: 1 },
  { name: 'BBB', score: 1000, level: 1, loop: 1 },
]

describe('api/scores handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // The 502 path logs the cause for the Vercel runtime logs; keep test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    process.env.KV_REST_API_URL = 'https://stub.upstash.io'
    process.env.KV_REST_API_TOKEN = 'stub-token'
    redisMock.get.mockResolvedValue(null)
    redisMock.set.mockResolvedValue('OK')
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
      // Hand it out of order to prove the handler normalizes via the pure core.
      redisMock.get.mockResolvedValue([sample[1], sample[0]])
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

    it('returns 502 with a detail (not an opaque crash) on a storage error', async () => {
      redisMock.get.mockRejectedValue(new Error('WRONGPASS invalid auth token'))
      const res = await call('GET')
      expect(res.statusCode).toBe(502)
      expect(res.body).toMatchObject({
        error: 'leaderboard storage unavailable',
        detail: expect.stringContaining('WRONGPASS'),
      })
    })
  })

  describe('POST', () => {
    it('validates, inserts, persists and returns { table, rank }', async () => {
      redisMock.get.mockResolvedValue([])
      const res = await call('POST', { name: 'ZED', score: 4200, level: 2, loop: 1 })
      expect(res.statusCode).toBe(200)
      expect(res.body).toMatchObject({ rank: 0 })
      const table = (res.body as { table: HighScore[] }).table
      expect(table[0]).toEqual({ name: 'ZED', score: 4200, level: 2, loop: 1 })
      // It persisted the NEW table (not the stale one) under the single key.
      expect(redisMock.set).toHaveBeenCalledTimes(1)
      expect(redisMock.set.mock.calls[0]?.[1]).toEqual(table)
    })

    it('rejects an invalid submission with 400 and never writes', async () => {
      const res = await call('POST', { name: 'ZED', score: -5, level: 1, loop: 1 })
      expect(res.statusCode).toBe(400)
      expect(redisMock.set).not.toHaveBeenCalled()
    })

    it('returns 503 when the store is not configured', async () => {
      delete process.env.KV_REST_API_URL
      delete process.env.KV_REST_API_TOKEN
      const res = await call('POST', { name: 'ZED', score: 10, level: 1, loop: 1 })
      expect(res.statusCode).toBe(503)
    })

    it('returns 502 when persisting fails', async () => {
      redisMock.get.mockResolvedValue([])
      redisMock.set.mockRejectedValue(new Error('upstash down'))
      const res = await call('POST', { name: 'ZED', score: 10, level: 1, loop: 1 })
      expect(res.statusCode).toBe(502)
    })
  })

  it('rejects unsupported methods with 405 and an Allow header', async () => {
    const res = await call('DELETE')
    expect(res.statusCode).toBe(405)
    expect(res.headers['Allow']).toBe('GET, POST')
  })
})
