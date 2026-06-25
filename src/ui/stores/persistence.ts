/**
 * `localStorage`-backed persistence for the UI store. It holds ONLY the audio
 * preference — high scores are NOT cached locally: the online leaderboard
 * (`leaderboard.ts` → `/api/scores`) is the single source of truth for the board.
 * The accessors are guarded for the node test env (where `localStorage` is
 * absent) and tolerant of failures, so the store never throws on read/write.
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
