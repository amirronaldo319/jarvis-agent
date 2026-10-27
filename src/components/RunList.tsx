"use client";
import { useApp } from "./AppProvider";
import { Badge, Empty, type Status } from "./ui";
import type { Run } from "@/lib/types";

export function runStatus(r: Run, liveId?: string): { status: Status; word: string } {
  if (r.status === "running") return liveId === r.id ? { status: "caution", word: "Running" } : { status: "offline", word: "Interrupted" };
  if (r.status === "completed") return { status: "nominal", word: "Completed" };
  if (r.status === "cancelled") return { status: "offline", word: "Cancelled" };
  return { status: "critical", word: "Failed" };
}

export function fmtDuration(ms?: number) {
  return ms === undefined ? "—" : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export function RunList({ limit }: { limit?: number }) {
  const { runs, live } = useApp();
  const shown = limit ? runs.slice(0, limit) : runs;
  if (!shown.length) return <Empty title="No runs yet">Runs appear here when you chat with the agent.</Empty>;
  return (
    <div>
      {shown.map((r) => {
        const s = runStatus(r, live?.runId);
        return (
          <div key={r.id} className="row" style={{ alignItems: "flex-start" }}>
            <div className="row__main">
              <div className="row__title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.summary}</div>
              <div className="mono muted" style={{ fontSize: 11, lineHeight: "16px" }}>
                {new Date(r.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · {r.mode.toUpperCase()} · {fmtDuration(r.durationMs)}
              </div>
              {r.error && <div className="mono" style={{ fontSize: 11, color: "var(--critical)" }}>{r.error}</div>}
            </div>
            <Badge status={s.status}>{s.word}</Badge>
          </div>
        );
      })}
    </div>
  );
}
