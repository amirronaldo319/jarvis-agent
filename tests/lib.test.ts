import { describe, expect, it } from "vitest";
import { resolveModels, resolveRuntime } from "@/lib/models";
import { createLimiter } from "@/lib/rate-limit";
import { filterTasks } from "@/lib/tasks";
import type { Task } from "@/lib/types";

const t = (id: string, o: Partial<Task>): Task => ({ id, title: id, priority: "med", done: false, createdAt: 0, ...o });

describe("model registry", () => {
  const status = (env: Record<string, string>, id: string) => resolveModels(env).find((m) => m.id === id)?.status;
  it("Anthropic models need only a key", () => {
    expect(status({}, "claude-sonnet-5-5")).toBe("no-key");
    expect(status({ ANTHROPIC_API_KEY: "x" }, "claude-sonnet-5-5")).toBe("available");
  });
  it("OpenAI-compatible providers need a key AND a model name", () => {
    expect(status({}, "openai")).toBe("no-key");
    expect(status({ OPENAI_API_KEY: "x" }, "openai")).toBe("needs-config");
    expect(status({ OPENAI_API_KEY: "x", OPENAI_MODEL: "m" }, "openai")).toBe("available");
    expect(resolveModels({ OPENAI_API_KEY: "x", OPENAI_MODEL: "m" }).find((m) => m.id === "openai")?.label).toBe("OpenAI · m");
  });
  it("custom endpoint needs base URL and model but not a key", () => {
    expect(status({ OPENAI_COMPAT_MODEL: "llama" }, "custom")).toBe("needs-config");
    expect(status({ OPENAI_COMPAT_MODEL: "llama", OPENAI_COMPAT_BASE_URL: "http://localhost:11434/v1" }, "custom")).toBe("available");
  });
  it("resolveRuntime returns details only for available models and never leaks via resolveModels", () => {
    expect(resolveRuntime("openai", {})).toBeUndefined();
    expect(resolveRuntime("nope", { ANTHROPIC_API_KEY: "x" })).toBeUndefined();
    const rt = resolveRuntime("deepseek", { DEEPSEEK_API_KEY: "k", DEEPSEEK_MODEL: "m" });
    expect(rt).toEqual({ kind: "openai-compat", baseUrl: "https://api.deepseek.com", apiKey: "k", model: "m" });
    expect(JSON.stringify(resolveModels({ DEEPSEEK_API_KEY: "secret-k", DEEPSEEK_MODEL: "m" }))).not.toContain("secret-k");
  });
});

describe("rate limiter", () => {
  it("blocks after the limit and recovers after the window", () => {
    const allow = createLimiter(2, 1000);
    expect([allow("a", 0), allow("a", 1), allow("a", 2)]).toEqual([true, true, false]);
    expect(allow("b", 2)).toBe(true);
    expect(allow("a", 1500)).toBe(true);
  });
});

describe("task filters", () => {
  const tasks = [t("due-today", { due: "2026-10-27" }), t("late", { due: "2026-10-01" }), t("soon", { due: "2026-11-01" }), t("done", { done: true, due: "2026-10-01" }), t("none", {})];
  const ids = (f: Parameters<typeof filterTasks>[1], q = "") => filterTasks(tasks, f, q, "2026-10-27").map((x) => x.id);
  it("splits today, upcoming, overdue, completed", () => {
    expect(ids("today")).toEqual(["due-today"]);
    expect(ids("upcoming")).toEqual(["soon"]);
    expect(ids("overdue")).toEqual(["late"]);
    expect(ids("completed")).toEqual(["done"]);
    expect(ids("all")).toHaveLength(5);
  });
  it("searches case-insensitively", () => { expect(ids("all", "LATE")).toEqual(["late"]); });
});
