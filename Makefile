DASHBOARD_PORT ?= 3080

.PHONY: up down logs seed kafka-topics quality test clean local ui

up:
	docker compose up -d

# Full local stack: requires Docker Desktop (or daemon) running.
local:
	@docker info >/dev/null 2>&1 || (echo "ERROR: Docker is not running. Start Docker Desktop, then retry: make local" && exit 1)
	docker compose up -d
	@echo "Waiting for Postgres..."
	@sleep 8
	$(MAKE) kafka-topics
	$(MAKE) seed
	@echo ""
	@echo "Ready:"
	@echo "  Dashboard  http://localhost:$(DASHBOARD_PORT)"
	@echo "  API docs   http://localhost:8000/docs"
	@echo "  Airflow    http://localhost:8080  (admin / admin)"
	@echo "  MinIO UI   http://localhost:9001  (carbonpulse / carbonpulse123)"
	@echo "  MLflow     http://localhost:5000"

down:
	docker compose down

logs:
	docker compose logs -f

seed:
	PYTHONPATH=. python ingestion/producer/seed_data.py

kafka-topics:
	docker compose exec -T kafka kafka-topics --bootstrap-server kafka:9092 --create --if-not-exists --topic shipment-events --partitions 3 --replication-factor 1
	docker compose exec -T kafka kafka-topics --bootstrap-server kafka:9092 --create --if-not-exists --topic emissions-processed --partitions 3 --replication-factor 1
	docker compose exec -T kafka kafka-topics --bootstrap-server kafka:9092 --create --if-not-exists --topic anomaly-alerts --partitions 3 --replication-factor 1

quality:
	PYTHONPATH=. python data_quality/run_checks.py

test:
	pytest tests/ -v --tb=short

clean:
	docker compose down -v

# Dashboard only (no Docker): needs API on :8000 for data — run `docker compose up -d api postgres` or full stack.
ui:
	cd dashboard && npm install && DASHBOARD_PORT=$(DASHBOARD_PORT) npm run dev
