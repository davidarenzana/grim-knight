import { sanitizeName, type HighScore } from '@core/rules/highscores'

/**
 * `localStorage`-backed persistence for the UI store (audio preference + the
 * high-score table). Every accessor is guarded for the node test env (where
 * `localStorage` is absent) and tolerant of corrupt/garbage data, so the store
 * never throws on read/write. Storage is user-writable, so persisted data is
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

/** Is this a structurally valid persisted entry? Guards against corrupt JSON. */
const isHighScore = (v: unknown): v is HighScore => {
  const e = v as Partial<HighScore>
  return (
    !!e &&
    typeof e.name === 'string' &&
    typeof e.score === 'number' &&
    Number.isFinite(e.score) &&
    typeof e.level === 'number' &&
    typeof e.loop === 'number'
  )
}

/** Read the persisted high-score table (sorted, capped). Tolerant of garbage. */
export const loadScores = (): HighScore[] => {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(SCORES_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return (
      parsed
        .filter(isHighScore)
        // Re-sanitize the persisted name (defense-in-depth: storage is user-writable).
        .map((e) => ({ ...e, name: sanitizeName(e.name) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
    )
  } catch {
    return []
  }
}

export const saveScores = (scores: HighScore[]): void => {
  try {
    if (typeof localStorage !== 'undefined')
      localStorage.setItem(SCORES_KEY, JSON.stringify(scores))
  } catch {
    /* ignore (private mode / no storage) */
  }
}
