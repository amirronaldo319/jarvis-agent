import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APPROVAL_TTL_MS, decide, list, propose } from "@/lib/agent/store";
import { saveNote, slugify } from "@/lib/agent/tools";
import { sameOrigin } from "@/lib/origin";

let dir: string;
const notes = async () => readdir(path.join(dir, "notes")).catch(() => [] as string[]);

beforeEach(async () => { dir = await mkdtemp(path.join(os.tmpdir(), "agent-")); process.env.AGENT_DATA_DIR = dir; });
afterEach(async () => { vi.useRealTimers(); await rm(dir, { recursive: true, force: true }); });

const good = { title: "Weekly plan", body: "Mon: goals" };

describe("propose", () => {
  it("records a pending approval and writes no file", async () => {
    const r = await propose("save_note", good);
    expect(r.ok && r.approval.status).toBe("pending");
    expect(await notes()).toEqual([]);
  });
  it("rejects unknown tools and invalid or extra input", async () => {
    expect((await propose("rm_rf", good)).ok).toBe(false);
    expect((await propose("save_note", { title: "", body: "x" })).ok).toBe(false);
    expect((await propose("save_note", { ...good, path: "/etc/passwd" })).ok).toBe(false);
    expect((await propose("save_note", { title: "x".repeat(121), body: "b" })).ok).toBe(false);
    expect(await list()).toHaveLength(0);
  });
});

describe("decide", () => {
  it("executes exactly once on approve and reports the real file", async () => {
    const p = await propose("save_note", good);
    if (!p.ok) throw new Error("propose failed");
    const r = await decide(p.approval.id, "approve");
    expect(r.ok && r.approval.status).toBe("executed");
    const files = await notes();
    expect(files).toHaveLength(1);
    expect(await readFile(path.join(dir, "notes", files[0]), "utf8")).toBe("# Weekly plan\n\nMon: goals\n");
    const again = await decide(p.approval.id, "approve");
    expect(again.ok).toBe(false);
    expect(await notes()).toHaveLength(1);
  });
  it("concurrent approvals still execute once", async () => {
    const p = await propose("save_note", good);
    if (!p.ok) throw new Error("propose failed");
    const rs = await Promise.all([decide(p.approval.id, "approve"), decide(p.approval.id, "approve"), decide(p.approval.id, "approve")]);
    expect(rs.filter((r) => r.ok)).toHaveLength(1);
    expect(await notes()).toHaveLength(1);
  });
  it("reject never executes and cannot be approved later", async () => {
    const p = await propose("save_note", good);
    if (!p.ok) throw new Error("propose failed");
    expect((await decide(p.approval.id, "reject")).ok).toBe(true);
    expect((await decide(p.approval.id, "approve")).ok).toBe(false);
    expect(await notes()).toEqual([]);
  });
  it("unknown id is not_found", async () => {
    const r = await decide("nope", "approve");
    expect(!r.ok && r.code).toBe("not_found");
  });
  it("expired approvals cannot be approved", async () => {
    vi.useFakeTimers();
    const p = await propose("save_note", good);
    if (!p.ok) throw new Error("propose failed");
    vi.advanceTimersByTime(APPROVAL_TTL_MS + 1000);
    const r = await decide(p.approval.id, "approve");
    expect(!r.ok && r.approval?.status).toBe("expired");
    expect(await notes()).toEqual([]);
  });
  it("a failed execution is not retried", async () => {
    const p = await propose("save_note", good);
    if (!p.ok) throw new Error("propose failed");
    const spy = vi.spyOn(saveNote, "execute").mockRejectedValueOnce(new Error("disk full"));
    const r = await decide(p.approval.id, "approve");
    expect(r.ok && r.approval.status).toBe("failed");
    expect(r.ok && r.approval.error).toBe("disk full");
    expect((await decide(p.approval.id, "approve")).ok).toBe(false);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

describe("save_note", () => {
  it("slugs titles so path traversal is impossible", async () => {
    expect(slugify("../../etc/passwd")).toBe("etc-passwd");
    const p = await propose("save_note", { title: "../../escape", body: "x" });
    if (!p.ok) throw new Error("propose failed");
    await decide(p.approval.id, "approve");
    const files = await notes();
    expect(files[0]).toMatch(/^escape-[0-9a-f]{8}\.md$/);
  });
});

describe("sameOrigin", () => {
  const req = (h: Record<string, string>) => new Request("http://x/", { method: "POST", headers: h });
  it("accepts matching origin and rejects missing or foreign", () => {
    expect(sameOrigin(req({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
    expect(sameOrigin(req({ host: "localhost:3000" }))).toBe(false);
    expect(sameOrigin(req({ origin: "https://evil.example", host: "localhost:3000" }))).toBe(false);
  });
});
