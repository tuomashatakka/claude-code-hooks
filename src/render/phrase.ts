import chalk, { type ColorName } from 'chalk';
import { stripAnsi } from './primitives.ts';

chalk.level = 3;

// Markov-ish phrase generator. Tokens chain via weighted transitions.
// Output is a wrapped multi-line block mixing cursive + sparkles + kaomoji
// + verb fragments themed by event/tone.

export type PhraseEvent =
  | 'start' | 'wakeup' | 'stop' | 'bye' | 'compact' | 'agent' | 'idle'
  | (string & {});

export type PhraseTone = 'happy' | 'soft' | 'wired' | 'sleepy' | 'mysterious';

export interface PhraseContext {
  event: PhraseEvent;
  word: string;            // the literal heading word, used for the cursive token
  color?: ColorName;       // accent color for cursive + sparkles
  tone?: PhraseTone;
  width?: number;          // wrap width in display cols (default 60)
  minTokens?: number;      // soft floor; default 6
  maxTokens?: number;      // hard ceiling; default 14
}

// ── Vocabularies ─────────────────────────────────────────────────────────────

const SPARKLES = [
  '✧','⋆','✩','✮','❀','♡','✦','✰','✿','❁',
  '⋆｡°✩','ੈ✩‧₊˚','☆','°˖✧','୨୧','˚₊‧꒰ა','ʚɞ','✧˖°','꒰ঌ','໒꒱',
] as const;

const KAOMOJI: Record<PhraseTone, readonly string[]> = {
  happy:      ['(˃ᆺ˂)','(ノ◕ヮ◕)ノ*:･ﾟ✧','≽^•⩊•^≼','(>‿◠)✌','(づ｡◕‿‿◕｡)づ','(✿◠‿◠)','٩(◕‿◕)۶','( ˙꒳​˙ )','(„• ֊ •„)'],
  soft:       ['^~^','(*ˊᗜˋ)','(´｡• ᵕ •｡`)','(◕‿◕)','(˘･ᴗ･˘)','( ˘ ³˘)','(´◡`)'],
  wired:      ['(⊙_☉)','٩(ఠ益ఠ)۶','(ﾟдﾟ；)','(≖_≖)','(⊙ω⊙)','(ʘᗩʘ\')','щ(ಠ_ಠщ)'],
  sleepy:     ['(´∩｡• ᵕ •｡∩`)','(ᴗ˳ᴗ)','(￣ρ￣)..zzZZ','(´-ω-｀)','(︶｡︶✽)','(zᴥz)'],
  mysterious: ['(¬_¬)','(°_°)','(╥_╥)','...','(￢_￢)','(⊙﹏⊙)','(¯ ¯٥)'],
};

const TONES = ['~','~~','~~~','!','!!','!!!','...','..','?!','??','...?'] as const;

const SUBJECTS_BY_EVENT: Partial<Record<PhraseEvent, readonly string[]>> = {
  start:   ['bestie','my queen','the lore','context','engines','vibe check','session','squad','tokens'],
  wakeup:  ['the buffers','the cache','memory','context','our lil session','the lore'],
  stop:    ['the day','the diff','this turn','the lore','tokens','context'],
  bye:     ['u','the chat','the convo','the squad','this little world'],
  compact: ['the tokens','the lore','the context','old logs','the heap','session weight'],
  agent:   ['lil helper','the subroutine','agent loop','the side quest','helper bot'],
  idle:    ['the void','the timeline','silence','vibes only'],
};

const OPENERS_BY_EVENT: Partial<Record<PhraseEvent, readonly string[]>> = {
  start:   ['kyaa','haii','rise n shine','ohaiyo','wakey wakey','omg yay','engines on','hewwo','konnichiwa','a wild session appears'],
  wakeup:  ['mooorning','oof yawn','huh? wha?','okie eyes open','blinking irl','stretch.exe'],
  stop:    ['mouu','okie bye','bedtime','powering down','gn bestie','time to log off','ciao'],
  bye:     ['bye bye','sayonara','mata ne','cya','love u','take care','smol farewell'],
  compact: ['squeezing','condensing','cleaning house','tidying up','context diet','marie kondo mode','tokens trimmed'],
  agent:   ['lil helper','subroutine summoned','agent loop done','helper helped','side quest cleared'],
  idle:    ['vibing','just chilling','thinking real hard','daydreaming'],
};

const VERBS_BY_EVENT: Partial<Record<PhraseEvent, readonly string[]>> = {
  start:   ['the session is loading','context loaded n cooked','we are so back','engines firing rn','loading the lore','everything mounted','tokens are flowing'],
  wakeup:  ['back from the void','stretching the buffers','memory restored bestie','context resumed','rebooting the vibes','reloading lore'],
  stop:    ["that's a wrap",'context yeet\'d','logs sealed','goodnight world','powering down','signing off','session closed'],
  bye:     ['session terminated cutely','closing the tab','back to lurking','i\'ll miss u','curtain falls','window closing'],
  compact: ['tokens trimmed','history smashed','lore squished','cache purged','old turns gone','memory tightened','heap shrunk'],
  agent:   ['side quest complete','subagent did its thing','background work shipped','helper returned'],
  idle:    ['nothing to do','just here','watching the cursor blink'],
};

const CONNECTORS = ['n','&','+','rn','tho','tbh','ngl','lowkey','highkey','&&'] as const;

// ── State machine ────────────────────────────────────────────────────────────

type State = 'start' | 'sparkle' | 'opener' | 'verb' | 'subject' | 'kaomoji' | 'tone' | 'cursive' | 'connector' | 'end';

interface Edge { to: State; weight: number }

const TRANSITIONS: Record<State, Edge[]> = {
  start:     [{ to:'sparkle',weight:3 }, { to:'opener',weight:5 }, { to:'kaomoji',weight:2 }, { to:'cursive',weight:1 }],
  sparkle:   [{ to:'opener',weight:4 }, { to:'cursive',weight:3 }, { to:'verb',weight:2 }, { to:'kaomoji',weight:2 }, { to:'end',weight:1 }],
  opener:    [{ to:'verb',weight:5 }, { to:'cursive',weight:3 }, { to:'kaomoji',weight:2 }, { to:'tone',weight:2 }, { to:'connector',weight:1 }],
  verb:      [{ to:'subject',weight:3 }, { to:'kaomoji',weight:4 }, { to:'tone',weight:3 }, { to:'cursive',weight:2 }, { to:'connector',weight:2 }],
  subject:   [{ to:'kaomoji',weight:4 }, { to:'tone',weight:3 }, { to:'sparkle',weight:2 }, { to:'end',weight:2 }, { to:'connector',weight:1 }],
  kaomoji:   [{ to:'sparkle',weight:3 }, { to:'tone',weight:2 }, { to:'opener',weight:1 }, { to:'cursive',weight:1 }, { to:'end',weight:4 }],
  tone:      [{ to:'sparkle',weight:4 }, { to:'kaomoji',weight:3 }, { to:'subject',weight:2 }, { to:'verb',weight:1 }, { to:'end',weight:3 }],
  cursive:   [{ to:'sparkle',weight:4 }, { to:'subject',weight:2 }, { to:'kaomoji',weight:3 }, { to:'tone',weight:2 }, { to:'verb',weight:1 }, { to:'end',weight:2 }],
  connector: [{ to:'opener',weight:3 }, { to:'verb',weight:4 }, { to:'subject',weight:2 }, { to:'kaomoji',weight:1 }],
  end:       [],
};

// ── Random helpers ───────────────────────────────────────────────────────────

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function pickOr<T>(arr: readonly T[] | undefined, fallback: readonly T[]): T {
  const src = arr && arr.length ? arr : fallback;
  return pick(src);
}

function weightedNext(edges: Edge[], excluded: Set<State>): State {
  const usable = edges.filter(e => !excluded.has(e.to));
  if (!usable.length) return 'end';
  const total = usable.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of usable) {
    r -= e.weight;
    if (r <= 0) return e.to;
  }
  return usable[usable.length - 1]!.to;
}

// ── Cursive translation (subset of Mathematical Script Italic) ───────────────

const CURSIVE_MAP: Record<string, string> = {
  a:'𝒶',b:'𝒷',c:'𝒸',d:'𝒹',e:'ℯ',f:'𝒻',g:'ℊ',h:'𝒽',i:'𝒾',
  j:'𝒿',k:'𝓀',l:'𝓁',m:'𝓂',n:'𝓃',o:'ℴ',p:'𝓅',q:'𝓆',r:'𝓇',
  s:'𝓈',t:'𝓉',u:'𝓊',v:'𝓋',w:'𝓌',x:'𝓍',y:'𝓎',z:'𝓏',
  A:'𝒜',B:'ℬ',C:'𝒞',D:'𝒟',E:'ℰ',F:'ℱ',G:'𝒢',H:'ℋ',I:'ℐ',
  J:'𝒥',K:'𝒦',L:'ℒ',M:'ℳ',N:'𝒩',O:'𝒪',P:'𝒫',Q:'𝒬',R:'ℛ',
  S:'𝒮',T:'𝒯',U:'𝒰',V:'𝒱',W:'𝒲',X:'𝒳',Y:'𝒴',Z:'𝒵',' ':' ',
};

export function toCursive(text: string): string {
  return text.split('').map(c => CURSIVE_MAP[c] ?? c).join('');
}

// ── Token emission ───────────────────────────────────────────────────────────

interface Emitted {
  tokens: string[]; // already colored
  rawTokens: string[]; // for length calc / dedup
}

function emitToken(state: State, ctx: Required<Pick<PhraseContext, 'event' | 'word' | 'color' | 'tone'>>): { raw: string; rendered: string } | null {
  const accent = (chalk[ctx.color] ?? chalk.cyan) as (s: string) => string;
  switch (state) {
    case 'sparkle': {
      const s = pick(SPARKLES);
      return { raw: s, rendered: accent(s) };
    }
    case 'opener': {
      const s = pickOr(OPENERS_BY_EVENT[ctx.event], OPENERS_BY_EVENT.idle!);
      return { raw: s, rendered: chalk.magenta(s) };
    }
    case 'verb': {
      const s = pickOr(VERBS_BY_EVENT[ctx.event], VERBS_BY_EVENT.idle!);
      return { raw: s, rendered: chalk.gray(s) };
    }
    case 'subject': {
      const s = pickOr(SUBJECTS_BY_EVENT[ctx.event], SUBJECTS_BY_EVENT.idle!);
      return { raw: s, rendered: chalk.gray.italic(s) };
    }
    case 'kaomoji': {
      const s = pick(KAOMOJI[ctx.tone]);
      return { raw: s, rendered: chalk.magenta(s) };
    }
    case 'tone': {
      const s = pick(TONES);
      return { raw: s, rendered: chalk.gray(s) };
    }
    case 'connector': {
      const s = pick(CONNECTORS);
      return { raw: s, rendered: chalk.gray(s) };
    }
    case 'cursive': {
      const lower = ctx.word.toLowerCase();
      const cur = toCursive(lower);
      return { raw: lower, rendered: chalk.italic(accent(cur)) };
    }
    case 'start':
    case 'end':
      return null;
  }
}

// ── Word-wrap that respects ANSI codes ───────────────────────────────────────

function wrapTokens(tokens: string[], width: number): string {
  const lines: string[] = [];
  let line = '';
  let lineLen = 0;

  for (const t of tokens) {
    const tLen = stripAnsi(t).length;
    const sep  = line ? 1 : 0;
    if (lineLen + sep + tLen > width && line) {
      lines.push(line);
      line = t;
      lineLen = tLen;
    } else {
      line = line ? line + ' ' + t : t;
      lineLen += sep + tLen;
    }
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

// ── Public API ───────────────────────────────────────────────────────────────

function inferTone(event: PhraseEvent): PhraseTone {
  switch (event) {
    case 'start':
    case 'wakeup':
    case 'agent':
      return 'happy';
    case 'stop':
    case 'bye':
      return 'sleepy';
    case 'compact':
      return 'soft';
    case 'idle':
      return 'soft';
    default:
      return 'happy';
  }
}

export function generatePhrase(ctx: PhraseContext): string {
  const fullCtx = {
    event: ctx.event,
    word: ctx.word,
    color: ctx.color ?? 'cyan',
    tone: ctx.tone ?? inferTone(ctx.event),
  } as const;
  const width      = ctx.width ?? 60;
  const minTokens  = ctx.minTokens ?? 6;
  const maxTokens  = ctx.maxTokens ?? 14;

  const rendered: string[] = [];
  const seen = new Set<State>();
  let state: State = 'start';
  let cursiveEmitted = false;

  for (let i = 0; i < maxTokens; i++) {
    // Force cursive insertion before end-of-walk if we haven't emitted it.
    let next = weightedNext(TRANSITIONS[state], new Set());
    if (next === 'end') {
      if (!cursiveEmitted) {
        next = 'cursive';
      } else if (i < minTokens) {
        // Reroute back through more variety.
        next = weightedNext(TRANSITIONS.sparkle, new Set(['end']));
      } else {
        break;
      }
    }
    // Avoid back-to-back duplicates of the same state for variety.
    if (next === state && next !== 'cursive') {
      next = weightedNext(TRANSITIONS[state], new Set([next]));
      if (next === 'end' && !cursiveEmitted) next = 'cursive';
    }
    if (next === 'cursive' && cursiveEmitted) {
      next = weightedNext(TRANSITIONS.cursive, new Set(['cursive']));
      if (next === 'end' && i < minTokens) next = 'sparkle';
    }

    state = next;
    if (state === 'end') break;
    if (state === 'cursive') cursiveEmitted = true;
    seen.add(state);

    const tok = emitToken(state, fullCtx);
    if (tok) rendered.push(tok.rendered);
  }

  if (!cursiveEmitted) {
    const tok = emitToken('cursive', fullCtx)!;
    rendered.splice(Math.floor(rendered.length / 2), 0, tok.rendered);
  }

  return wrapTokens(rendered, width);
}

// Convenience: a one-shot mood-tagged filler used by other parts of the codebase.
export function shortFiller(event: PhraseEvent = 'idle'): string {
  return generatePhrase({ event, word: event, minTokens: 3, maxTokens: 5, width: 40 });
}
