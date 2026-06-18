/**
 * Arcade session: lives, score and high-level state.
 * Pure core: immutable transitions, no side effects.
 */
export type SessionState = 'playing' | 'gameover' | 'won'

export interface Session {
  readonly lives: number
  readonly score: number
  readonly state: SessionState
}

export const STARTING_LIVES = 3

export const createSession = (): Session => ({
  lives: STARTING_LIVES,
  score: 0,
  state: 'playing',
})

export const addScore = (s: Session, points: number): Session =>
  s.state === 'playing' ? { ...s, score: s.score + points } : s

/** Lose one life; running out ends the game. */
export const loseLife = (s: Session): Session => {
  if (s.state !== 'playing') return s
  const lives = Math.max(0, s.lives - 1)
  return { ...s, lives, state: lives <= 0 ? 'gameover' : 'playing' }
}

export const win = (s: Session): Session => (s.state === 'playing' ? { ...s, state: 'won' } : s)
