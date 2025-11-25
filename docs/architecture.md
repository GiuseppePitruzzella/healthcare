flowchart TD
    %% Definizione Stili
    classDef aws fill:#FF9900,stroke:#232F3E,color:white,stroke-width:2px;
    classDef db fill:#3B48CC,stroke:#232F3E,color:white,stroke-width:2px;
    classDef user fill:#E6F2F8,stroke:#333,color:black;
    classDef security fill:#DD344C,stroke:#232F3E,color:white;
    classDef ai fill:#01A88D,stroke:#232F3E,color:white;

    subgraph Users ["Utenti & Client"]
        Doc["👨‍⚕️ Medico / Infermiere"]:::user
        Mgmt["👔 Direzione Sanitaria"]:::user
    end

    subgraph AWS ["☁️ AWS Cloud Environment"]
        style AWS fill:#f9f9f9,stroke:#333,stroke-width:2px

        subgraph Security ["Sicurezza & Identità"]
            Cognito["Amazon Cognito<br/>(Auth & User Pools)"]:::security
            IAM["AWS IAM<br/>(Policies & Roles)"]:::security
        end

        subgraph FrontendHost ["Hosting"]
            S3Web["Amazon S3<br/>(Static Website Hosting)"]:::aws
        end

        subgraph Gateway ["API Layer (Ingress)"]
            APIGW["Amazon API Gateway"]:::aws
            subgraph APITypes ["Protocolli"]
                REST["REST API<br/>(CRUD & History)"]
                WS["WebSocket API<br/>(Real-Time Push)"]
            end
        end

        subgraph Compute ["Serverless Compute (Lambda)"]
            Sim["λ vitals-simulator<br/>(Generazione Dati)"]:::aws
            Detect["λ alert-detector<br/>(Analisi & ML)"]:::aws
            APIH["λ api-handler<br/>(Backend REST)"]:::aws
            Notify["λ notifier<br/>(Gestione WS Push)"]:::aws
            ETL["λ etl-aggregator<br/>(Data Processing)"]:::aws
        end

        subgraph Intelligence ["AI & Machine Learning"]
            Sage["Amazon SageMaker<br/>(Inference Endpoint)"]:::ai
        end

        subgraph DataStorage ["Data Layer"]
            subgraph NoSQL ["Operativo (Hot Data)"]
                DDB[("Amazon DynamoDB")]:::db
                Tables["Tables: Patients, VitalSigns, Alerts, Connections"]
            end
            subgraph Relational ["Analitico (Cold Data)"]
                RDS[("Amazon RDS<br/>(Storico Aggregato)")]:::db
            end
            subgraph ObjectStore ["Data Lake & Backup"]
                S3Data[("Amazon S3 Bucket<br/>(MIMIC-III, Backups)")]:::aws
            end
        end

        subgraph Monitoring ["Orchestration & Ops"]
            CW["Amazon CloudWatch<br/>(Logs, Alarms)"]:::aws
            EB["EventBridge<br/>(Scheduler)"]:::aws
        end

        subgraph BI ["Business Intelligence"]
            QS["Amazon QuickSight"]:::ai
        end
    end

    %% --- RELAZIONI E FLUSSI ---

    %% 1. Autenticazione & Accesso
    Doc -- "1. Login (Credenziali)" --> Cognito
    Cognito -- "Token JWT" --> Doc
    Doc -- "2. Carica App (React)" --> S3Web

    %% 2. Connessione & Polling (Medico)
    Doc -- "3. Connect (WebSocket) + JWT" --> WS
    WS -.-> APIGW
    APIGW -- "Auth Check" --> Cognito
    WS -- "Register Client ID" --> Notify
    Notify -- "Save Connection" --> DDB

    Doc -- "4. API Call (History) + JWT" --> REST
    REST -.-> APIGW
    REST -- "Invoke" --> APIH
    APIH -- "Query" --> DDB

    %% 3. Simulazione Dati (Core Loop)
    EB -- "Trigger (Ogni 5 min)" --> Sim
    Sim -- "Read Patient Config" --> DDB
    Sim -- "Write New Vitals" --> DDB

    %% 4. Analisi Real-Time & ML
    DDB -- "DynamoDB Streams (Trigger)" --> Detect
    Detect -- "Predict Risk Request" --> Sage
    Sage -- "Risk Score" --> Detect
    Detect -- "Write Alert (Se Critico)" --> DDB
    
    %% 5. Notifica Push (Il nuovo flusso)
    Detect -- "Data Payload" --> Notify
    Notify -- "Lookup Active Users" --> DDB
    Notify -- "Push JSON" --> WS
    WS -- "Real-Time Update" --> Doc

    %% 6. Analytics & Management
    EB -- "Trigger (Notturno)" --> ETL
    ETL -- "Extract & Aggregate" --> DDB
    ETL -- "Load Stats" --> RDS
    Mgmt -- "View Reports" --> QS
    QS -- "SQL Query" --> RDS

    %% Formattazione Layout
    DDB --- Tables
    REST ~~~ WS