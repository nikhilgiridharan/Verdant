"""Stub DAG for Great Expectations execution."""

from __future__ import annotations

import datetime as dt

from airflow import DAG
from airflow.operators.bash import BashOperator

with DAG(
    dag_id="carbonpulse_data_quality_stub",
    start_date=dt.datetime(2024, 1, 1),
    schedule_interval=None,
    catchup=False,
    tags=["carbonpulse", "quality"],
) as dag:
    BashOperator(
        task_id="echo",
        bash_command="echo 'Run data_quality/run_checks.py in CI and scheduled jobs.'",
    )
