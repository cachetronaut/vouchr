import { createHash } from "node:crypto";

export type JsonRecord = Readonly<Record<string, unknown>>;

export interface DecisionStep {
  readonly stage: string;
  readonly ok: boolean;
  readonly detail: JsonRecord;
}

export interface VouchrSources {
  readonly runId: string;
  readonly events: readonly unknown[];
  readonly decisions: readonly DecisionStep[];
  readonly usage: unknown;
  readonly policyLog?: readonly unknown[];
  readonly tokenLog?: readonly unknown[];
  readonly exportedAt?: string;
}

export interface VouchrRecord {
  readonly runId: string;
  readonly events: readonly unknown[];
  readonly decisions: readonly DecisionStep[];
  readonly usage: unknown;
  readonly policyLog: readonly unknown[];
  readonly tokenLog: readonly unknown[];
  readonly exportedAt: string;
  readonly contentHash: string;
  readonly signature?: string;
}

export interface VouchrSigner {
  sign(contentHash: string): Promise<string> | string;
}

export interface VouchrVerifier {
  verify(contentHash: string, signature: string): Promise<boolean> | boolean;
}

export interface VerifyResult {
  readonly ok: boolean;
  readonly reason?: "hash_mismatch" | "signature_mismatch";
  readonly expectedHash?: string;
}

export async function exportRun(
  sources: VouchrSources,
  signer?: VouchrSigner,
): Promise<VouchrRecord> {
  const base = {
    runId: sources.runId,
    events: sources.events,
    decisions: sources.decisions,
    usage: sources.usage,
    policyLog: sources.policyLog ?? [],
    tokenLog: sources.tokenLog ?? [],
    exportedAt: sources.exportedAt ?? new Date().toISOString(),
  };
  const contentHash = hashVouchrContent(base);
  const signature = signer === undefined ? undefined : await signer.sign(contentHash);
  return { ...base, contentHash, signature };
}

export async function verifyRecord(
  record: VouchrRecord,
  verifier?: VouchrVerifier,
): Promise<VerifyResult> {
  const expectedHash = hashVouchrContent(record);
  if (expectedHash !== record.contentHash) {
    return { ok: false, reason: "hash_mismatch", expectedHash };
  }
  if (record.signature !== undefined && verifier !== undefined) {
    const signatureOk = await verifier.verify(record.contentHash, record.signature);
    if (!signatureOk) {
      return { ok: false, reason: "signature_mismatch", expectedHash };
    }
  }
  return { ok: true, expectedHash };
}

export function hashVouchrContent(record: Omit<VouchrRecord, "contentHash" | "signature">): string {
  return createHash("sha256")
    .update(canonicalize(vouchrContent(record)))
    .digest("hex");
}

export function canonicalize(value: unknown): string {
  return JSON.stringify(value, replacer, 0);
}

function vouchrContent(record: Omit<VouchrRecord, "contentHash" | "signature">): JsonRecord {
  return {
    runId: record.runId,
    events: record.events,
    decisions: record.decisions,
    usage: record.usage,
    policyLog: record.policyLog,
    tokenLog: record.tokenLog,
    exportedAt: record.exportedAt,
  };
}

function replacer(_key: string, value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}
