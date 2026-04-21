FROM apache/spark-py:v3.5.1
USER root
WORKDIR /opt/carbonpulse
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY spark_processor.py silver_transformer.py ./
USER spark
