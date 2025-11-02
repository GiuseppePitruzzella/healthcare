Architettura a Layer

1. Presentation (Frontend)
    - CloudFront (CDN)
    - S3 (Static hosting)
    - React Dashboard

2. API & Gateway
    - API Gateway (WebSocket)
    - Application Load Balancer (HTTP)
    - Cognito (Authentication)

3. Application (Business Logic)
    - Microservizi ECS Fargate:
        - Patient Service
        - Vitals Service
        - Alert Service
        - Analytics Service

    - Serverless Lambda:
        - vitals-simulator
        - vitals-consumer
        - anomaly-detector
        - daily-aggregator

4. Integration (Messaging)
    - SQS (Queuing)
    - SNS (Pub/Sub notifications)
    - EventBridge (Scheduling)

5. Data (Persistence)
    - DynamoDB (NoSQL - real-time data)
    - RDS PostgreSQL (Relational - analytics)
    - S3 (Object storage - raw data)

6. Security & Monitoring
    - IAM (Access control)
    - Secrets Manager (Credentials)
    - CloudWatch (Logs, Metrics, Alarms)
    - X-Ray (Tracing)

7. DevOps
    - GitHub (Source control)
    - GitHub Actions (CI/CD)
    - ECR (Container registry)
    - CloudFormation (IaC)