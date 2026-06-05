import { describe, expect, it } from "vitest";
import { exportRun, verifyRecord } from "../src/index.js";

const SOURCES = {
  runId: "run_1",
  events: [{ id: "event_1", type: "stage", stage: "execute" }],
  decisions: [{ stage: "execute", ok: true, detail: { actual: { model_cost_usd: 1 } } }],
  usage: { budget_task: { cumulative: { model_cost_usd: 1 } } },
  policyLog: [{ ruleId: "allow" }],
  tokenLog: [{ action: "authorize", ok: true }],
  exportedAt: "2026-06-04T12:00:00.000Z",
};

describe("Vouchr core", () => {
  it("exports deterministic records and verifies their content hash", async () => {
    const first = await exportRun(SOURCES);
    const second = await exportRun(SOURCES);

    expect(first).toEqual(second);
    expect(first.contentHash).toHaveLength(64);
    await expect(verifyRecord(first)).resolves.toEqual({
      ok: true,
      expectedHash: first.contentHash,
    });
  });

  it("detects tampered records", async () => {
    const record = await exportRun(SOURCES);
    const tampered = { ...record, decisions: [{ stage: "execute", ok: false, detail: {} }] };

    await expect(verifyRecord(tampered)).resolves.toMatchObject({
      ok: false,
      reason: "hash_mismatch",
    });
  });

  it("verifies optional detached signatures", async () => {
    const record = await exportRun(SOURCES, {
      sign(contentHash) {
        return `sig:${contentHash}`;
      },
    });

    await expect(
      verifyRecord(record, {
        verify(contentHash, signature) {
          return signature === `sig:${contentHash}`;
        },
      }),
    ).resolves.toMatchObject({ ok: true });
  });
});
