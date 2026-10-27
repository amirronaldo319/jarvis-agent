"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocalStore, uid } from "@/lib/store";
import { DEFAULT_SETTINGS, type AgentMode, type Conversation, type Msg, type Run, type Settings, type Task } from "@/lib/types";
import type { ModelInfo } from "@/lib/models";
import type { Approval } from "@/lib/agent/types";

const EMPTY_CONVS: Conversation[] = [];
const EMPTY_TASKS: Task[] = [];
const EMPTY_RUNS: Run[] = [];

interface Live { convId: string; msgId: string; runId: string; text: string }

interface Ctx {
  settings: Settings;
  setSettings: (p: Partial<Settings>) => void;
  models: ModelInfo[] | null;
  conversations: Conversation[];
  active: Conversation | null;
  setActiveId: (id: string | null) => void;
  renameConversation: (id: string, title: string) => void;
  deleteConversation: (id: string) => void;
  tasks: Task[];
  setTasks: (u: Task[] | ((p: Task[]) => Task[])) => void;
  runs: Run[];
  clearRuns: () => void;
  live: Live | null;
  send: (text: string) => Promise<void>;
  regenerate: () => Promise<void>;
  stop: () => void;
  selectedModel: ModelInfo | undefined;
  approvals: Approval[];
  refreshApprovals: () => Promise<void>;
  decideApproval: (id: string, decision: "approve" | "reject") => Promise<string | null>;
}

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside AppProvider");
  return c;
};

function titleFrom(text: string) {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 42 ? `${t.slice(0, 42)}…` : t;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsRaw] = useLocalStore<Settings>("jv.settings", DEFAULT_SETTINGS);
  const [conversations, setConvs] = useLocalStore<Conversation[]>("jv.convs", EMPTY_CONVS);
  const [tasks, setTasks] = useLocalStore<Task[]>("jv.tasks", EMPTY_TASKS);
  const [runs, setRuns] = useLocalStore<Run[]>("jv.runs", EMPTY_RUNS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [models, setModels] = useState<ModelInfo[] | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  useEffect(() => {
    let off = false;
    fetch("/api/models").then((r) => r.json()).then((d) => { if (!off) setModels(d.models); }).catch(() => { if (!off) setModels([]); });
    return () => { off = true; };
  }, []);

  const refreshApprovals = useCallback(async () => {
    try {
      const d = await (await fetch("/api/approvals", { cache: "no-store" })).json();
      setApprovals(d.approvals ?? []);
    } catch { /* keep last known list */ }
  }, []);
  useEffect(() => {
    let off = false;
    fetch("/api/approvals", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (!off) setApprovals(d.approvals ?? []); }).catch(() => {});
    return () => { off = true; };
  }, []);

  const decideApproval = useCallback(async (id: string, decision: "approve" | "reject") => {
    try {
      const res = await fetch(`/api/approvals/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision }) });
      const j = await res.json().catch(() => null);
      await refreshApprovals();
      return res.ok ? null : (j?.message ?? `Request failed (${res.status}).`);
    } catch { return "Could not reach the server."; }
  }, [refreshApprovals]);

  const setSettings = useCallback((p: Partial<Settings>) => setSettingsRaw((s) => ({ ...s, ...p })), [setSettingsRaw]);
  const active = useMemo(() => conversations.find((c) => c.id === activeId) ?? null, [conversations, activeId]);
  const selectedModel = useMemo(() => models?.find((m) => m.id === settings.model), [models, settings.model]);

  const patchConv = useCallback((id: string, fn: (c: Conversation) => Conversation) => {
    setConvs((all) => all.map((c) => (c.id === id ? fn(c) : c)));
  }, [setConvs]);

  const run = useCallback(async (convId: string, history: Msg[]) => {
    const model = settings.model, mode: AgentMode = settings.mode;
    const summary = `${mode.toUpperCase()} request`;
    const msgId = uid(), runId = uid(), started = Date.now();
    const ac = new AbortController();
    abortRef.current = ac;
    const placeholder: Msg = { id: msgId, role: "assistant", content: "", model, ts: started };
    patchConv(convId, (c) => ({ ...c, messages: [...c.messages, placeholder], updatedAt: started }));
    setRuns((r) => [{ id: runId, model, mode, status: "running" as const, startedAt: started, summary }, ...r].slice(0, 100));
    setLive({ convId, msgId, runId, text: "" });

    let text = "";
    let approvalIds: string[] = [];
    let status: Run["status"] = "completed";
    let error: string | undefined;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        signal: ac.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, mode, messages: history.map(({ role, content }) => ({ role, content })) }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.message ?? `Request failed (${res.status}).`);
      }
      approvalIds = (res.headers.get("x-approval-ids") ?? "").split(",").filter(Boolean);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += dec.decode(value, { stream: true });
        setLive({ convId, msgId, runId, text });
      }
      if (!text.trim()) throw new Error("The model returned an empty response.");
    } catch (e) {
      if (ac.signal.aborted) status = "cancelled";
      else { status = "failed"; error = e instanceof Error ? e.message : "Unknown error."; }
    }
    const ended = Date.now();
    patchConv(convId, (c) => ({
      ...c,
      messages: c.messages.map((m) => (m.id === msgId ? { ...m, content: text, error, approvalIds: approvalIds.length ? approvalIds : undefined } : m)),
      updatedAt: ended,
    }));
    setRuns((r) => r.map((x) => (x.id === runId ? { ...x, status, error, durationMs: ended - started } : x)));
    setLive(null);
    abortRef.current = null;
    if (approvalIds.length) void refreshApprovals();
  }, [settings.model, settings.mode, patchConv, setRuns, refreshApprovals]);

  const send = useCallback(async (text: string) => {
    if (live) return;
    const now = Date.now();
    const user: Msg = { id: uid(), role: "user", content: text, ts: now };
    let convId = activeId;
    let history: Msg[];
    if (convId && conversations.some((c) => c.id === convId)) {
      history = [...(conversations.find((c) => c.id === convId)?.messages.filter((m) => !m.error && m.content) ?? []), user];
      patchConv(convId, (c) => ({ ...c, messages: [...c.messages, user], updatedAt: now }));
    } else {
      convId = uid();
      history = [user];
      setConvs((all) => [{ id: convId as string, title: titleFrom(text), updatedAt: now, messages: [user] }, ...all]);
      setActiveId(convId);
    }
    await run(convId, history);
  }, [live, activeId, conversations, patchConv, setConvs, run]);

  const regenerate = useCallback(async () => {
    if (live || !active) return;
    const msgs = [...active.messages];
    while (msgs.length && msgs[msgs.length - 1].role === "assistant") msgs.pop();
    if (!msgs.length) return;
    patchConv(active.id, (c) => ({ ...c, messages: msgs }));
    await run(active.id, msgs.filter((m) => !m.error && m.content));
  }, [live, active, patchConv, run]);

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const renameConversation = useCallback((id: string, title: string) => {
    const t = title.trim();
    if (t) patchConv(id, (c) => ({ ...c, title: t.slice(0, 80) }));
  }, [patchConv]);
  const deleteConversation = useCallback((id: string) => {
    setConvs((all) => all.filter((c) => c.id !== id));
    setActiveId((cur) => (cur === id ? null : cur));
  }, [setConvs]);
  const clearRuns = useCallback(() => setRuns([]), [setRuns]);

  const value: Ctx = {
    settings, setSettings, models, conversations, active, setActiveId, renameConversation, deleteConversation,
    tasks, setTasks, runs, clearRuns, live, send, regenerate, stop, selectedModel, approvals, refreshApprovals, decideApproval,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
