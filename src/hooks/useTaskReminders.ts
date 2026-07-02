import { useContext, useEffect, useRef } from "react";
import { UserContext } from "../contexts/UserContext";
import type { Task } from "../types/user";
import { partitionReminders, reminderKey, showLocalNotification } from "../utils";

const NOTIFIED_STORAGE_KEY = "reminderNotifiedKeys";

function loadNotified(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function persistNotified(keys: Set<string>): void {
  try {
    localStorage.setItem(NOTIFIED_STORAGE_KEY, JSON.stringify([...keys]));
  } catch {
    /* ignore quota / disabled storage */
  }
}

function notifyTask(task: Task): void {
  void showLocalNotification(task.name, {
    body: task.description?.trim() || "Task deadline reached.",
    tag: `reminder-${task.id}`,
    data: { url: "/", taskId: task.id },
  });
}

function notifyOverdueSummary(count: number): void {
  void showLocalNotification(`${count} tasks overdue`, {
    body: "Open the app to review your overdue tasks.",
    tag: "reminder-overdue-summary",
    data: { url: "/" },
  });
}

/**
 * Schedules local notifications for task deadlines while the app is open.
 *
 * - Fires a notification when a task's deadline is reached.
 * - On mount and whenever the app becomes visible, catches up on deadlines that
 *   passed while the app was backgrounded (one notification for a single overdue
 *   task, a summary for several).
 * - Deduplicates via a persisted set of `taskId:deadline` keys so a reminder isn't
 *   repeated; changing a deadline re-arms it.
 *
 * No server push: this only runs while a tab/PWA window is alive.
 */
export function useTaskReminders(): void {
  const { user } = useContext(UserContext);
  const enabled = user.settings.enableReminders;
  const tasks = user.tasks;
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const clearTimers = () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
    };

    if (typeof Notification === "undefined" || !enabled || Notification.permission !== "granted") {
      clearTimers();
      return;
    }

    const run = () => {
      clearTimers();

      const notified = loadNotified();
      const { overdue, schedule } = partitionReminders(tasks, Date.now(), notified);

      // Catch up on deadlines missed while the app was closed/backgrounded.
      if (overdue.length === 1) {
        notifyTask(overdue[0]);
      } else if (overdue.length > 1) {
        notifyOverdueSummary(overdue.length);
      }
      overdue.forEach((task) => {
        const key = reminderKey(task);
        if (key) notified.add(key);
      });

      // Schedule upcoming deadlines.
      for (const { task, delay } of schedule) {
        const timerId = window.setTimeout(() => {
          notifyTask(task);
          const current = loadNotified();
          const key = reminderKey(task);
          if (key) {
            current.add(key);
            persistNotified(current);
          }
        }, delay);
        timersRef.current.push(timerId);
      }

      // Drop keys for tasks that no longer exist so storage stays bounded.
      const liveIds = new Set<string>(tasks.map((task) => task.id));
      for (const key of [...notified]) {
        if (!liveIds.has(key.split(":")[0])) notified.delete(key);
      }
      persistNotified(notified);
    };

    run();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearTimers();
    };
  }, [enabled, tasks]);
}
