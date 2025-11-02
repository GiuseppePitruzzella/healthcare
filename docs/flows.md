# Main Flows

## 1. **Flusso Utente → Dashboard**
```
Medico → CloudFront → S3 → React Dashboard → Cognito (auth) → API Gateway/ALB → Microservizi
```

## 2. **Flusso Simulazione Real-Time**
```
CloudWatch Events (ogni 5min) 
  → Lambda vitals-simulator 
  → Query DynamoDB Patients 
  → Generate vitals 
  → Send to SQS 
  → Lambda vitals-consumer (triggered) 
  → Save to DynamoDB VitalSigns 
  → Check thresholds 
  → (If critical) Publish to SNS 
  → Notify staff
```

## 3. **Flusso Alert System**
```
VitalSigns DynamoDB Stream 
  → Lambda anomaly-detector 
  → Detect anomalies 
  → Publish to SNS 
  → Alert Service subscribes 
  → Save to DynamoDB Alerts 
  → Notify users
```

## 4. **Flusso Analytics**
```
CloudWatch Events (daily cron) 
  → Lambda daily-aggregator 
  → Query DynamoDB VitalSigns 
  → Aggregate data 
  → Store in RDS PostgreSQL 
  → Analytics Service queries RDS 
  → Generate reports
```

## 5. **Flusso CI/CD**
```
Developer push to GitHub 
  → GitHub Actions triggered 
  → Run tests 
  → Build Docker images 
  → Push to ECR 
  → Update CloudFormation stacks 
  → Deploy Lambda functions 
  → Update ECS services 
  → Deploy frontend to S3
```

## 6. **Flusso Dati Iniziale (One-time)**
```
MIMIC-III PhysioNet 
  → Download CSV 
  → Process & transform 
  → Upload to S3 
  → Load into DynamoDB (Patients, VitalSigns) 
  → System ready