import { describe, expect, it } from "vitest";
import { findAvailable, resolveModels } from "@/lib/models";
import { createLimiter } from "@/lib/rate-limit";
import { filterTasks } from "@/lib/tasks";
import type { Task } from "@/lib/types";

const t = (id: string, o: Partial<Task>): Task => ({ id, title: id, priority: "med", done: false, createdAt: 0, ...o });

describe("model registry", () => {
  it("marks Anthropic models available only with a key", () => {
    expect(resolveModels({}).find((m) => m.id === "claude-sonnet-5-5")?.status).toBe("no-key");
    expect(resolveModels({ ANTHROPIC_API_KEY: "x" }).find((m) => m.id === "claude-sonnet-5-5")?.status).toBe("available");
  });
  it("never reports providers without an adapter as available", () => {
    const env = { OPENAI_API_KEY: "x", GOOGLE_API_KEY: "x", XAI_API_KEY: "x", DEEPSEEK_API_KEY: "x" };
    expect(resolveModels(env).filter((m) => m.provider !== "anthropic").every((m) => m.status === "adapter-pending")).toBe(true);
  });
  it("findAvailable rejects unknown or unconnected ids", () => {
    expect(findAvailable("claude-sonnet-5-5", {})).toBeUndefined();
    expect(findAvailable("nope", { ANTHROPIC_API_KEY: "x" })).toBeUndefined();
    expect(findAvailable("claude-haiku-5-5", { ANTHROPIC_API_KEY: "x" })).toBeDefined();
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
