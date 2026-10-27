export type ApprovalStatus = "pending" | "executing" | "executed" | "failed" | "rejected" | "expired";

export interface Approval {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  summary: string;
  consequences: string;
  status: ApprovalStatus;
  createdAt: number;
  decidedAt?: number;
  durationMs?: number;
  result?: Record<string, unknown>;
  error?: string;
}

export interface AuditEvent { ts: number; approvalId: string; event: string }
export interface AgentState { approvals: Approval[]; audit: AuditEvent[] }
