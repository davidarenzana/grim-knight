import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HighScore } from '@core/rules/highscores'
import { fetchScores, postScore } from './leaderboard'

// Exercises the leaderboard HTTP client directly (the contract with `/api/scores`):
// response parsing, re-validation through the pure core, and error propagation.
// `fetch` is stubbed at the boundary; everything inside the client runs for real.
describe('leaderboard client', () => {
  const ok = (data: unknown): Response =>
    ({ ok: true, status: 200, json: async () => data }) as Response
  const fail = (status: number): Response =>
    ({ ok: false, status, json: async () => ({}) }) as Response

  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  const unsorted: HighScore[] = [
    { name: 'LOW', score: 100, level: 1, loop: 1 },
    { name: 'TOP', score: 9000, level: 5, loop: 2 },
  ]

  describe('fetchScores', () => {
    it('GETs /api/scores and returns a validated, descending table', async () => {
      fetchMock.mockResolvedValue(ok(unsorted))
      const table = await fetchScores()
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/scores',
        expect.objectContaining({ headers: expect.any(Object) }),
      )
      expect(table.map((s) => s.name)).toEqual(['TOP', 'LOW'])
    })

    it('throws on a non-OK HTTP status (so the caller can show an error state)', async () => {
      fetchMock.mockResolvedValue(fail(502))
      await expect(fetchScores()).rejects.toThrow(/502/)
    })

    it('tolerates a garbage body without throwing (normalized to [])', async () => {
      fetchMock.mockResolvedValue(ok({ not: 'an array' }))
      await expect(fetchScores()).resolves.toEqual([])
    })
  })

  describe('postScore', () => {
    const entry = { name: 'ZED', score: 4200, level: 2, loop: 1 }

    it('POSTs the entry as JSON and returns the authoritative table + rank', async () => {
      fetchMock.mockResolvedValue(ok({ table: unsorted, rank: 1 }))
      const { table, rank } = await postScore(entry)
      const init = (fetchMock.mock.calls[0]?.[1] ?? {}) as RequestInit
      expect(init.method).toBe('POST')
      expect(JSON.parse(String(init.body))).toEqual(entry)
      expect(table.map((s) => s.name)).toEqual(['TOP', 'LOW'])
      expect(rank).toBe(1)
    })

    it('defaults rank to -1 and table to [] when the response is malformed', async () => {
      fetchMock.mockResolvedValue(ok({ table: 'nope', rank: 'nope' }))
      const { table, rank } = await postScore(entry)
      expect(table).toEqual([])
      expect(rank).toBe(-1)
    })

    it('throws on a non-OK HTTP status', async () => {
      fetchMock.mockResolvedValue(fail(400))
      await expect(postScore(entry)).rejects.toThrow(/400/)
    })
  })
})
