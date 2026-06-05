from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, replace
from typing import Any, Literal, Protocol


@dataclass(frozen=True)
class DecisionStep:
    stage: str
    ok: bool
    detail: dict[str, Any]


@dataclass(frozen=True)
class VouchrSources:
    run_id: str
    events: list[Any]
    decisions: list[DecisionStep]
    usage: Any
    policy_log: list[Any] | None = None
    token_log: list[Any] | None = None
    exported_at: str = "1970-01-01T00:00:00.000Z"


@dataclass(frozen=True)
class VouchrRecord:
    run_id: str
    events: list[Any]
    decisions: list[DecisionStep]
    usage: Any
    policy_log: list[Any]
    token_log: list[Any]
    exported_at: str
    content_hash: str
    signature: str | None = None


class VouchrSigner(Protocol):
    def sign(self, content_hash: str) -> str: ...


class VouchrVerifier(Protocol):
    def verify(self, content_hash: str, signature: str) -> bool: ...


@dataclass(frozen=True)
class VerifyResult:
    ok: bool
    reason: Literal["hash_mismatch", "signature_mismatch"] | None = None
    expected_hash: str | None = None


def export_run(sources: VouchrSources, signer: VouchrSigner | None = None) -> VouchrRecord:
    base = VouchrRecord(
        run_id=sources.run_id,
        events=sources.events,
        decisions=sources.decisions,
        usage=sources.usage,
        policy_log=sources.policy_log or [],
        token_log=sources.token_log or [],
        exported_at=sources.exported_at,
        content_hash="",
    )
    content_hash = hash_vouchr_content(base)
    signature = signer.sign(content_hash) if signer is not None else None
    return replace(base, content_hash=content_hash, signature=signature)


def export_local_run(sources: VouchrSources, signer: VouchrSigner | None = None) -> VouchrRecord:
    return export_run(sources, signer)


def verify_record(record: VouchrRecord, verifier: VouchrVerifier | None = None) -> VerifyResult:
    expected_hash = hash_vouchr_content(record)
    if expected_hash != record.content_hash:
        return VerifyResult(ok=False, reason="hash_mismatch", expected_hash=expected_hash)
    if (
        record.signature is not None
        and verifier is not None
        and not verifier.verify(record.content_hash, record.signature)
    ):
        return VerifyResult(ok=False, reason="signature_mismatch", expected_hash=expected_hash)
    return VerifyResult(ok=True, expected_hash=expected_hash)


def hash_vouchr_content(record: VouchrRecord) -> str:
    return hashlib.sha256(canonicalize(_vouchr_content(record)).encode("utf-8")).hexdigest()


def canonicalize(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), default=_json_default)


def _vouchr_content(record: VouchrRecord) -> dict[str, Any]:
    return {
        "runId": record.run_id,
        "events": record.events,
        "decisions": record.decisions,
        "usage": record.usage,
        "policyLog": record.policy_log,
        "tokenLog": record.token_log,
        "exportedAt": record.exported_at,
    }


def _json_default(value: object) -> object:
    if hasattr(value, "__dict__"):
        converted: dict[str, Any] = {}
        for key, item in vars(value).items():
            if item is not None:
                converted[_camel(key)] = item
        return converted
    raise TypeError(f"Cannot serialize {type(value)!r}")


def _camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])
