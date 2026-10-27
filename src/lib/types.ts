export type Role = "user" | "assistant";
export interface Msg {
  id: string;
  role: Role;
  content: string;
  model?: string;
  error?: string;
  approvalIds?: string[];
  ts: number;
}
export interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: Msg[];
}
export type Priority = "low" | "med" | "high";
export interface Task {
  id: string;
  title: string;
  priority: Priority;
  due?: string;
  done: boolean;
  createdAt: number;
}
export type RunStatus = "running" | "completed" | "failed" | "cancelled";
export interface Run {
  id: string;
  model: string;
  mode: AgentMode;
  status: RunStatus;
  startedAt: number;
  durationMs?: number;
  summary: string;
  error?: string;
}
export type AgentMode = "ask" | "plan" | "act";
export type ThemeId = "jarvis" | "alert" | "stark";
export interface Settings {
  theme: ThemeId;
  model: string;
  mode: AgentMode;
}
export const DEFAULT_SETTINGS: Settings = { theme: "jarvis", model: "claude-sonnet-5-5", mode: "ask" };
