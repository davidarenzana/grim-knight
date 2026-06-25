import { normalizeTable, type HighScore } from '@core/rules/highscores'

/**
 * `localStorage`-backed persistence for the UI store. It holds the audio
 * preference plus an OFFLINE CACHE of the high-score table — the source of truth
 * for scores is now the online leaderboard (`leaderboard.ts` → `/api/scores`),
 * and this cache only lets the board still render the last-seen table when the
 * network is unavailable. Every accessor is guarded for the node test env (where
 * `localStorage` is absent) and tolerant of corrupt/garbage data, so the store
 * never throws on read/write. Storage is user-writable, so cached data is
 * re-validated on load (defense-in-depth).
 */

const AUDIO_KEY = 'grim:audio'

/** Read the persisted audio preference (default ON). Guarded for the node test env. */
export const loadAudioPref = (): boolean => {
  try {
    return typeof localStorage === 'undefined' || localStorage.getItem(AUDIO_KEY) !== 'off'
  } catch {
    return true
  }
}

export const saveAudioPref = (on: boolean): void => {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(AUDIO_KEY, on ? 'on' : 'off')
  } catch {
    /* ignore (private mode / no storage) */
  }
}

const SCORES_KEY = 'grim:highscores'

/** Read the cached high-score table (validated, sorted, capped). Tolerant of garbage. */
export const loadCachedScores = (): HighScore[] => {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(SCORES_KEY)
    if (!raw) return []
    // normalizeTable (pure core) re-validates and sanitizes every entry.
    return normalizeTable(JSON.parse(raw) as unknown)
  } catch {
    return []
  }
}

/** Write-through the last table fetched from the leaderboard, for offline reads. */
export const saveCachedScores = (scores: HighScore[]): void => {
  try {
    if (typeof localStorage !== 'undefined')
      localStorage.setItem(SCORES_KEY, JSON.stringify(scores))
  } catch {
    /* ignore (private mode / no storage) */
  }
}
