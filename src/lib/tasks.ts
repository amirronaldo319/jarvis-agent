import type { Task } from "./types";

export type TaskFilter = "today" | "upcoming" | "overdue" | "completed" | "all";

export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function filterTasks(tasks: Task[], filter: TaskFilter, query: string, today: string): Task[] {
  const q = query.trim().toLowerCase();
  return tasks
    .filter((t) => !q || t.title.toLowerCase().includes(q))
    .filter((t) => {
      switch (filter) {
        case "completed": return t.done;
        case "all": return true;
        case "today": return !t.done && t.due === today;
        case "upcoming": return !t.done && !!t.due && t.due > today;
        case "overdue": return !t.done && !!t.due && t.due < today;
      }
    });
}
