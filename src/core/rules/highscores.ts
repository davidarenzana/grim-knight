/**
 * High score table: the ten best runs, each tagged with three-letter initials.
 * Pure core: immutable, deterministic, no DOM / storage / random.
 * Persistence (localStorage) and the entry-screen flow live in the UI adapter.
 */
export interface HighScore {
  /** Three uppercase A-Z chars (spaces allowed as padding). See `sanitizeName`. */
  readonly name: string
  readonly score: number
  /** Stage (1-based) reached when the run ended — metadata, not used for ordering. */
  readonly level: number
  /** Quest loop reached — metadata, not used for ordering. */
  readonly loop: number
}

/** Classic arcade top-ten. */
export const MAX_ENTRIES = 10

/**
 * Sane upper bound for a single run's score. Far above any legitimate run; its
 * only job is to reject obviously forged submissions to the online leaderboard
 * (the table is writable by any client, so the server re-validates every field).
 */
export const MAX_SCORE = 100_000_000

/** Default initials when none are provided. */
const DEFAULT_NAME = 'AAA'
const NAME_LEN = 3

/**
 * Coerce raw input into exactly three `[A-Z ]` characters: uppercase, drop
 * anything that is not A-Z, then pad short names with spaces / truncate long
 * ones. Empty or fully-invalid input falls back to `AAA`. Never throws.
 */
export const sanitizeName = (raw: string): string => {
  // Cap the raw length BEFORE processing: only the first 3 letters survive, so a
  // huge untrusted string (an online submission) must never cost CPU to upper-case.
  const letters = (raw ?? '')
    .slice(0, 64)
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
  if (letters.length === 0) return DEFAULT_NAME
  return letters.slice(0, NAME_LEN).padEnd(NAME_LEN, ' ')
}

/**
 * Would `score` land in the top ten? True if there is room (fewer than
 * `MAX_ENTRIES`) or it beats the current lowest entry.
 */
export const qualifies = (tableArg: readonly HighScore[], score: number): boolean => {
  if (tableArg.length < MAX_ENTRIES) return true
  const lowest = tableArg[tableArg.length - 1]
  return lowest === undefined || score > lowest.score
}

/**
 * Insert `candidate` into a sorted-descending table, keeping it capped at
 * `MAX_ENTRIES`. Insertion is stable: on a tie, existing entries keep the
 * higher rank. Returns the new table and the 0-based rank of the inserted
 * entry, or the unchanged table and rank -1 if it did not qualify.
 */
export const insertScore = (
  tableArg: readonly HighScore[],
  candidate: HighScore,
): { table: HighScore[]; rank: number } => {
  if (!qualifies(tableArg, candidate.score)) {
    return { table: [...tableArg], rank: -1 }
  }
  // First slot whose score is strictly lower — stable on ties.
  let rank = tableArg.findIndex((e) => candidate.score > e.score)
  if (rank === -1) rank = tableArg.length
  const next = [...tableArg.slice(0, rank), candidate, ...tableArg.slice(rank)]
  return { table: next.slice(0, MAX_ENTRIES), rank }
}

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max

/**
 * Validate an untrusted leaderboard submission (a parsed request body) into a
 * clean `HighScore`, or `null` if it is malformed/forged. Pure: the online
 * endpoint runs this server-side before inserting, so a hand-crafted POST with a
 * NaN/negative/absurd score, a non-integer level/loop or a junk name is rejected
 * or coerced rather than trusted. `name` is always sanitized to 3 `[A-Z ]` chars.
 */
export const parseSubmission = (body: unknown): HighScore | null => {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  if (!isInt(b.score, 0, MAX_SCORE)) return null
  if (!isInt(b.level, 1, 99)) return null
  if (!isInt(b.loop, 1, 9999)) return null
  return {
    name: sanitizeName(typeof b.name === 'string' ? b.name : ''),
    score: b.score,
    level: b.level,
    loop: b.loop,
  }
}

/**
 * Normalize an untrusted array of entries (e.g. parsed from storage or the
 * network) into a clean, sorted, capped table: drop malformed rows, re-sanitize
 * names, sort descending and keep the top `MAX_ENTRIES`. Never throws.
 */
export const normalizeTable = (value: unknown): HighScore[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => parseSubmission(v))
    .filter((e): e is HighScore => e !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ENTRIES)
}
