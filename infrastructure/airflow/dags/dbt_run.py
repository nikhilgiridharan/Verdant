"""Utility DAG stubs for dbt execution in MWAA/GKE-style environments."""

from __future__ import annotations

import datetime as dt

from airflow import DAG
from airflow.operators.bash import BashOperator

with DAG(
    dag_id="carbonpulse_dbt_run_stub",
    start_date=dt.datetime(2024, 1, 1),
    schedule_interval=None,
    catchup=False,
    tags=["carbonpulse", "dbt"],
) as dag:
    BashOperator(
        task_id="echo",
        bash_command="echo 'Use MWAA/GKE to run dbt against Snowflake in prod.'",
    )
