import { describe, expect, it } from "vitest";
import { GAUGE_C, clamp, gaugeOffset, percent, radarPoint, segmentsOn } from "@/components/hud/math";
import { buildLog } from "@/lib/activity-log";

describe("hud math", () => {
  it("clamps and computes percent safely", () => {
    expect(clamp(150, 0, 100)).toBe(100);
    expect(percent(50, 200)).toBe(25);
    expect(percent(5, 0)).toBe(0);
    expect(percent(-5, 10)).toBe(0);
  });
  it("gauge arc is empty at 0 and full at max", () => {
    expect(gaugeOffset(0, 10)).toBeCloseTo(GAUGE_C);
    expect(gaugeOffset(10, 10)).toBeCloseTo(0);
  });
  it("radar axis 0 points straight up", () => {
    const [x, y] = radarPoint(0, 5, 1);
    expect(x).toBeCloseTo(120);
    expect(y).toBeCloseTo(42);
  });
  it("lights the right number of segments", () => {
    expect(segmentsOn(50, 100, 20)).toBe(10);
    expect(segmentsOn(100, 0, 20)).toBe(0);
  });
});

describe("buildLog", () => {
  it("merges runs and approvals newest first with honest levels", () => {
    const lines = buildLog(
      [{ id: "r", model: "m", mode: "ask", status: "failed", startedAt: 1000, summary: "", error: "boom" }],
      [{ id: "a", tool: "save_note", input: {}, summary: "", consequences: "", status: "pending", createdAt: 2000 }],
    );
    expect(lines.map((l) => l.level)).toEqual(["info", "error"]);
    expect(lines[0].message).toBe("save_note proposed, awaiting approval");
    expect(lines[1].message).toContain("boom");
  });
});
