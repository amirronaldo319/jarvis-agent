export type ProviderId = "anthropic" | "openai" | "google" | "xai" | "deepseek";

export interface ModelDef {
  id: string;
  label: string;
  provider: ProviderId;
  envKey: string;
  adapter: boolean;
  capabilities: string[];
  note?: string;
}

export type ModelStatus = "available" | "no-key" | "adapter-pending";

export interface ModelInfo extends Omit<ModelDef, "envKey" | "adapter"> {
  status: ModelStatus;
}

export const MODEL_REGISTRY: ModelDef[] = [
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", provider: "anthropic", envKey: "ANTHROPIC_API_KEY", adapter: true, capabilities: ["streaming", "reasoning"] },
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", provider: "anthropic", envKey: "ANTHROPIC_API_KEY", adapter: true, capabilities: ["streaming", "deep reasoning"] },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", provider: "anthropic", envKey: "ANTHROPIC_API_KEY", adapter: true, capabilities: ["streaming", "fast"] },
  { id: "openai-default", label: "OpenAI", provider: "openai", envKey: "OPENAI_API_KEY", adapter: false, capabilities: [], note: "Adapter not implemented yet" },
  { id: "google-default", label: "Google Gemini", provider: "google", envKey: "GOOGLE_API_KEY", adapter: false, capabilities: [], note: "Adapter not implemented yet" },
  { id: "xai-default", label: "xAI", provider: "xai", envKey: "XAI_API_KEY", adapter: false, capabilities: [], note: "Adapter not implemented yet" },
  { id: "deepseek-default", label: "DeepSeek", provider: "deepseek", envKey: "DEEPSEEK_API_KEY", adapter: false, capabilities: [], note: "Adapter not implemented yet" },
];

export function resolveModels(env: Record<string, string | undefined>): ModelInfo[] {
  return MODEL_REGISTRY.map(({ envKey, adapter, ...m }) => ({
    ...m,
    status: !adapter ? "adapter-pending" : env[envKey] ? "available" : "no-key",
  }));
}

export function findAvailable(id: string, env: Record<string, string | undefined>): ModelInfo | undefined {
  return resolveModels(env).find((m) => m.id === id && m.status === "available");
}
