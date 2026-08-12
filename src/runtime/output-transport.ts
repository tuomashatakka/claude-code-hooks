import { stripAnsi } from '../render/primitives.ts';
import { renderOutputLimit } from '../tui/index.ts';

export const CLEAR_LINE_PREFIX = '\x1b[1A\x1b[2K\r';

/**
 * Claude Code weighs each hook output string on its own. `systemMessage`,
 * `additionalContext`, `initialUserMessage` and plain stdout all pass through
 * one guard — `if (value.length <= 1e4) return value` — and anything longer is
 * written to a file and replaced with a preview and the path to it.
 *
 * Two things follow from *where* that check sits, and getting either wrong is
 * what used to cost this transport most of its room:
 *
 *  - the unit is UTF-16 code units of the **parsed** string, not bytes of the
 *    serialized JSON. An ESC counts once, where `JSON.stringify` spends six
 *    bytes writing `\u001b`; four fifths of a rendered card is escape
 *    sequences, so weighing the encoded form overcharged the content by
 *    something close to a factor of five and shrank every picture to match.
 *  - the fields do not share a budget. `additionalContext` is checked
 *    separately, so a long system prompt travelling in the same response
 *    takes nothing away from the message rendered beside it.
 *
 * `String.length` is that same metric exactly — not an approximation of it —
 * so everything downstream measures with it and nothing converts.
 */
export const HOOK_FIELD_CHAR_LIMIT = 10_000;

/**
 * Held back from the limit. It covers `CLEAR_LINE_PREFIX`, and the possibility
 * that some future field is folded into the same string, at a cost of about two
 * rows of a picture — cheap next to the alternative, which is a message
 * replaced wholesale by a file path.
 */
const SAFETY_MARGIN = 200;

/** Characters one hook output string may spend. */
export const HOOK_RESPONSE_CHAR_BUDGET = HOOK_FIELD_CHAR_LIMIT - SAFETY_MARGIN;

interface HookResponse {
  systemMessage?: string;
  [key: string]: unknown;
}

export interface SerializedHookResponse {
  json: string;
  systemMessage: string | null;
}

interface LimitedCandidate {
  text: string;
  retained: number;
}

function responseWithMessage(data: HookResponse, systemMessage: string): HookResponse {
  return { ...data, systemMessage: CLEAR_LINE_PREFIX + systemMessage };
}

/** What Claude Code will charge this message, in the unit it charges it in. */
export function messageCost(systemMessage: string): number {
  return CLEAR_LINE_PREFIX.length + systemMessage.length;
}

function fits(systemMessage: string): boolean {
  return messageCost(systemMessage) <= HOOK_RESPONSE_CHAR_BUDGET;
}

/**
 * Characters a response may still add to its `systemMessage` before
 * `serializeHookResponse` starts omitting lines from it.
 *
 * A hook that renders something elastic — art sized to whatever is left — needs
 * this *before* it renders. The whole response is taken rather than the message
 * alone because that is what the caller has in hand, but only `systemMessage`
 * is weighed: every other field carries its own separate limit.
 */
export function systemMessageHeadroom(data: HookResponse): number {
  const current = typeof data.systemMessage === 'string' ? data.systemMessage : '';
  return Math.max(0, HOOK_RESPONSE_CHAR_BUDGET - messageCost(current));
}

function findLargestCandidate(
  maximum: number,
  render: (retained: number) => string,
  accepts: (candidate: string) => boolean,
): LimitedCandidate {
  let low = 0;
  let high = maximum;
  let best: LimitedCandidate = { text: render(0), retained: 0 };

  while (low <= high) {
    const retained = Math.floor((low + high) / 2);
    const text = render(retained);
    if (accepts(text)) {
      best = { text, retained };
      low = retained + 1;
    } else {
      high = retained - 1;
    }
  }

  return best;
}

function splitRetained(total: number): { head: number; tail: number } {
  const head = Math.ceil(total * 0.6);
  return { head, tail: total - head };
}

function limitByLines(systemMessage: string): LimitedCandidate {
  const lines = systemMessage.split('\n');
  return findLargestCandidate(
    Math.max(0, lines.length - 1),
    retained => {
      const { head, tail } = splitRetained(retained);
      return [
        ...lines.slice(0, head),
        renderOutputLimit({ omitted: lines.length - retained, unit: 'lines' }),
        ...(tail > 0 ? lines.slice(-tail) : []),
      ].join('\n');
    },
    fits,
  );
}

function limitByCharacters(systemMessage: string): string {
  const characters = Array.from(stripAnsi(systemMessage));
  return findLargestCandidate(
    Math.max(0, characters.length - 1),
    retained => {
      const { head, tail } = splitRetained(retained);
      return [
        characters.slice(0, head).join(''),
        renderOutputLimit({ omitted: characters.length - retained, unit: 'characters' }),
        tail > 0 ? characters.slice(-tail).join('') : '',
      ].filter(Boolean).join('\n');
    },
    fits,
  ).text;
}

function limitSystemMessage(systemMessage: string): string {
  const lineCandidate = limitByLines(systemMessage);
  return lineCandidate.retained > 0
    ? lineCandidate.text
    : limitByCharacters(systemMessage);
}

export function serializeHookResponse(data: HookResponse): SerializedHookResponse {
  const systemMessage = typeof data.systemMessage === 'string' && data.systemMessage.length > 0
    ? data.systemMessage
    : null;

  const message = systemMessage && !fits(systemMessage)
    ? limitSystemMessage(systemMessage)
    : systemMessage;

  const output = message === null ? { ...data } : responseWithMessage(data, message);

  return {
    json: JSON.stringify(output, null, 2),
    systemMessage: typeof output.systemMessage === 'string' ? output.systemMessage : null,
  };
}
