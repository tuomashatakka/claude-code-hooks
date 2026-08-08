import chalk from 'chalk';
import { renderCheckboxHeading } from '@tuomashatakka/ansi-headings';
import { Badge, renderBadges } from '../render/badge.ts';
import type { RawToolInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

export interface TaskView {
  id?: string | number;
  subject: string;
  description?: string;
  status: string;
}

type TaskColor = 'blue' | 'green' | 'yellow' | 'red' | 'cyan' | 'gray';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(record: Record<string, unknown> | null, ...keys: string[]): string | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

export function normalizeStatus(value: unknown, fallback = 'pending'): string {
  const normalized = String(value ?? fallback).trim().toLowerCase().replace(/-/g, '_');
  return normalized || fallback;
}

export function normalizeTask(
  value: unknown,
  fallback: RawToolInput = {},
  fallbackStatus = 'pending',
): TaskView | null {
  const task = asRecord(value);
  const subject = text(task, 'subject', 'title', 'name')
    ?? text(fallback, 'subject', 'title', 'name');
  if (!subject) return null;
  const id = task?.id ?? task?.taskId ?? fallback.id ?? fallback.task_id;
  const description = text(task, 'description', 'details')
    ?? text(fallback, 'description', 'details');
  const status = normalizeStatus(
    task?.status ?? fallback.status,
    fallbackStatus,
  );
  return {
    ...(typeof id === 'string' || typeof id === 'number' ? { id } : {}),
    subject,
    ...(description ? { description } : {}),
    status,
  };
}

export function taskFromResult(
  input: RawToolInput,
  result: RawToolResult,
  fallbackStatus: string,
): TaskView | null {
  const record = asRecord(result);
  const nested = record?.task ?? record?.item ?? result;
  return normalizeTask(nested, input, fallbackStatus);
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed || (!trimmed.startsWith('[') && !trimmed.startsWith('{'))) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

export function tasksFromResult(result: RawToolResult): TaskView[] {
  let candidate: unknown = parseMaybeJson(result);
  const record = asRecord(candidate);
  if (record) {
    candidate = parseMaybeJson(
      record.tasks ?? record.items ?? record.result ?? record.output ?? record.content,
    );
  }
  if (!Array.isArray(candidate)) return [];
  return candidate
    .map(item => normalizeTask(item))
    .filter((task): task is TaskView => task !== null);
}

export function taskAppearance(status: string): {
  caption: string;
  checked: boolean;
  color: TaskColor;
} {
  switch (normalizeStatus(status)) {
    case 'completed':
      return { caption: 'TASK COMPLETED', checked: true, color: 'green' };
    case 'in_progress':
      return { caption: 'TASK STARTED', checked: false, color: 'yellow' };
    case 'blocked':
      return { caption: 'TASK BLOCKED', checked: false, color: 'red' };
    case 'cancelled':
    case 'canceled':
      return { caption: 'TASK CANCELLED', checked: false, color: 'gray' };
    case 'pending':
    case 'todo':
      return { caption: 'TASK QUEUED', checked: false, color: 'cyan' };
    default:
      return { caption: 'TASK UPDATED', checked: false, color: 'blue' };
  }
}

export function renderTask(task: TaskView, captionOverride?: string): string[] {
  const appearance = taskAppearance(task.status);
  const caption = captionOverride ?? appearance.caption;
  const heading = renderCheckboxHeading({
    caption,
    checked: appearance.checked,
    color: appearance.color,
    description: task.description,
  });
  const subjectLabel = task.id == null ? task.subject : `#${task.id}  ${task.subject}`;
  return [
    ...heading.split('\n'),
    '',
    renderBadges(new Badge({ label: subjectLabel, color: appearance.color })),
  ];
}
