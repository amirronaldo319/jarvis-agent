"use client";
import { useEffect } from "react";
import { useApp } from "@/components/AppProvider";
import { ApprovalCard, APPROVAL_WORD } from "@/components/ApprovalCard";
import { Badge, Empty, Panel } from "@/components/ui";
import { RunList } from "@/components/RunList";

export default function Activity() {
  const { runs, clearRuns, approvals, refreshApprovals } = useApp();
  useEffect(() => {
    void refreshApprovals();
    const t = setInterval(() => void refreshApprovals(), 5000);
    return () => clearInterval(t);
  }, [refreshApprovals]);
  const pending = approvals.filter((a) => a.status === "pending");
  const history = approvals.filter((a) => a.status !== "pending");

  return (
    <div className="page"><div className="page__inner">
      <div className="form-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="page-title">Agent activity</h2>
        <button className="btn btn--danger btn--sm" disabled={!runs.length} onClick={() => { if (confirm("Clear the local run log?")) clearRuns(); }}>Clear log</button>
      </div>
      <Panel title="Pending approvals" code={String(pending.length)} tone={pending.length ? "warn" : undefined}>
        {pending.length === 0 ? <Empty title="Nothing awaiting approval">Switch to Act mode and ask the agent to save a note. It will propose the action here and in the chat; nothing is written until you approve.</Empty>
          : <div style={{ display: "grid", gap: 16 }}>{pending.map((a) => <ApprovalCard key={a.id} approval={a} />)}</div>}
      </Panel>
      <Panel title="Tool executions" code={`${history.length}`}>
        {history.length === 0 ? <Empty title="No tool activity yet" /> : history.map((a) => {
          const st = APPROVAL_WORD[a.status];
          return (
            <details key={a.id} className="row" style={{ display: "block" }}>
              <summary style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                <span className="row__main" style={{ overflowWrap: "anywhere" }}>{a.summary}</span>
                <span className="mono muted" style={{ fontSize: 11 }}>{a.tool}</span>
                <Badge status={st.s}>{st.w}</Badge>
              </summary>
              <div style={{ paddingTop: 12 }}><ApprovalCard approval={a} /></div>
            </details>
          );
        })}
      </Panel>
      <Panel title="Run history" code={`${runs.length} RUNS`}><RunList /></Panel>
      <p className="muted mono" style={{ fontSize: 12 }}>Runs are stored in this browser and hold no prompt text. Tool proposals and results are stored on the server in .data/agent.json, including the exact input shown above.</p>
    </div></div>
  );
}
