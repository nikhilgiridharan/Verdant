"""Scheduled data quality DAG — runs SQL checks after pipeline cycles."""

from __future__ import annotations

import datetime as dt
import os
import subprocess
import sys
from pathlib import Path

from airflow import DAG
from airflow.operators.python import PythonOperator

ROOT = Path(__file__).resolve().parents[3]


def _run_dq_checks() -> None:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ROOT)
    subprocess.run(
        [sys.executable, "-m", "data_quality.runner"],
        cwd=ROOT,
        env=env,
        check=False,
    )


with DAG(
    dag_id="carbonpulse_data_quality",
    start_date=dt.datetime(2024, 1, 1),
    schedule_interval="*/15 * * * *",
    catchup=False,
    tags=["carbonpulse", "quality"],
) as dag:
    PythonOperator(
        task_id="run_sql_dq_checks",
        python_callable=_run_dq_checks,
    )
