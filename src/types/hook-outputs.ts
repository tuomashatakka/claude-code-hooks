import type { HookEventName } from './hook-events.ts'


export interface BaseHookOutput {
  continue?:       boolean;
  systemMessage?:  string;
  suppressOutput?: boolean;
  stopReason?:     string;
}

export interface PostToolUseHookSpecific {
  hookEventName:      'PostToolUse';
  additionalContext?: string;
}

export interface PostToolUseFailureHookSpecific {
  hookEventName:      'PostToolUseFailure';
  additionalContext?: string;
}

export interface SessionStartHookSpecific {
  hookEventName:      'SessionStart';
  additionalContext?: string;
}

export interface InstructionsLoadedHookSpecific {
  hookEventName: 'InstructionsLoaded';
}

export interface GenericHookSpecific {
  hookEventName: HookEventName;
  [k: string]:   unknown;
}

export type HookSpecificOutput<E extends HookEventName> =
  E extends 'PostToolUse' ? PostToolUseHookSpecific
  : E extends 'PostToolUseFailure' ? PostToolUseFailureHookSpecific
  : E extends 'SessionStart' ? SessionStartHookSpecific
  : E extends 'InstructionsLoaded' ? InstructionsLoadedHookSpecific
  : GenericHookSpecific

export interface HookOutput<E extends HookEventName> extends BaseHookOutput {
  hookSpecificOutput?: HookSpecificOutput<E>;
}
