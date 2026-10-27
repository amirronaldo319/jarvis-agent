import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "./store-path";
import { TOOLS } from "./tools";
import type { AgentState, Approval } from "./types";

export const APPROVAL_TTL_MS = 15 * 60_000;
const g = globalThis as unknown as { __agentLock?: Promise<unknown> };

/** Serialises all state transitions, even across duplicated module instances. */
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = (g.__agentLock ?? Promise.resolve()).then(fn, fn);
  g.__agentLock = run.catch(() => undefined);
  return run;
}

async function load(): Promise<AgentState> {
  try { return JSON.parse(await readFile(path.join(dataDir(), "agent.json"), "utf8")) as AgentState; }
  catch { return { approvals: [], audit: [] }; }
}

async function save(state: AgentState) {
  const dir = dataDir();
  await mkdir(dir, { recursive: true });
  const tmp = path.join(dir, `agent.json.${process.pid}.tmp`);
  await writeFile(tmp, JSON.stringify({ approvals: state.approvals.slice(-200), audit: state.audit.slice(-500) }, null, 2));
  await rename(tmp, path.join(dir, "agent.json"));
}

function log(s: AgentState, approvalId: string, event: string) { s.audit.push({ ts: Date.now(), approvalId, event }); }

export type ProposeResult = { ok: true; approval: Approval } | { ok: false; error: string };

/** Records a proposed action. Never executes anything. */
export function propose(tool: string, rawInput: unknown): Promise<ProposeResult> {
  return locked(async () => {
    const def = TOOLS[tool];
    if (!def) return { ok: false as const, error: `Unknown tool "${tool}".` };
    const v = def.validate(rawInput);
    if (!v.ok) return { ok: false as const, error: v.error };
    const state = await load();
    const approval: Approval = {
      id: crypto.randomUUID(), tool, input: v.value, ...def.describe(v.value), status: "pending", createdAt: Date.now(),
    };
    state.approvals.push(approval);
    log(state, approval.id, `proposed:${tool}`);
    await save(state);
    return { ok: true as const, approval };
  });
}

export function list(): Promise<Approval[]> {
  return locked(async () => {
    const state = await load();
    const now = Date.now();
    let changed = false;
    for (const a of state.approvals) {
      if (a.status === "pending" && now - a.createdAt > APPROVAL_TTL_MS) { a.status = "expired"; a.decidedAt = now; log(state, a.id, "expired"); changed = true; }
    }
    if (changed) await save(state);
    return [...state.approvals].reverse().slice(0, 50);
  });
}

export type DecideResult =
  | { ok: true; approval: Approval }
  | { ok: false; code: "not_found" | "not_pending"; error: string; approval?: Approval };

/**
 * The only path to execution. Uses the stored input, moves pending to a
 * terminal state exactly once, and never retries a failed or interrupted run.
 */
export function decide(id: string, decision: "approve" | "reject"): Promise<DecideResult> {
  return locked(async () => {
    const state = await load();
    const a = state.approvals.find((x) => x.id === id);
    if (!a) return { ok: false as const, code: "not_found" as const, error: "No such approval." };
    const now = Date.now();
    if (a.status === "pending" && now - a.createdAt > APPROVAL_TTL_MS) {
      a.status = "expired"; a.decidedAt = now; log(state, id, "expired"); await save(state);
    }
    if (a.status !== "pending") return { ok: false as const, code: "not_pending" as const, error: `Approval is already ${a.status}.`, approval: a };

    a.decidedAt = now;
    if (decision === "reject") {
      a.status = "rejected"; log(state, id, "rejected"); await save(state);
      return { ok: true as const, approval: a };
    }

    const def = TOOLS[a.tool];
    a.status = "executing"; log(state, id, "approved"); await save(state);
    const t0 = Date.now();
    try {
      if (!def) throw new Error("Tool no longer exists.");
      a.result = await Promise.race([
        def.execute(a.input, { id }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Tool timed out.")), def.timeoutMs)),
      ]);
      a.status = "executed"; log(state, id, "executed");
    } catch (e) {
      a.status = "failed"; a.error = e instanceof Error ? e.message : "Tool failed."; log(state, id, "failed");
    }
    a.durationMs = Date.now() - t0;
    await save(state);
    return { ok: true as const, approval: a };
  });
}
