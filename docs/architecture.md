graph TB
    subgraph "User Layer"
        U1[👨‍⚕️ Medici]
        U2[👩‍⚕️ Infermieri]
        U3[👨‍💼 Admin]
    end

    subgraph "CDN & Edge"
        CF[☁️ CloudFront<br/>CDN]
    end

    subgraph "Frontend Layer"
        S3[📦 S3 Bucket<br/>Static Hosting]
        REACT[⚛️ React Dashboard<br/>- Patient List<br/>- Vitals Charts<br/>- Alerts Panel<br/>- Real-time Updates]
    end

    subgraph "Authentication"
        COGNITO[🔐 Amazon Cognito<br/>User Pools<br/>- Medici Group<br/>- Infermieri Group<br/>- Admin Group]
    end

    subgraph "API Gateway & Load Balancing"
        APIGW[🌐 API Gateway<br/>REST + WebSocket]
        ALB[⚖️ Application Load<br/>Balancer]
    end

    subgraph "VPC - Public Subnets"
        ALB
        NAT[🌐 NAT Gateway]
    end

    subgraph "VPC - Private Subnets"
        subgraph "ECS Cluster - Fargate"
            direction LR
            ECS1[🐳 Patient Service<br/>Port 3000<br/>- CRUD Patients<br/>- Get History]
            ECS2[🐳 Vitals Service<br/>Port 3001<br/>- Post Vitals<br/>- Get Latest<br/>- WebSocket Stream]
            ECS3[🐳 Alert Service<br/>Port 3002<br/>- List Alerts<br/>- Acknowledge<br/>- SNS Subscriber]
            ECS4[🐳 Analytics Service<br/>Port 3003<br/>- Aggregations<br/>- Reports<br/>- Statistics]
        end

        subgraph "Serverless Functions"
            L1[⚡ Lambda<br/>vitals-simulator<br/>Generate realistic<br/>vitals every 5min]
            L2[⚡ Lambda<br/>vitals-consumer<br/>Process SQS msgs<br/>Save to DynamoDB]
            L3[⚡ Lambda<br/>anomaly-detector<br/>DynamoDB Stream<br/>trigger]
            L4[⚡ Lambda<br/>daily-aggregator<br/>Scheduled cron job]
        end
    end

    subgraph "Messaging & Queuing"
        SQS[📬 SQS Queue<br/>vitals-ingestion-queue<br/>Batch: 10 msgs<br/>Window: 5s]
        SNS[📢 SNS Topic<br/>patient-alerts<br/>Email/SMS notifications]
    end

    subgraph "Data Layer"
        subgraph "NoSQL Database"
            DDB1[(🗄️ DynamoDB<br/>Patients Table<br/>PK: patient_id<br/>GSI: status-index)]
            DDB2[(🗄️ DynamoDB<br/>VitalSigns Table<br/>PK: patient_id<br/>SK: timestamp<br/>TTL: 30 days)]
            DDB3[(🗄️ DynamoDB<br/>Alerts Table<br/>PK: alert_id<br/>GSI: patient-timestamp)]
        end

        subgraph "Relational Database"
            RDS[(🐘 RDS PostgreSQL<br/>Analytics DB<br/>- Daily aggregates<br/>- Complex queries<br/>- Reports)]
        end

        subgraph "Object Storage"
            S3DATA[📦 S3 Bucket<br/>Data Storage<br/>- MIMIC-III raw<br/>- Backups<br/>- Logs]
        end
    end

    subgraph "Monitoring & Logging"
        CW[📊 CloudWatch<br/>- Logs<br/>- Metrics<br/>- Alarms<br/>- Dashboard]
        XRAY[🔍 X-Ray<br/>Distributed Tracing]
    end

    subgraph "Security & Secrets"
        SM[🔑 Secrets Manager<br/>DB credentials<br/>API keys]
        IAM[👤 IAM Roles<br/>- Lambda execution<br/>- ECS task role<br/>- Service roles]
    end

    subgraph "Scheduling"
        CWE[⏰ CloudWatch Events<br/>EventBridge<br/>- 5min: vitals-simulator<br/>- Daily: aggregator]
    end

    subgraph "Infrastructure as Code"
        GH[📚 GitHub Repository<br/>- CloudFormation<br/>- Lambda code<br/>- ECS services<br/>- Frontend]
        GHA[🔄 GitHub Actions<br/>CI/CD Pipeline<br/>- Build & Test<br/>- Deploy Infrastructure<br/>- Push to ECR<br/>- Update ECS]
    end

    subgraph "Container Registry"
        ECR[🐳 Amazon ECR<br/>Docker Images<br/>- patient-service<br/>- vitals-service<br/>- alert-service<br/>- analytics-service]
    end

    subgraph "External Data Source"
        MIMIC[🏥 MIMIC-III Dataset<br/>PhysioNet<br/>- Patients<br/>- Admissions<br/>- Chartevents]
    end

    %% User connections
    U1 & U2 & U3 --> CF
    CF --> S3
    S3 --> REACT
    REACT --> COGNITO
    REACT --> APIGW
    REACT --> ALB

    %% API Gateway connections
    APIGW --> ECS2
    ALB --> ECS1
    ALB --> ECS2
    ALB --> ECS3
    ALB --> ECS4

    %% ECS to Data Layer
    ECS1 --> DDB1
    ECS2 --> DDB2
    ECS2 --> SNS
    ECS3 --> DDB3
    ECS3 --> SNS
    ECS4 --> RDS
    ECS4 --> DDB2

    %% Lambda workflow
    CWE -.->|Trigger every 5min| L1
    L1 --> DDB1
    L1 -->|Send message| SQS
    SQS -.->|Trigger| L2
    L2 --> DDB2
    L2 -->|If critical| SNS
    L2 --> DDB3
    
    DDB2 -.->|Stream| L3
    L3 --> SNS
    
    CWE -.->|Daily cron| L4
    L4 --> DDB2
    L4 --> RDS

    %% SNS notifications
    SNS -->|Email/SMS| U1
    SNS -->|Email/SMS| U2

    %% Private subnet internet access
    ECS1 & ECS2 & ECS3 & ECS4 --> NAT
    L1 & L2 & L3 & L4 --> NAT

    %% Security connections
    ECS1 & ECS2 & ECS3 & ECS4 -.->|Retrieve secrets| SM
    L1 & L2 & L3 & L4 -.->|Retrieve secrets| SM
    ECS1 & ECS2 & ECS3 & ECS4 -.->|Assume role| IAM
    L1 & L2 & L3 & L4 -.->|Assume role| IAM

    %% Monitoring
    ECS1 & ECS2 & ECS3 & ECS4 --> CW
    L1 & L2 & L3 & L4 --> CW
    ALB --> CW
    DDB1 & DDB2 & DDB3 --> CW
    RDS --> CW
    
    ECS1 & ECS2 & ECS3 & ECS4 --> XRAY
    L1 & L2 & L3 & L4 --> XRAY

    %% Data backup
    DDB1 & DDB2 & DDB3 -.->|Backup| S3DATA
    RDS -.->|Backup| S3DATA

    %% CI/CD workflow
    GH --> GHA
    GHA -->|Deploy templates| ALB
    GHA -->|Deploy templates| ECS1
    GHA -->|Build & Push images| ECR
    ECR --> ECS1 & ECS2 & ECS3 & ECS4
    GHA -->|Update Lambda code| L1 & L2 & L3 & L4
    GHA -->|Deploy frontend| S3

    %% Data source
    MIMIC -.->|One-time load| S3DATA
    S3DATA -.->|Process & load| DDB1
    S3DATA -.->|Process & load| DDB2

    %% Styling
    classDef awsCompute fill:#FF9900,stroke:#232F3E,stroke-width:2px,color:#fff
    classDef awsStorage fill:#3F8624,stroke:#232F3E,stroke-width:2px,color:#fff
    classDef awsDatabase fill:#3B48CC,stroke:#232F3E,stroke-width:2px,color:#fff
    classDef awsNetwork fill:#147EBA,stroke:#232F3E,stroke-width:2px,color:#fff
    classDef awsSecurity fill:#DD344C,stroke:#232F3E,stroke-width:2px,color:#fff
    classDef awsIntegration fill:#E7157B,stroke:#232F3E,stroke-width:2px,color:#fff
    classDef frontend fill:#61DAFB,stroke:#20232A,stroke-width:2px,color:#20232A
    classDef external fill:#8B5CF6,stroke:#4C1D95,stroke-width:2px,color:#fff
    classDef monitoring fill:#FF6B6B,stroke:#C92A2A,stroke-width:2px,color:#fff

    class ECS1,ECS2,ECS3,ECS4,L1,L2,L3,L4 awsCompute
    class S3,S3DATA,ECR awsStorage
    class DDB1,DDB2,DDB3,RDS awsDatabase
    class ALB,APIGW,CF,NAT awsNetwork
    class COGNITO,SM,IAM awsSecurity
    class SQS,SNS,CWE awsIntegration
    class REACT frontend
    class MIMIC external
    class CW,XRAY monitoring