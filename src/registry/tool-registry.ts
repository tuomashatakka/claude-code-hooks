import type { BadgeColor, ToolName } from '../types/claude-code.ts';
import type { RawToolInput, RawToolResult, ToolInputUnion } from '../types/tool-io.ts';
import type { Badge } from '../tui/index.ts';

export interface RenderedSection {
  lines: string[];
  extraBadges?: Badge[];
  isJson?: boolean;
}

export interface ToolContext {
  toolName: ToolName;
}

export type ToolMatcher =
  | ToolName
  | ToolName[]
  | ((rawName: string) => boolean);

export interface ToolDefinition<TInput = ToolInputUnion, TResult = RawToolResult> {
  matches: ToolMatcher;
  post: (input: TInput, result: TResult, durationMs: number | null, ctx: ToolContext) => RenderedSection;
  icon?: string;
  color?: BadgeColor;
}

const REGISTRY: ToolDefinition<any, any>[] = [];
let GENERIC: ToolDefinition<any, any> | null = null;

export function defineTool<TInput = ToolInputUnion, TResult = RawToolResult>(
  def: ToolDefinition<TInput, TResult>
): void {
  REGISTRY.push(def as ToolDefinition<any, any>);
}

export function defineGenericTool<TInput = RawToolInput, TResult = RawToolResult>(
  def: Omit<ToolDefinition<TInput, TResult>, 'matches'>
): void {
  GENERIC = { matches: () => true, ...def } as ToolDefinition<any, any>;
}

/**
 * Every registered strategy, generic fallback last. Used by the showcase
 * capture to prove each one is demonstrated on the page — identity comparison
 * against what `getToolDefinition` returns, so no strategy needs an id.
 */
export function listToolDefinitions(): ToolDefinition[] {
  return [...REGISTRY, ...(GENERIC ? [GENERIC] : [])];
}

function matches(matcher: ToolMatcher, rawName: string): boolean {
  if (typeof matcher === 'function') return matcher(rawName);
  if (Array.isArray(matcher)) return matcher.includes(rawName);
  return matcher === rawName;
}

export function getToolDefinition(rawName: string): ToolDefinition {
  for (const def of REGISTRY) {
    if (matches(def.matches, rawName)) return def;
  }
  if (GENERIC) return GENERIC;
  throw new Error(`No tool strategy registered (and no generic fallback) for ${rawName}`);
}
