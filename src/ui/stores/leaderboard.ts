import { normalizeTable, type HighScore } from '@core/rules/highscores'
import { saveCachedScores } from './persistence'

/**
 * Client for the online leaderboard. Talks to the same-origin Vercel Function at
 * `/api/scores` (allowed by the CSP `connect-src 'self'`), which is the source of
 * truth for high scores. Every response is re-validated through the pure core
 * (`normalizeTable`) and written through to the offline cache, so the board can
 * still render the last-seen table when the network is down.
 */
const ENDPOINT = '/api/scores'

/** A run being submitted to the leaderboard (ranking is decided server-side). */
export interface ScoreSubmission {
  readonly name: string
  readonly score: number
  readonly level: number
  readonly loop: number
}

/**
 * Fetch the global top-ten. Throws on network/HTTP failure so the caller can
 * surface an error state and fall back to `loadCachedScores()`.
 */
export async function fetchScores(): Promise<HighScore[]> {
  const res = await fetch(ENDPOINT, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`GET ${ENDPOINT} -> ${res.status}`)
  const table = normalizeTable((await res.json()) as unknown)
  saveCachedScores(table)
  return table
}

/**
 * Submit a run. Returns the authoritative table plus the 0-based rank of the new
 * row (or -1 if it did not make the top ten). Throws on network/HTTP failure.
 */
export async function postScore(
  entry: ScoreSubmission,
): Promise<{ table: HighScore[]; rank: number }> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(entry),
  })
  if (!res.ok) throw new Error(`POST ${ENDPOINT} -> ${res.status}`)
  const data = (await res.json()) as { table?: unknown; rank?: unknown }
  return {
    table: normalizeTable(data.table),
    rank: typeof data.rank === 'number' ? data.rank : -1,
  }
}
