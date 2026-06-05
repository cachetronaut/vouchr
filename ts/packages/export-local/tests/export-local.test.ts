import { describe, expect, it } from "vitest";
import { exportLocalRun } from "../src/index.js";

describe("Vouchr export-local", () => {
  it("exports from structural local sources", async () => {
    const record = await exportLocalRun({
      runId: "run_local",
      events: [],
      decisions: [],
      usage: {},
      exportedAt: "2026-06-04T12:00:00.000Z",
    });

    expect(record.runId).toBe("run_local");
    expect(record.contentHash).toHaveLength(64);
  });
});
