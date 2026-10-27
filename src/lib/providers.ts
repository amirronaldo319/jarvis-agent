import type { Runtime } from "./models";

export type ChatMsg = { role: "user" | "assistant"; content: string };
export interface ToolSpec { name: string; description: string; inputSchema: Record<string, unknown> }
export type Failure = { ok: false; status: number; code: string; message: string };

const fail = (status: number, code: string, message: string): Failure => ({ ok: false, status, code, message });

function request(rt: Runtime, system: string, messages: ChatMsg[], stream: boolean, tools?: ToolSpec[]): { url: string; headers: Record<string, string>; body: unknown } {
  if (rt.kind === "anthropic") {
    return {
      url: `${rt.baseUrl}/v1/messages`,
      headers: { "content-type": "application/json", "x-api-key": rt.apiKey ?? "", "anthropic-version": "2023-06-01" },
      body: { model: rt.model, max_tokens: 2048, stream, system, messages, ...(tools && { tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema })) }) },
    };
  }
  return {
    url: `${rt.baseUrl}/chat/completions`,
    headers: { "content-type": "application/json", ...(rt.apiKey ? { authorization: `Bearer ${rt.apiKey}` } : {}) },
    body: { model: rt.model, stream, messages: [{ role: "system", content: system }, ...messages], ...(tools && { tools: tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.inputSchema } })) }) },
  };
}

async function call(rt: Runtime, system: string, messages: ChatMsg[], stream: boolean, signal: AbortSignal, tools?: ToolSpec[]) {
  const r = request(rt, system, messages, stream, tools);
  const res = await fetch(r.url, { method: "POST", signal, headers: r.headers, body: JSON.stringify(r.body) }).catch(() => null);
  if (!res) return fail(502, "provider_unreachable", "Could not reach the provider.");
  if (!res.ok) return fail(502, "provider_error", `Provider returned status ${res.status}.`);
  return res;
}

/** Text delta carried by one SSE line, or "". */
export function deltaFromLine(kind: Runtime["kind"], line: string): string {
  if (!line.startsWith("data:")) return "";
  try {
    const ev = JSON.parse(line.slice(5));
    if (kind === "anthropic") return ev.type === "content_block_delta" && ev.delta?.type === "text_delta" ? String(ev.delta.text) : "";
    const c = ev.choices?.[0]?.delta?.content;
    return typeof c === "string" ? c : "";
  } catch { return ""; }
}

export async function streamChat(rt: Runtime, system: string, messages: ChatMsg[], signal: AbortSignal): Promise<{ ok: true; stream: ReadableStream<Uint8Array> } | Failure> {
  const res = await call(rt, system, messages, true, signal);
  if (!(res instanceof Response)) return res;
  if (!res.body) return fail(502, "provider_error", "Provider returned no body.");
  const dec = new TextDecoder(), enc = new TextEncoder();
  let buf = "";
  const stream = res.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctrl) {
      buf += dec.decode(chunk, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) { const d = deltaFromLine(rt.kind, l.trim()); if (d) ctrl.enqueue(enc.encode(d)); }
    },
  }));
  return { ok: true, stream };
}

/** Non-streaming, tool-enabled call. Returns the proposed tool calls; never executes them. */
export async function actChat(rt: Runtime, system: string, messages: ChatMsg[], tools: ToolSpec[], signal: AbortSignal): Promise<{ ok: true; text: string; calls: { name: string; input: unknown }[] } | Failure> {
  const res = await call(rt, system, messages, false, signal, tools);
  if (!(res instanceof Response)) return res;
  const data = await res.json().catch(() => null);
  if (!data) return fail(502, "provider_error", "Provider returned invalid JSON.");
  if (rt.kind === "anthropic") {
    const blocks: { type: string; text?: string; name?: string; input?: unknown }[] = data.content ?? [];
    return { ok: true, text: blocks.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n").trim(),
      calls: blocks.filter((b) => b.type === "tool_use").map((b) => ({ name: String(b.name), input: b.input })) };
  }
  const msg = data.choices?.[0]?.message ?? {};
  const calls = ((msg.tool_calls ?? []) as { function?: { name?: string; arguments?: string } }[]).map((t) => {
    let input: unknown;
    try { input = JSON.parse(t.function?.arguments ?? ""); } catch { input = undefined; }
    return { name: String(t.function?.name), input };
  });
  return { ok: true, text: typeof msg.content === "string" ? msg.content.trim() : "", calls };
}
