import { compactAnsi, truncateChars } from '../ansi/text.ts'

/**
 * The one knob every elastic renderer turns.
 *
 *  - `lines` caps every collapsible body (stdout, file previews, metadata).
 *  - `chars` is the room a picture may spend on itself.
 *
 * A renderer is a pure function of its inputs and a `Limit`; making a message
 * fit is then a search over `Limit`, not a pass that mutilates the finished
 * string. That is the whole difference from the transport this replaces, which
 * stripped colour to buy room and shipped monochrome cards whenever a command
 * printed a lot.
 */
export interface Limit {
  readonly lines: number;
  readonly chars: number;
}

export type Render = (limit: Limit) => string

/** Past this a body is a dump, not a preview, whatever the budget says. */
export const MAX_LINES = 4000

export const unlimited = (chars: number): Limit => ({ lines: MAX_LINES, chars })

/** A limit for one of `count` siblings that share the same room. */
export const share = (limit: Limit, count: number): Limit =>
  ({ lines: limit.lines, chars: Math.floor(limit.chars / Math.max(1, count)) })

/** A limit with `chars` already spent on something fixed beside the elastic part. */
export const reserve = (limit: Limit, chars: number): Limit =>
  ({ lines: limit.lines, chars: Math.max(0, limit.chars - chars) })

export const constant = (text: string): Render => () => text

export interface Fitted {

  /** The largest render that fits `budget`, or a colour-preserving hard cut. */
  text: string;

  /** The render at full size — what the user would have seen with no limit. */
  full: string;

  /** Whether `text` is smaller than `full`. */
  shrunk: boolean;
}

/**
 * Finds the largest `Limit` at which `render` fits in `budget` characters.
 *
 * Cost is monotone in the limit — fewer lines and a smaller picture never
 * make a message longer — so a binary search over one scale factor is exact.
 * Should even the empty limit overflow (one enormous unbreakable line), the
 * text is cut by characters with its escapes intact rather than stripped.
 *
 * Every candidate is measured — and shipped — in its compacted form: the SGR
 * stream re-encoded with one sequence per style change, since that is what
 * the host counts against the limit.
 */
export function fit (render: Render | string, budget: number): Fitted {
  const draw = typeof render === 'string'
    ? constant(compactAnsi(render))
    : (limit: Limit): string => compactAnsi(render(limit))
  const full = draw(unlimited(budget))
  if (full.length <= budget)
    return { text: full, full, shrunk: false }

  const at = (scale: number): Limit => ({
    lines: Math.round(MAX_LINES * scale),
    chars: Math.floor(budget * scale),
  })

  let low  = 0
  let high = 1
  let best = typeof render === 'string' ? full : draw(at(0))
  for (let step = 0; step < 14 && typeof render !== 'string'; step++) {
    const mid       = (low + high) / 2
    const candidate = draw(at(mid))
    if (candidate.length <= budget) {
      best = candidate
      low = mid
    }
    else
      high = mid
  }

  const text = best.length <= budget ? best : truncateChars(best, budget)
  return { text, full, shrunk: true }
}
