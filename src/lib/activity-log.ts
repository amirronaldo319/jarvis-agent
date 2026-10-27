import type { Approval } from "./agent/types";
import type { Run } from "./types";

export interface LogLine { ts: number; time: string; level: "info" | "ok" | "warn" | "error"; message: string }

const hms = (ts: number) => new Date(ts).toLocaleTimeString([], { hour12: false });

/** Builds a newest-first event log from real runs and tool approvals. */
export function buildLog(runs: Run[], approvals: Approval[], limit = 12): LogLine[] {
  const lines: LogLine[] = [];
  for (const r of runs) {
    const level = r.status === "completed" ? "ok" : r.status === "failed" ? "error" : r.status === "cancelled" ? "warn" : "info";
    lines.push({ ts: r.startedAt, time: hms(r.startedAt), level, message: `${r.mode.toUpperCase()} run ${r.status}${r.error ? `: ${r.error}` : ""}` });
  }
  for (const a of approvals) {
    const level = a.status === "executed" ? "ok" : a.status === "failed" ? "error" : a.status === "pending" || a.status === "executing" ? "info" : "warn";
    const word = a.status === "pending" ? "proposed, awaiting approval" : a.status === "executing" ? "interrupted" : a.status;
    lines.push({ ts: a.decidedAt ?? a.createdAt, time: hms(a.decidedAt ?? a.createdAt), level, message: `${a.tool} ${word}` });
  }
  return lines.sort((x, y) => y.ts - x.ts).slice(0, limit);
}
