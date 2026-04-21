from __future__ import annotations

import datetime as dt

from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator

DEFAULT_ARGS = {
    "owner": "carbonpulse",
    "retries": 1,
    "retry_delay": dt.timedelta(minutes=2),
}


def _noop() -> None:
    return


with DAG(
    dag_id="carbonpulse_pipeline",
    default_args=DEFAULT_ARGS,
    schedule_interval="*/15 * * * *",
    start_date=dt.datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    dagrun_timeout=dt.timedelta(minutes=10),
    tags=["carbonpulse"],
) as dag:
    check_kafka_lag = BashOperator(
        task_id="check_kafka_lag",
        bash_command="echo 'kafka lag check (stub)'",
    )
    run_silver_transform = PythonOperator(
        task_id="run_silver_transform",
        python_callable=_noop,
    )
    run_dbt_staging = BashOperator(
        task_id="run_dbt_staging",
        bash_command="echo 'dbt run --select staging (run in warehouse container)'",
    )
    run_dbt_intermediate = BashOperator(
        task_id="run_dbt_intermediate",
        bash_command="echo 'dbt run --select intermediate'",
    )
    run_dbt_marts = BashOperator(
        task_id="run_dbt_marts",
        bash_command="echo 'dbt run --select marts'",
    )
    run_dbt_tests = BashOperator(
        task_id="run_dbt_tests",
        bash_command="echo 'dbt test'",
    )
    run_data_quality = PythonOperator(
        task_id="run_data_quality",
        python_callable=_noop,
    )
    refresh_api_cache = PythonOperator(
        task_id="refresh_api_cache",
        python_callable=_noop,
    )
    send_anomaly_alerts = PythonOperator(
        task_id="send_anomaly_alerts",
        python_callable=_noop,
    )

    (
        check_kafka_lag
        >> run_silver_transform
        >> run_dbt_staging
        >> run_dbt_intermediate
        >> run_dbt_marts
        >> run_dbt_tests
        >> run_data_quality
        >> [refresh_api_cache, send_anomaly_alerts]
    )
