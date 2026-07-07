"""Data quality check tests."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

# Check definitions mirrored from data_quality/run_checks.py (source of truth in that module)
CHECKS = [
    ("null_shipment_id", "SELECT COUNT(*) FROM shipment_silver_summary WHERE shipment_id IS NULL"),
    (
        "weight_bounds",
        "SELECT COUNT(*) FROM shipment_silver_summary "
        "WHERE weight_kg IS NULL OR weight_kg < 0.1 OR weight_kg > 50000",
    ),
    (
        "emissions_bounds",
        "SELECT COUNT(*) FROM shipment_silver_summary "
        "WHERE emissions_kg_co2e IS NULL OR emissions_kg_co2e < 0.001 "
        "OR emissions_kg_co2e > 500000",
    ),
    (
        "transport_modes",
        "SELECT COUNT(*) FROM shipment_silver_summary "
        "WHERE transport_mode NOT IN ('AIR','OCEAN','TRUCK','RAIL')",
    ),
    (
        "duplicate_shipment_id",
        "SELECT COUNT(*) FROM ("
        "SELECT shipment_id, COUNT(*) c FROM shipment_silver_summary "
        "GROUP BY shipment_id HAVING COUNT(*)>1) t",
    ),
]


class TestDataQualityCheckDefinitions:
    def test_check_definitions_valid(self):
        for name, query in CHECKS:
            assert isinstance(name, str) and name
            assert isinstance(query, str) and "SELECT" in query.upper()
            assert "shipment_silver_summary" in query

    def test_no_duplicate_check_names(self):
        names = [c[0] for c in CHECKS]
        assert len(names) == len(set(names))

    def test_expected_check_count(self):
        assert len(CHECKS) == 5


class TestRunChecksExecution:
    @patch("data_quality.run_checks.LAST_RUN")
    @patch("data_quality.run_checks.psycopg2.connect")
    def test_run_checks_all_pass(self, mock_connect, mock_last_run):
        from data_quality.run_checks import main

        mock_last_run.parent.mkdir = MagicMock()
        mock_last_run.write_text = MagicMock()

        mock_cur = MagicMock()
        mock_cur.fetchone.side_effect = [(0,), (0,), (0,), (0,), (0,), (0.5,)]
        mock_conn = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur
        mock_connect.return_value = mock_conn

        exit_code = main()
        assert exit_code == 0
        mock_conn.commit.assert_called()

    @patch("data_quality.run_checks.LAST_RUN")
    @patch("data_quality.run_checks.psycopg2.connect")
    def test_run_checks_fails_on_violations(self, mock_connect, mock_last_run):
        from data_quality.run_checks import main

        mock_last_run.parent.mkdir = MagicMock()
        mock_last_run.write_text = MagicMock()

        mock_cur = MagicMock()
        mock_cur.fetchone.side_effect = [(3,), (0,), (0,), (0,), (0,), (0.5,)]
        mock_conn = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur
        mock_connect.return_value = mock_conn

        exit_code = main()
        assert exit_code == 1
