FROM python:3.11-slim

LABEL maintainer="Giuseppe Pitruzzella"
LABEL description="Data processing for hospital data"

# Imposta working directory
WORKDIR /app

# Installa dipendenze di sistema
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copia requirements
COPY docker/data-processor/requirements.txt .

# Installa dipendenze Python
RUN pip install --no-cache-dir -r requirements.txt

# Crea directory per dati e script
RUN mkdir -p /app/data /app/scripts /app/notebooks

# Copia script di elaborazione dati
COPY scripts/ /app/scripts/
COPY data/ /app/data/

# Espone porta Jupyter
EXPOSE 8888

# Set variabili d'ambiente
ENV PYTHONUNBUFFERED=1
ENV JUPYTER_ENABLE_LAB=yes

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8888/api || exit 1

# Comando di avvio Jupyter
CMD ["jupyter", "lab", \
     "--ip=0.0.0.0", \
     "--port=8888", \
     "--no-browser", \
     "--allow-root", \
     "--NotebookApp.token=''", \
     "--NotebookApp.password=''"]