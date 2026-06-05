from __future__ import annotations

from dataclasses import replace

from vouchr import DecisionStep, VouchrSources, export_local_run, export_run, verify_record

SOURCES = VouchrSources(
    run_id="run_1",
    events=[{"id": "event_1", "type": "stage", "stage": "execute"}],
    decisions=[DecisionStep(stage="execute", ok=True, detail={"actual": {"model_cost_usd": 1}})],
    usage={"budget_task": {"cumulative": {"model_cost_usd": 1}}},
    policy_log=[{"ruleId": "allow"}],
    token_log=[{"action": "authorize", "ok": True}],
    exported_at="2026-06-04T12:00:00.000Z",
)


def test_exports_deterministic_records_and_verifies_hash() -> None:
    first = export_run(SOURCES)
    second = export_run(SOURCES)

    assert first == second
    assert len(first.content_hash) == 64
    assert verify_record(first).ok


def test_detects_tampered_records() -> None:
    record = export_run(SOURCES)
    tampered = replace(record, decisions=[DecisionStep(stage="execute", ok=False, detail={})])

    result = verify_record(tampered)

    assert not result.ok
    assert result.reason == "hash_mismatch"


def test_verifies_optional_detached_signatures() -> None:
    record = export_run(SOURCES, StaticSigner())

    assert verify_record(record, StaticVerifier()).ok


def test_export_local_facade_exports_structural_sources() -> None:
    record = export_local_run(
        VouchrSources(
            run_id="run_local",
            events=[],
            decisions=[],
            usage={},
            exported_at="2026-06-04T12:00:00.000Z",
        )
    )

    assert record.run_id == "run_local"
    assert len(record.content_hash) == 64


class StaticSigner:
    def sign(self, content_hash: str) -> str:
        return f"sig:{content_hash}"


class StaticVerifier:
    def verify(self, content_hash: str, signature: str) -> bool:
        return signature == f"sig:{content_hash}"
