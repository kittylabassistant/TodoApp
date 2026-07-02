import { describe, expect, it } from "vitest";
import type { Task, UUID } from "../../types/user";
import { MAX_TIMEOUT_MS, partitionReminders, reminderKey } from "../reminderUtils";

const NOW = 1_700_000_000_000; // fixed reference time

const makeTask = (overrides: Partial<Task> & { id: string }): Task => {
  const { id, ...rest } = overrides;
  return {
    done: false,
    pinned: false,
    name: "Task",
    color: "#000000",
    date: new Date(NOW),
    ...rest,
    id: id as UUID,
  };
};

describe("reminderKey", () => {
  it("combines id and deadline timestamp", () => {
    const deadline = new Date(NOW + 1000);
    const key = reminderKey(makeTask({ id: "11111111-1111-1111-1111-111111111111", deadline }));
    expect(key).toBe(`11111111-1111-1111-1111-111111111111:${NOW + 1000}`);
  });

  it("returns null without a deadline", () => {
    expect(reminderKey(makeTask({ id: "11111111-1111-1111-1111-111111111111" }))).toBeNull();
  });

  it("returns null for an invalid deadline", () => {
    const key = reminderKey(
      makeTask({ id: "11111111-1111-1111-1111-111111111111", deadline: new Date("nope") }),
    );
    expect(key).toBeNull();
  });

  it("changes when the deadline changes", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    const a = reminderKey(makeTask({ id, deadline: new Date(NOW + 1000) }));
    const b = reminderKey(makeTask({ id, deadline: new Date(NOW + 2000) }));
    expect(a).not.toBe(b);
  });
});

describe("partitionReminders", () => {
  const empty = new Set<string>();

  it("marks a passed deadline as overdue", () => {
    const task = makeTask({
      id: "11111111-1111-1111-1111-111111111111",
      deadline: new Date(NOW - 1),
    });
    const { overdue, schedule } = partitionReminders([task], NOW, empty);
    expect(overdue).toEqual([task]);
    expect(schedule).toEqual([]);
  });

  it("schedules a future deadline with the correct delay", () => {
    const task = makeTask({
      id: "22222222-2222-2222-2222-222222222222",
      deadline: new Date(NOW + 5000),
    });
    const { overdue, schedule } = partitionReminders([task], NOW, empty);
    expect(overdue).toEqual([]);
    expect(schedule).toEqual([{ task, delay: 5000 }]);
  });

  it("excludes done tasks", () => {
    const task = makeTask({
      id: "33333333-3333-3333-3333-333333333333",
      deadline: new Date(NOW - 1),
      done: true,
    });
    const { overdue, schedule } = partitionReminders([task], NOW, empty);
    expect(overdue).toEqual([]);
    expect(schedule).toEqual([]);
  });

  it("excludes tasks without a deadline", () => {
    const task = makeTask({ id: "44444444-4444-4444-4444-444444444444" });
    const { overdue, schedule } = partitionReminders([task], NOW, empty);
    expect(overdue).toEqual([]);
    expect(schedule).toEqual([]);
  });

  it("excludes already-notified tasks", () => {
    const id = "55555555-5555-5555-5555-555555555555";
    const task = makeTask({ id, deadline: new Date(NOW - 1) });
    const notified = new Set<string>([reminderKey(task) as string]);
    const { overdue } = partitionReminders([task], NOW, notified);
    expect(overdue).toEqual([]);
  });

  it("skips deadlines beyond the setTimeout ceiling", () => {
    const task = makeTask({
      id: "66666666-6666-6666-6666-666666666666",
      deadline: new Date(NOW + MAX_TIMEOUT_MS + 1000),
    });
    const { overdue, schedule } = partitionReminders([task], NOW, empty);
    expect(overdue).toEqual([]);
    expect(schedule).toEqual([]);
  });

  it("handles a mix of tasks", () => {
    const overdueTask = makeTask({
      id: "aaaaaaaa-0000-0000-0000-000000000000",
      deadline: new Date(NOW - 10),
    });
    const futureTask = makeTask({
      id: "bbbbbbbb-0000-0000-0000-000000000000",
      deadline: new Date(NOW + 3000),
    });
    const doneTask = makeTask({
      id: "cccccccc-0000-0000-0000-000000000000",
      deadline: new Date(NOW - 10),
      done: true,
    });
    const noDeadline = makeTask({ id: "dddddddd-0000-0000-0000-000000000000" });

    const { overdue, schedule } = partitionReminders(
      [overdueTask, futureTask, doneTask, noDeadline],
      NOW,
      empty,
    );

    expect(overdue).toEqual([overdueTask]);
    expect(schedule).toEqual([{ task: futureTask, delay: 3000 }]);
  });
});
