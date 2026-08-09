import { stripAnsi } from '../render/primitives.ts';
import { renderOutputLimit } from '../tui/index.ts';

export const CLEAR_LINE_PREFIX = '\x1b[1A\x1b[2K\r';

/**
 * Claude Code caps hook output strings at 10,000 characters. Keeping the JSON
 * envelope below this byte budget also accounts for ANSI escapes expanding
 * during JSON serialization.
 */
export const HOOK_RESPONSE_BYTE_BUDGET = 9_000;

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

function serialize(data: HookResponse): string {
  return JSON.stringify(data, null, 2);
}

function responseWithMessage(data: HookResponse, systemMessage: string): HookResponse {
  return { ...data, systemMessage: CLEAR_LINE_PREFIX + systemMessage };
}

function fitsResponse(data: HookResponse, systemMessage: string): boolean {
  return Buffer.byteLength(serialize(responseWithMessage(data, systemMessage)), 'utf8')
    <= HOOK_RESPONSE_BYTE_BUDGET;
}

/**
 * Bytes a response may still add to its `systemMessage` before
 * `serializeHookResponse` starts omitting lines from it.
 *
 * A hook that renders something elastic — art sized to whatever is left — needs
 * this *before* it renders, and it has to be measured on the serialized form:
 * JSON spends six bytes on every escape the renderer counted as one, and the
 * rest of the response (`additionalContext` above all) is competing for the
 * same budget. Pass the response with everything else already filled in.
 */
export function systemMessageHeadroom(data: HookResponse): number {
  const current = typeof data.systemMessage === 'string' ? data.systemMessage : '';
  const spent = Buffer.byteLength(serialize(responseWithMessage(data, current)), 'utf8');
  return Math.max(0, HOOK_RESPONSE_BYTE_BUDGET - spent);
}

function findLargestCandidate(
  maximum: number,
  render: (retained: number) => string,
  fits: (candidate: string) => boolean,
): LimitedCandidate {
  let low = 0;
  let high = maximum;
  let best: LimitedCandidate = { text: render(0), retained: 0 };

  while (low <= high) {
    const retained = Math.floor((low + high) / 2);
    const text = render(retained);
    if (fits(text)) {
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

function limitByLines(data: HookResponse, systemMessage: string): LimitedCandidate {
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
    candidate => fitsResponse(data, candidate),
  );
}

function limitByCharacters(data: HookResponse, systemMessage: string): string {
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
    candidate => fitsResponse(data, candidate),
  ).text;
}

function limitSystemMessage(data: HookResponse, systemMessage: string): string {
  const lineCandidate = limitByLines(data, systemMessage);
  return lineCandidate.retained > 0
    ? lineCandidate.text
    : limitByCharacters(data, systemMessage);
}

export function serializeHookResponse(data: HookResponse): SerializedHookResponse {
  const systemMessage = typeof data.systemMessage === 'string' && data.systemMessage.length > 0
    ? data.systemMessage
    : null;
  let output = systemMessage ? responseWithMessage(data, systemMessage) : { ...data };
  let json = serialize(output);

  if (systemMessage && Buffer.byteLength(json, 'utf8') > HOOK_RESPONSE_BYTE_BUDGET) {
    output = responseWithMessage(data, limitSystemMessage(data, systemMessage));
    json = serialize(output);
  }

  return {
    json,
    systemMessage: typeof output.systemMessage === 'string' ? output.systemMessage : null,
  };
}
