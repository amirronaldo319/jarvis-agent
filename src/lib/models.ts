export type ProviderId = "anthropic" | "openai" | "google" | "xai" | "deepseek" | "custom";
export type ProviderKind = "anthropic" | "openai-compat";
export type ModelStatus = "available" | "no-key" | "needs-config";

interface ModelDef {
  id: string;
  label: string;
  provider: ProviderId;
  kind: ProviderKind;
  keyEnv: string;
  keyOptional?: boolean;
  /** Env var naming the model. Absent means `fixedModel` is used. */
  modelEnv?: string;
  fixedModel?: string;
  baseUrlEnv: string;
  defaultBase?: string;
  capabilities: string[];
}

export interface ModelInfo {
  id: string;
  label: string;
  provider: ProviderId;
  capabilities: string[];
  status: ModelStatus;
  /** What to set to connect this model. */
  hint?: string;
}

export interface Runtime { kind: ProviderKind; baseUrl: string; apiKey?: string; model: string }

const anthropic = (id: string, label: string, fixedModel: string, capabilities: string[]): ModelDef => ({
  id, label, provider: "anthropic", kind: "anthropic", keyEnv: "ANTHROPIC_API_KEY", fixedModel,
  baseUrlEnv: "ANTHROPIC_BASE_URL", defaultBase: "https://api.anthropic.com", capabilities,
});
const compat = (id: string, label: string, provider: ProviderId, p: string, defaultBase: string): ModelDef => ({
  id, label, provider, kind: "openai-compat", keyEnv: `${p}_API_KEY`, modelEnv: `${p}_MODEL`,
  baseUrlEnv: `${p}_BASE_URL`, defaultBase, capabilities: ["streaming", "tools"],
});

// Model names for OpenAI-compatible providers are never hardcoded: you choose them via <PROVIDER>_MODEL.
export const MODEL_REGISTRY: ModelDef[] = [
  anthropic("claude-sonnet-5-5", "Claude Sonnet 5.5", "claude-sonnet-5-5", ["streaming", "tools", "reasoning"]),
  anthropic("claude-opus-5-5", "Claude Opus 5.5", "claude-opus-5-5", ["streaming", "tools", "deep reasoning"]),
  anthropic("claude-haiku-5-5", "Claude Haiku 5.5", "claude-haiku-5-5", ["streaming", "tools", "fast"]),
  compat("openai", "OpenAI", "openai", "OPENAI", "https://api.openai.com/v1"),
  compat("google", "Google Gemini", "google", "GOOGLE", "https://generativelanguage.googleapis.com/v1beta/openai"),
  compat("xai", "xAI", "xai", "XAI", "https://api.x.ai/v1"),
  compat("deepseek", "DeepSeek", "deepseek", "DEEPSEEK", "https://api.deepseek.com"),
  { id: "custom", label: "Custom endpoint", provider: "custom", kind: "openai-compat", keyEnv: "OPENAI_COMPAT_API_KEY", keyOptional: true,
    modelEnv: "OPENAI_COMPAT_MODEL", baseUrlEnv: "OPENAI_COMPAT_BASE_URL", capabilities: ["streaming", "tools"] },
];

type Env = Record<string, string | undefined>;

function analyse(def: ModelDef, env: Env): { status: ModelStatus; hint?: string; runtime?: Runtime; model?: string } {
  const apiKey = env[def.keyEnv] || undefined;
  const model = def.fixedModel ?? (def.modelEnv ? env[def.modelEnv] || undefined : undefined);
  const baseUrl = (env[def.baseUrlEnv] || def.defaultBase || "").replace(/\/$/, "");
  if (!apiKey && !def.keyOptional) return { status: "no-key", hint: `Set ${def.keyEnv}`, model };
  if (!model) return { status: "needs-config", hint: `Set ${def.modelEnv}`, model };
  if (!baseUrl) return { status: "needs-config", hint: `Set ${def.baseUrlEnv}`, model };
  return { status: "available", model, runtime: { kind: def.kind, baseUrl, apiKey, model } };
}

export function resolveModels(env: Env): ModelInfo[] {
  return MODEL_REGISTRY.map((def) => {
    const a = analyse(def, env);
    const label = def.modelEnv && a.model ? `${def.label} · ${a.model}` : def.label;
    return { id: def.id, label, provider: def.provider, capabilities: def.capabilities, status: a.status, hint: a.hint };
  });
}

/** Connection details for an available model, or undefined. Server-only: includes the API key. */
export function resolveRuntime(id: string, env: Env): Runtime | undefined {
  const def = MODEL_REGISTRY.find((m) => m.id === id);
  return def ? analyse(def, env).runtime : undefined;
}
