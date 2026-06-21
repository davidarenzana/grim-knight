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

/** Default initials when none are provided. */
const DEFAULT_NAME = 'AAA'
const NAME_LEN = 3

/**
 * Coerce raw input into exactly three `[A-Z ]` characters: uppercase, drop
 * anything that is not A-Z, then pad short names with spaces / truncate long
 * ones. Empty or fully-invalid input falls back to `AAA`. Never throws.
 */
export const sanitizeName = (raw: string): string => {
  const letters = (raw ?? '').toUpperCase().replace(/[^A-Z]/g, '')
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
