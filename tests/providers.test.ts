import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { actChat, deltaFromLine, streamChat } from "@/lib/providers";
import type { Runtime } from "@/lib/models";

describe("deltaFromLine", () => {
  it("parses Anthropic text deltas only", () => {
    expect(deltaFromLine("anthropic", 'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"hi"}}')).toBe("hi");
    expect(deltaFromLine("anthropic", 'data: {"type":"message_start"}')).toBe("");
    expect(deltaFromLine("anthropic", "event: ping")).toBe("");
  });
  it("parses OpenAI-style deltas and ignores [DONE]/role chunks", () => {
    expect(deltaFromLine("openai-compat", 'data: {"choices":[{"delta":{"content":"yo"}}]}')).toBe("yo");
    expect(deltaFromLine("openai-compat", 'data: {"choices":[{"delta":{"role":"assistant"}}]}')).toBe("");
    expect(deltaFromLine("openai-compat", "data: [DONE]")).toBe("");
  });
});

describe("OpenAI-compatible round trip", () => {
  let server: http.Server;
  let rt: Runtime;
  let seenAuth: string | undefined;
  let seenBody: { tools?: unknown; messages: { role: string }[] };

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => {
        seenAuth = req.headers.authorization; seenBody = JSON.parse(b);
        if (seenBody.tools) {
          res.writeHead(200, { "content-type": "application/json" });
          return res.end(JSON.stringify({ choices: [{ message: { content: "ok", tool_calls: [{ function: { name: "save_note", arguments: '{"title":"t","body":"b"}' } }, { function: { name: "bad", arguments: "{not json" } }] } }] }));
        }
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.write('data: {"choices":[{"delta":{"content":"Hel"}}]}\n\ndata: {"choices":[{"delta":{"content":"lo"}}]}\n\ndata: [DONE]\n\n');
        res.end();
      });
    });
    await new Promise<void>((r) => server.listen(0, r));
    rt = { kind: "openai-compat", baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, apiKey: "k", model: "m" };
  });
  afterAll(() => { server.close(); });

  it("streams text, sends bearer auth and a system message first", async () => {
    const r = await streamChat(rt, "SYS", [{ role: "user", content: "hi" }], new AbortController().signal);
    if (!r.ok) throw new Error("stream failed");
    expect(await new Response(r.stream).text()).toBe("Hello");
    expect(seenAuth).toBe("Bearer k");
    expect(seenBody.messages[0].role).toBe("system");
  });
  it("returns tool calls with parsed input, and undefined input for malformed arguments", async () => {
    const r = await actChat(rt, "SYS", [{ role: "user", content: "x" }], [{ name: "save_note", description: "d", inputSchema: {} }], new AbortController().signal);
    if (!r.ok) throw new Error("act failed");
    expect(r.calls).toEqual([{ name: "save_note", input: { title: "t", body: "b" } }, { name: "bad", input: undefined }]);
  });
  it("reports unreachable providers as a failure, not a throw", async () => {
    const r = await streamChat({ ...rt, baseUrl: "http://127.0.0.1:1" }, "S", [{ role: "user", content: "x" }], new AbortController().signal);
    expect(r.ok).toBe(false);
  });
});
