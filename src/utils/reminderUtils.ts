import type { Task } from "../types/user";

/**
 * Maximum delay `setTimeout` can handle (~24.8 days). Deadlines further out than
 * this are skipped and re-evaluated the next time tasks change or the app opens.
 */
export const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Stable dedup key for a task reminder. Includes the deadline timestamp so that
 * changing a task's deadline produces a new key and re-triggers a reminder.
 * Returns null when the task has no valid deadline.
 */
export function reminderKey(task: Pick<Task, "id" | "deadline">): string | null {
  if (!task.deadline) return null;
  const ms = new Date(task.deadline).getTime();
  if (Number.isNaN(ms)) return null;
  return `${task.id}:${ms}`;
}

export interface ScheduledReminder {
  task: Task;
  /** Milliseconds from `now` until the deadline. */
  delay: number;
}

export interface ReminderPartition {
  /** Not-done tasks whose deadline already passed and haven't been notified yet. */
  overdue: Task[];
  /** Not-done tasks whose deadline is within the schedulable window. */
  schedule: ScheduledReminder[];
}

/**
 * Splits tasks into reminders to fire immediately (overdue catch-up) and reminders
 * to schedule with a timer. Pure — takes `now` and the set of already-notified keys
 * so it can be unit-tested without timers or globals.
 */
export function partitionReminders(
  tasks: Task[],
  now: number,
  notified: ReadonlySet<string>,
): ReminderPartition {
  const overdue: Task[] = [];
  const schedule: ScheduledReminder[] = [];

  for (const task of tasks) {
    if (task.done || !task.deadline) continue;

    const key = reminderKey(task);
    if (!key || notified.has(key)) continue;

    const deadlineMs = new Date(task.deadline).getTime();
    const delay = deadlineMs - now;

    if (delay <= 0) {
      overdue.push(task);
    } else if (delay <= MAX_TIMEOUT_MS) {
      schedule.push({ task, delay });
    }
    // delay > MAX_TIMEOUT_MS: too far away to schedule now — handled on a later run
  }

  return { overdue, schedule };
}
