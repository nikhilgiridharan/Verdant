"""Data quality check tests."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from data_quality.checks import CHECKS


class TestDataQualityCheckDefinitions:
    def test_check_definitions_valid(self):
        for check in CHECKS:
            assert check["id"].startswith("DQ-")
            assert isinstance(check["name"], str) and check["name"]
            assert "SELECT" in check["query"].upper()
            assert "shipment_silver_summary" in check["query"] or "suppliers" in check["query"]
            assert check["operator"] in ("eq", "lte", "gte", "lt", "gt")
            assert check["severity"] in ("CRITICAL", "HIGH", "MEDIUM", "LOW")

    def test_no_duplicate_check_ids(self):
        ids = [c["id"] for c in CHECKS]
        assert len(ids) == len(set(ids))

    def test_expected_check_count(self):
        assert len(CHECKS) == 9


class TestRunChecksExecution:
    @patch("data_quality.runner.REPORT_PATH")
    @patch("data_quality.runner.LAST_RUN_PATH")
    @patch("data_quality.runner._connect")
    def test_run_checks_all_pass(self, mock_connect, mock_last_run, mock_report):
        from data_quality.runner import main

        mock_report.parent.mkdir = MagicMock()
        mock_report.write_text = MagicMock()
        mock_last_run.parent.mkdir = MagicMock()
        mock_last_run.write_text = MagicMock()

        mock_cur = MagicMock()
        mock_cur.fetchone.side_effect = [
            (0,),  # DQ-001
            (0,),  # DQ-002
            (0,),  # DQ-003
            (0,),  # DQ-004
            (0,),  # DQ-005
            (0,),  # DQ-006
            (2.0,),  # DQ-007 freshness hours
            (95.0,),  # DQ-008 coverage
            (0,),  # DQ-009
        ]
        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cur
        mock_connect.return_value = mock_conn

        exit_code = main()
        assert exit_code == 0
        mock_conn.commit.assert_called()

    @patch("data_quality.runner.REPORT_PATH")
    @patch("data_quality.runner.LAST_RUN_PATH")
    @patch("data_quality.runner._connect")
    def test_run_checks_fails_on_critical(self, mock_connect, mock_last_run, mock_report):
        from data_quality.runner import main

        mock_report.parent.mkdir = MagicMock()
        mock_report.write_text = MagicMock()
        mock_last_run.parent.mkdir = MagicMock()
        mock_last_run.write_text = MagicMock()

        mock_cur = MagicMock()
        mock_cur.fetchone.side_effect = [
            (3,),  # DQ-001 critical fail
            (0,),
            (0,),
            (0,),
            (0,),
            (0,),
            (2.0,),
            (95.0,),
            (0,),
        ]
        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cur
        mock_connect.return_value = mock_conn

        exit_code = main()
        assert exit_code == 1
