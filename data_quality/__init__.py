"""Data quality checks for the Verdant pipeline."""

from data_quality.checks import CHECKS

__all__ = ["CHECKS", "run_checks", "run_checks_after_pipeline", "save_report"]


def run_checks(*args, **kwargs):
    from data_quality.runner import run_checks as _run_checks

    return _run_checks(*args, **kwargs)


def run_checks_after_pipeline(*args, **kwargs):
    from data_quality.runner import run_checks_after_pipeline as _hook

    return _hook(*args, **kwargs)


def save_report(*args, **kwargs):
    from data_quality.runner import save_report as _save_report

    return _save_report(*args, **kwargs)
