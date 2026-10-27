"use client";
import { useState } from "react";
import { useApp } from "./AppProvider";
import { Badge, type Status } from "./ui";
import type { Approval, ApprovalStatus } from "@/lib/agent/types";

export const APPROVAL_WORD: Record<ApprovalStatus, { s: Status; w: string }> = {
  pending: { s: "caution", w: "Proposed" },
  executing: { s: "offline", w: "Interrupted" },
  executed: { s: "nominal", w: "Executed" },
  failed: { s: "critical", w: "Failed" },
  rejected: { s: "offline", w: "Rejected" },
  expired: { s: "offline", w: "Expired" },
};

export function ApprovalCard({ approval: a }: { approval: Approval }) {
  const { decideApproval } = useApp();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [err, setErr] = useState("");
  const st = APPROVAL_WORD[a.status];
  async function go(d: "approve" | "reject") {
    setBusy(d); setErr("");
    const e = await decideApproval(a.id, d);
    if (e) setErr(e);
    setBusy(null);
  }
  return (
    <div className={`panel ${a.status === "pending" ? "panel--warn" : a.status === "failed" ? "panel--critical" : ""}`} style={{ padding: 12 }} data-testid="approval">
      <div className="panel__head" style={{ marginBottom: 12, paddingBottom: 8 }}>
        <h3 className="panel__title" style={{ fontSize: 12 }}>{a.tool}</h3>
        <Badge status={st.s}>{st.w}</Badge>
      </div>
      <p style={{ margin: "0 0 8px" }}>{a.summary}</p>
      <p className="muted" style={{ margin: "0 0 8px", fontSize: 14, lineHeight: "20px" }}>{a.consequences}</p>
      <details>
        <summary className="label" style={{ cursor: "pointer" }}>Exact input</summary>
        <pre className="mono" style={{ margin: "8px 0 0", padding: 8, maxHeight: 160, overflow: "auto", whiteSpace: "pre-wrap", overflowWrap: "anywhere", background: "var(--void)", border: "1px solid var(--line-subtle)", fontSize: 12 }}>{JSON.stringify(a.input, null, 2)}</pre>
      </details>
      {a.status === "executed" && a.result && <p className="mono" style={{ margin: "8px 0 0", fontSize: 12, color: "var(--success)" }}>Written: {String(a.result.path)} ({String(a.result.bytes)} bytes)</p>}
      {a.status === "failed" && <p className="mono" style={{ margin: "8px 0 0", fontSize: 12, color: "var(--critical)" }}>{a.error}</p>}
      {a.status === "executing" && <p className="mono muted" style={{ margin: "8px 0 0", fontSize: 12 }}>Execution did not finish. It will not be retried automatically; check the notes folder before proposing it again.</p>}
      {a.status === "pending" && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn btn--primary btn--sm" disabled={!!busy} onClick={() => void go("approve")}>{busy === "approve" ? "Saving…" : "Approve"}</button>
          <button className="btn btn--danger btn--sm" disabled={!!busy} onClick={() => void go("reject")}>Reject</button>
        </div>
      )}
      {err && <p role="alert" className="mono" style={{ margin: "8px 0 0", fontSize: 12, color: "var(--critical)" }}>{err}</p>}
      <p className="mono muted" style={{ margin: "8px 0 0", fontSize: 11 }}>{new Date(a.createdAt).toLocaleString()}{a.durationMs !== undefined ? ` · ${a.durationMs} ms` : ""} · {a.id.slice(0, 8)}</p>
    </div>
  );
}
