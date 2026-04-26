FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*
COPY producer/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY producer/shipment_producer.py producer/seed_data.py producer/trade_calibration.py \
    producer/real_supplier_names.py producer/generate_supplier_coords.py ./
COPY schemas/shipment_event.avsc /schemas/shipment_event.avsc
ENV SHIPMENT_AVRO_SCHEMA_PATH=/schemas/shipment_event.avsc
CMD ["python", "shipment_producer.py"]
