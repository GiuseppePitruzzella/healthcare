<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/GiuseppePitruzzella/healthcare">
    <img src="assets/img/logo.png" alt="Logo" width="300">
  </a>

  <h3 align="center">Healthcare</h3>

  <p align="center">
    ...
    <a href="https://github.com/GiuseppePitruzzella/healthcare/issues">Report Bug</a>
    <a href="https://github.com/GiuseppePitruzzella/healthcare/issues">Request Feature</a>
  </p>
</div>


## 📘 Project Overview

## 📦 Dataset Setup

...

## 🧪 Environment Setup

---

## 📁 Project Structure

```bash
halethcare/
├── .github/                        # CI/CD Workflows 
│   ├── workflows/
│   │   ├── deploy-backend.yml      # Deploy Lambda & Infrastructure
│   │   └── deploy-frontend.yml     # Build React & Sync to S3
│
├── docs/                           # Documentazione Progetto 
│   ├── architecture.md             # Diagrammi e decisioni (ADR)
│   ├── api-specs.md                # Specifiche OpenAPI/Swagger
│   └── runbooks/                   # Guide operative (es. Disaster Recovery)
│
├── frontend/                       # React Application [cite: 3]
│   ├── public/
│   ├── src/
│   │   ├── components/             # UI Components (Dashboard, Charts)
│   │   ├── contexts/               # AuthContext (Cognito), WebSocketContext
│   │   ├── services/               # API calls (Axios config)
│   │   └── hooks/                  # Custom hooks (es. useVitals)
│   ├── package.json
│   └── tailwind.config.js
│
├── infrastructure/                 # CloudFormation (IaC) 
│   ├── 01-networking.yaml          # VPC, Subnets (necessario per RDS)
│   ├── 02-dynamodb.yaml            # Tabelle NoSQL 
│   ├── 03-rds.yaml                 # (Nuovo) Database Relazionale per Analytics
│   ├── 04-cognito.yaml             # (Nuovo) User Pools & Identity Pools
│   ├── 05-lambda.yaml              # Definizioni Function & Roles 
│   ├── 06-api-gateway.yaml         # REST & WebSocket APIs 
│   └── 07-sagemaker.yaml           # (Nuovo) ML Endpoints
│
├── lambda/                         # Backend Logic (Python) [cite: 3]
│   ├── common/                     # Shared Library (Lambda Layer)
│   │   └── python/
│   │       ├── db_utils.py         # Connessioni DynamoDB/RDS riutilizzabili
│   │       └── models.py           # Data classes condivise
│   │
│   ├── vitals_simulator/           # Generazione dati [cite: 3]
│   │   └── app.py
│   │
│   ├── alert_detector/             # Analisi & ML Trigger [cite: 3]
│   │   ├── app.py
│   │   └── ml_client.py            # Client per chiamare SageMaker
│   │
│   ├── api_handler/                # REST API Backend [cite: 3]
│   │   └── app.py
│   │
│   ├── notifier/                   # (Nuovo) WebSocket Handler
│   │   └── app.py                  # Gestione connessioni e push messages
│   │
│   └── etl_aggregator/             # (Nuovo) Data warehousing
│       └── app.py                  # Spostamento dati da DynamoDB a RDS
│
├── ml/                             # (Nuovo) Machine Learning Section
│   ├── notebooks/                  # Jupyter Notebooks per esplorazione dati
│   ├── training/                   # Script di training del modello
│   └── models/                     # Artefatti dei modelli serializzati
│
├── scripts/                        # Utility Scripts 
│   ├── deploy.sh                   # Orchestrator per CloudFormation
│   ├── seed_data.py                # Script per caricare dati fake iniziali
│   └── local_test.sh               # Test delle Lambda in locale (SAM/Docker)
│
├── data/                           # Dataset
│   ├── final/                      # Enriched MIMIC-III Data
│   ├── processed/                  # Filtered MIMIC-III Data
│   └── raw/                        # Raw MIMIC-III Data
│
├── .gitignore
├── README.md                       # Entry point documentation 
└── requirements-dev.txt            # Dipendenze di sviluppo (es. pytest, boto3)
```

---

## 🧾 License

Distributed under the **GNU GPLv3 License**.
See `LICENSE.txt` for details.


## 📬 Contact

Giuseppe Pitruzzella – [GitHub](https://github.com/GiuseppePitruzzella)
Project Repository – [healthcare](https://github.com/GiuseppePitruzzella/healthcare)
