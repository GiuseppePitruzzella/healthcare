FROM python:3.11-slim

LABEL maintainer="Giuseppe Pitruzzella"
LABEL description="IoT Medical Device Simulator"

WORKDIR /app

# Installa dipendenze minime
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copia requirements
COPY docker/local-simulator/requirements.txt .

# Installa dipendenze Python
RUN pip install --no-cache-dir -r requirements.txt

# Copia codice Lambda e script utility
COPY lambda/vitals-simulator/ /app/lambda/vitals-simulator/
COPY scripts/load_patients_on_dynamo.py /app/scripts/

# Copia script wrapper per simulazione locale
COPY docker/local-simulator/simulate.py /app/

# Variabili d'ambiente di default
ENV AWS_DEFAULT_REGION=eu-north-1
ENV PATIENTS_TABLE=Patients
ENV VITAL_SIGNS_TABLE=VitalSigns
ENV SIMULATION_INTERVAL=10
ENV NUM_PATIENTS=50

# Health check
HEALTHCHECK --interval=60s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import boto3; boto3.client('dynamodb').list_tables()" || exit 1


CMD ["python", "simulate.py"]