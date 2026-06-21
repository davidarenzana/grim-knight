/**
 * Tiny handoff for the level the player picked in the menu. The UI (which owns
 * the level-select screen) sets it before the Phaser game boots; the first
 * `GameScene` reads it on init. Kept as a leaf module so neither the engine nor
 * the UI has to import the other to pass a single number.
 */
let startLevelIndex = 0

/** Set the 0-based level index the next game should begin at. */
export const setStartLevel = (index: number): void => {
  startLevelIndex = Math.max(0, index)
}

/** The level index the next/first GameScene should start at. */
export const consumeStartLevel = (): number => startLevelIndex
