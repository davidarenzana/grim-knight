import type { Effect, GameNotification } from './types'

/** Wrap a UI notification as a presentation effect (the output port carries it). */
export const notify = (notification: GameNotification): Effect => ({ type: 'notify', notification })

/** Format a 0xRRGGBB number as a `#rrggbb` CSS color string (for float labels). */
export const hexColor = (n: number): string => `#${n.toString(16).padStart(6, '0')}`
