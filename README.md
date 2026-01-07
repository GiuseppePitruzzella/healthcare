<br />
<div align="center">
<a href="[https://github.com/GiuseppePitruzzella/healthcare](https://github.com/GiuseppePitruzzella/healthcare)">
<img src="assets/img/logo.png" alt="Logo" width="300">
</a>

<h3 align="center">Healthcare</h3>

<p align="center">
A Cloud-Native Serverless Hospital Monitoring System built on AWS.
<br />
<a href="[https://github.com/GiuseppePitruzzella/healthcare/issues](https://github.com/GiuseppePitruzzella/healthcare/issues)">Report Bug</a>
·
<a href="[https://github.com/GiuseppePitruzzella/healthcare/issues](https://github.com/GiuseppePitruzzella/healthcare/issues)">Request Feature</a>
</p>
</div>

## 📘 Project Overview

**Healthcare** is a cloud-native, serverless solution designed to revolutionize patient monitoring in hospital environments. It addresses the critical need for real-time data processing and immediate response to medical anomalies.

This system simulates an Internet of Medical Things (IoMT) environment where patient vital signs are continuously collected and analyzed. By leveraging an Event-Driven architecture on AWS, Healthcare moves away from inefficient polling mechanisms to a reactive model. Data is pushed instantly to a live dashboard via WebSockets, and critical conditions trigger immediate multi-channel alerts (email and visual notifications).

**Key Features:**

* **Real-Time Monitoring:** Live visualization of patient vitals (Heart Rate, Blood Pressure, SpO2, Temperature) using WebSockets.
* **Instant Alerting:** Automatic detection of critical conditions (e.g., Tachycardia, Hypoxia) with immediate notifications via Amazon SNS.
* **Serverless Architecture:** Built entirely on AWS Lambda, DynamoDB, and API Gateway for automatic scalability and pay-per-use efficiency.
* **Security First:** Zero-Trust security model using Amazon Cognito for authentication and fine-grained IAM roles for infrastructure permissions.
* **DevOps Automation:** Infrastructure defined as code with Terraform, containerized local development with Docker, and CI/CD pipelines via GitHub Actions.

## 📦 Dataset Setup

The project uses a synthetic dataset inspired by the **MIMIC-III** (Medical Information Mart for Intensive Care) clinical database to simulate realistic patient vitals.

To generate data:
1. **Local Simulation:** The `vitals-simulator` component can be run locally using Docker. It generates a continuous stream of vital signs based on a "Random Walk" algorithm with physiological constraints.
2. 
**Cloud Simulation:** In the deployed AWS environment, an Amazon EventBridge Scheduler triggers the simulator Lambda function every 5 minutes to populate the DynamoDB `VitalSigns` table.

No manual dataset download is required to start seeing data; the simulator creates it dynamically.

## 🧪 Environment Setup
To run this project locally or deploy it to AWS, you need the following tools installed:

* **Node.js** (v18+) & **npm**
* **Python** (v3.11+)
* **Docker** & **Docker Compose**
* **Terraform** (v1.5+)
* **AWS CLI** (configured with your credentials)

**1. Clone the repository:**

```bash
git clone https://github.com/GiuseppePitruzzella/healthcare.git
cd healthcare
```

**2. Local Development (Docker):**
Start the entire stack (Frontend + Simulator + Jupyter) locally:

```bash
docker-compose up
```

* **Frontend:** Access the dashboard at `http://localhost:3000`
* **Jupyter:** Access notebooks at `http://localhost:8888`

**3. Cloud Deployment (Terraform):**
Initialize and apply the infrastructure configuration:

```bash
cd terraform
terraform init
terraform apply
```

* After deployment, Terraform will output the URLs for the S3 website, API Gateway, and Cognito domain.
* **Note:** Remember to update the `callback_urls` in `main.tf` with the actual S3 URL provided by the output and re-run `terraform apply` to finalize Cognito configuration.

---

## 📁 Project Structure

```bash
healthcare/
├── .github/                        # CI/CD Workflows
│   ├── workflows/
│   │   ├── deploy-backend.yml      # Deploy Lambda & Infrastructure
│   │   └── deploy-frontend.yml     # Build React & Sync to S3
│
├── docs/                           # Project Documentation
│   ├── architecture.md             # Diagrams and ADRs
│   └── Relazione.pdf               # Documentation
│
├── docker/                         # Docker Configuration
│   ├── frontend-dev/               # Multi-stage build for React
│   ├── local-simulator/            # Local Python runner
│   └── data-processor/             # Jupyter Notebook environment
│
├── frontend/                       # React Application (SPA)
│   ├── public/
│   ├── src/
│   │   ├── components/             # UI Components (Dashboard, Charts)
│   │   ├── contexts/               # AuthContext (Cognito), WebSocketContext
│   │   ├── services/               # API calls (Axios config)
│   │   └── hooks/                  # Custom hooks (e.g., useVitals)
│   ├── package.json
│   └── Dockerfile                  # Production build definition
│
├── terraform/                      # Infrastructure as Code (IaC)
│   ├── main.tf                     # Main resource definition (AWS)
│   ├── variables.tf                # Configurable variables
│   └── outputs.tf                  # Deployment outputs (URLs, IDs)
│
├── lambda/                         # Backend Logic (Python)
│   ├── vitals-simulator/           # Data generation logic
│   │   └── app.py
│   │
│   ├── alert-detector/             # Stream processing & Alerting
│   │   └── app.py
│   │
│   ├── connection-manager/         # WebSocket lifecycle management
│   │   └── app.py
│   │
│   └── api-handler/                # REST API Handler for patient data
│       └── app.py
│
├── data/                           # Data Management
│   └── patients.csv/               # Patients Data
│
├── docker-compose.yml              # Local orchestration
├── .gitignore
├── README.md                       # Entry point documentation
└── requirements.txt                # Python dependencies

```

---

## 🧾 License

Distributed under the **GNU GPLv3 License**.
See `LICENSE.txt` for details.

## 📬 Contact

Giuseppe Pitruzzella – [GitHub](https://github.com/GiuseppePitruzzella)
Project Repository – [healthcare](https://github.com/GiuseppePitruzzella/healthcare)
