/**
 * Claude Code replaces any hook systemMessage over 10,000 chars with a
 * persisted-output stub, so the render has to fit the whole message. The naive
 * accounting — "count the characters the renderer emits" — undercounts, because
 * the caller wraps the render in a card that adds a background SGR pair to every
 * line, and chalk rewrites some of the renderer's own resets while doing it.
 *
 * A BudgetSpec lets the caller declare that overhead so the renderer can charge
 * for it before choosing a width, instead of discovering it after the fact. It
 * is deliberately a plain data object: this package must not depend on the
 * hooks repo that supplies the numbers.
 */
export interface BudgetSpec {
  /** Total characters available for the whole image block. */
  total: number;
  /** Constant characters the wrapper adds per emitted row. */
  perRow?: number;
  /** Characters the wrapper adds once, outside the rows. */
  overhead?: number;
  /**
   * Extra characters per exact `\x1b[49m` in the content. chalk implements
   * nesting by replacing a style's close sequence with its open sequence, so
   * every bare background reset the renderer emits inside a chalk-styled card
   * is rewritten to the card's (much longer) background-open sequence.
   */
  bgResetSurcharge?: number;
}

/** Standalone default: the renderer's own output is all there is to pay for. */
export const DEFAULT_BUDGET: BudgetSpec = { total: 9200 };

export const BG_RESET = '\x1b[49m';

export function normalizeBudget(budget: number | BudgetSpec | undefined): BudgetSpec {
  if (budget === undefined) return DEFAULT_BUDGET;
  return typeof budget === 'number' ? { total: budget } : budget;
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let at = haystack.indexOf(needle);
  while (at !== -1) {
    count++;
    at = haystack.indexOf(needle, at + needle.length);
  }
  return count;
}

/** What `lines` will actually cost once the caller's wrapper is applied. */
export function costOf(lines: readonly string[], spec: BudgetSpec): number {
  const perRow = spec.perRow ?? 0;
  const surcharge = spec.bgResetSurcharge ?? 0;
  let total = spec.overhead ?? 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    total += line.length + perRow;
    if (i > 0) total += 1; // the newline joining it to the previous line
    if (surcharge) total += countOccurrences(line, BG_RESET) * surcharge;
  }
  return total;
}

/**
 * The row-independent part of the budget. The renderer knows its row count
 * before it emits anything, so it can subtract the wrapper's per-row cost up
 * front and search against what is genuinely left.
 */
export function budgetForRows(spec: BudgetSpec, rows: number): number {
  return spec.total - (spec.overhead ?? 0) - (spec.perRow ?? 0) * rows;
}
