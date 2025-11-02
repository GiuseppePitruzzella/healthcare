# Legenda Architettura

## Colori e Significati

- **🟠 Arancione**: Servizi di Compute (ECS, Lambda)
- **🟢 Verde**: Storage (S3, ECR)
- **🔵 Blu**: Database (DynamoDB, RDS)
- **🔷 Azzurro**: Networking (ALB, API Gateway, CloudFront)
- **🔴 Rosso**: Security (Cognito, IAM, Secrets Manager)
- **🟣 Rosa**: Integration & Messaging (SQS, SNS, EventBridge)
- **🔵 Celeste**: Frontend (React)
- **🟣 Viola**: External (MIMIC-III)
- **🔴 Rosso chiaro**: Monitoring (CloudWatch, X-Ray)

## Tipi di Connessioni

- **Freccia continua (→)**: Flusso dati sincrono / Chiamata diretta
- **Freccia tratteggiata (-.->)**: Trigger asincrono / Event-driven / Backup