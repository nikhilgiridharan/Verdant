"""
Executes data quality checks against Postgres and reports results.

Standalone: python -m data_quality.runner
Pipeline: from data_quality.runner import run_checks_after_pipeline
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import psycopg2

from data_quality.checks import CHECKS

ROOT = Path(__file__).resolve().parents[1]
REPORT_PATH = ROOT / "docs" / "data_quality_report.json"
LAST_RUN_PATH = ROOT / "data_quality" / "last_run.json"

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://carbonpulse:carbonpulse123@localhost:5432/carbonpulse",
)

OPERATORS = {
    "eq": lambda actual, expected: actual == expected,
    "lte": lambda actual, expected: actual <= expected,
    "gte": lambda actual, expected: actual >= expected,
    "lt": lambda actual, expected: actual < expected,
    "gt": lambda actual, expected: actual > expected,
}


def _connect():
    return psycopg2.connect(DATABASE_URL)


def _evaluate_check(check: dict, actual_value: Any) -> bool:
    if actual_value is None:
        return False
    op_fn = OPERATORS.get(check["operator"], OPERATORS["eq"])
    expected = check["expected"]
    if check["operator"] in ("eq", "lte", "gte", "lt", "gt"):
        try:
            if isinstance(expected, int) and not isinstance(actual_value, bool):
                actual_value = float(actual_value)
        except (TypeError, ValueError):
            return False
    return bool(op_fn(actual_value, expected))


def run_checks(connection=None, checks: list[dict] | None = None, *, verbose: bool = True) -> dict:
    """Run all data quality checks and return a structured report."""
    if checks is None:
        checks = CHECKS

    owns_connection = connection is None
    if owns_connection:
        connection = _connect()

    results: list[dict] = []
    passed = 0
    failed = 0

    try:
        cursor = connection.cursor()
        for check in checks:
            try:
                cursor.execute(check["query"])
                row = cursor.fetchone()
                actual_value = row[0] if row else None
                check_passed = _evaluate_check(check, actual_value)

                result = {
                    "id": check["id"],
                    "name": check["name"],
                    "severity": check["severity"],
                    "status": "PASS" if check_passed else "FAIL",
                    "expected": check["expected"],
                    "actual": float(actual_value) if actual_value is not None else None,
                    "operator": check["operator"],
                    "description": check["description"],
                }
                if check_passed:
                    passed += 1
                else:
                    failed += 1
            except Exception as exc:  # noqa: BLE001
                result = {
                    "id": check["id"],
                    "name": check["name"],
                    "severity": check["severity"],
                    "status": "ERROR",
                    "error": str(exc),
                    "description": check["description"],
                }
                failed += 1

            results.append(result)

            if verbose:
                icon = "✓" if result["status"] == "PASS" else "✗" if result["status"] == "FAIL" else "!"
                print(
                    f"  [{icon}] {check['id']} {check['name']:<28} {result['status']:<6} "
                    f"(severity: {check['severity']})"
                )
                if result["status"] == "FAIL":
                    print(
                        f"      Expected {check['operator']} {check['expected']}, "
                        f"got {result.get('actual')}"
                    )
                if result["status"] == "ERROR":
                    print(f"      Error: {result.get('error')}")

        cursor.close()

        has_critical_failure = any(
            r["status"] in ("FAIL", "ERROR") and r["severity"] == "CRITICAL" for r in results
        )

        report = {
            "run_timestamp": datetime.now(timezone.utc).isoformat(),
            "total_checks": len(results),
            "passed": passed,
            "failed": failed,
            "overall_status": "FAIL" if has_critical_failure else "PASS",
            "checks": results,
        }

        _update_pipeline_status(connection, report)
        if owns_connection:
            connection.commit()

        if verbose:
            print(f"\n  {passed}/{len(results)} checks passed. Overall: {report['overall_status']}")

        return report
    finally:
        if owns_connection and connection is not None:
            connection.close()


def _update_pipeline_status(connection, report: dict) -> None:
    status = "HEALTHY" if report["overall_status"] == "PASS" else "DEGRADED"
    with connection.cursor() as cur:
        cur.execute(
            """
            INSERT INTO pipeline_status (component, status, last_heartbeat, records_processed, last_error)
            VALUES ('dq-checks', %s, %s, %s, %s)
            ON CONFLICT (component) DO UPDATE SET
              status = EXCLUDED.status,
              last_heartbeat = EXCLUDED.last_heartbeat,
              records_processed = EXCLUDED.records_processed,
              last_error = EXCLUDED.last_error
            """,
            (
                status,
                datetime.now(timezone.utc),
                report["passed"],
                None if report["overall_status"] == "PASS" else "critical DQ check failed",
            ),
        )


def save_report(report: dict, path: str | Path | None = None) -> Path:
    """Persist DQ report JSON and sync API-facing last_run.json."""
    out = Path(path) if path else REPORT_PATH
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")

    legacy = {
        "ran_at": report["run_timestamp"],
        "overall_status": report["overall_status"],
        "passed": report.get("passed", 0),
        "failed": report.get("failed", 0),
        "results": [
            {
                "expectation": f"{c.get('id', '')} {c.get('name', '')}".strip(),
                "passed": c.get("status") == "PASS",
                "status": c.get("status"),
                "severity": c.get("severity"),
                "unexpected_rows": c.get("actual") if c.get("status") == "FAIL" else 0,
                "actual": c.get("actual"),
                "expected": c.get("expected"),
                "operator": c.get("operator"),
            }
            for c in report.get("checks", [])
        ],
        "checks": report.get("checks", []),
        "report_path": str(out.relative_to(ROOT)),
    }
    LAST_RUN_PATH.parent.mkdir(parents=True, exist_ok=True)
    LAST_RUN_PATH.write_text(json.dumps(legacy, indent=2), encoding="utf-8")
    return out


def run_checks_after_pipeline(connection=None, *, verbose: bool = True) -> dict:
    """
    Post-pipeline hook: run checks, save report, warn on failure without raising.
    """
    if verbose:
        print("\nRunning data quality checks...")
    try:
        report = run_checks(connection=connection, verbose=verbose)
        path = save_report(report)
        if verbose:
            print(f"  Report saved to {path}")
        if report["overall_status"] == "FAIL":
            print("WARNING: Data quality checks failed. See report for details.")
        return report
    except Exception as exc:  # noqa: BLE001
        print(f"WARNING: Data quality checks could not run: {exc}")
        return {
            "run_timestamp": datetime.now(timezone.utc).isoformat(),
            "overall_status": "ERROR",
            "error": str(exc),
            "checks": [],
        }


def main() -> int:
    print("=" * 60)
    print("VERDANT DATA QUALITY CHECKS")
    print("=" * 60)
    try:
        report = run_checks()
    except Exception as exc:  # noqa: BLE001
        report = {
            "run_timestamp": datetime.now(timezone.utc).isoformat(),
            "total_checks": len(CHECKS),
            "passed": 0,
            "failed": len(CHECKS),
            "overall_status": "ERROR",
            "error": str(exc),
            "checks": [],
        }
        print(f"  ERROR: {exc}")
    path = save_report(report)
    print(f"  Report saved to {path}")
    return 1 if report["overall_status"] != "PASS" else 0


if __name__ == "__main__":
    raise SystemExit(main())
