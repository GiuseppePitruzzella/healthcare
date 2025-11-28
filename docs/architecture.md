flowchart TD
    %% Stili
    classDef client fill:#E6F2F8,stroke:#333,stroke-width:2px;
    classDef security fill:#FFCCCC,stroke:#b30000,stroke-width:2px;
    classDef compute fill:#FF9900,stroke:#232F3E,color:white;
    classDef db fill:#3B48CC,stroke:#232F3E,color:white;
    classDef api fill:#8C4FFF,stroke:#232F3E,color:white;
    classDef notify fill:#FF5252,stroke:#232F3E,color:white;

    subgraph CLIENT ["💻 LATO CLIENT (Il Medico)"]
        Browser["React Dashboard<br/>(S3 Hosting)"]:::client
        Email["📩 Email Medico"]:::client
    end

    subgraph CLOUD ["☁️ AWS CLOUD"]
        
        subgraph SEC ["🛡️ Sicurezza"]
            Cognito["Amazon Cognito<br/>(User Pool)"]:::security
        end

        subgraph GATEWAY ["🚪 Porte d'Ingresso"]
            APIGW_REST["API Gateway REST<br/>(Dati Storici)"]:::api
            APIGW_WS["API Gateway WebSocket<br/>(Real-Time)"]:::api
        end

        subgraph COMPUTE ["⚙️ Logica (Lambda)"]
            Sim["λ Simulator<br/>(Genera Dati)"]:::compute
            Detect["λ Alert Detector<br/>(Analisi & Push)"]:::compute
            ApiHandler["λ API Handler<br/>(Query Dati)"]:::compute
            ConnMgr["λ Connection Mgr<br/>(Gestione WS)"]:::compute
        end

        subgraph DATA ["💾 Dati (DynamoDB)"]
            DDB_Vit["Tabella VitalSigns<br/>(Stream Attivo)"]:::db
            DDB_Alert["Tabella Alerts"]:::db
            DDB_Conn["Tabella Connections<br/>(Utenti Online)"]:::db
            DDB_Pat["Tabella Patients"]:::db
        end

        subgraph NOTIFY ["📢 Notifiche"]
            SNS["Amazon SNS<br/>(Topic Allarmi)"]:::notify
        end

        EventBridge["⏰ EventBridge<br/>(Ogni 5 min)"]:::compute

    end

    %% FLUSSI
    %% 1. Autenticazione
    Browser -- "1. Login" --> Cognito
    Cognito -- "Token JWT" --> Browser

    %% 2. Simulazione
    EventBridge -- "Trigger" --> Sim
    Sim -- "Lettura Profili" --> DDB_Pat
    Sim -- "Scrittura Dati" --> DDB_Vit

    %% 3. Rilevamento & Push
    DDB_Vit -- "DynamoDB Stream" --> Detect
    Detect -- "Scrive Allarme" --> DDB_Alert
    Detect -- "A. Invia Email" --> SNS
    SNS -.-> Email
    Detect -- "B. Push WebSocket" --> APIGW_WS
    
    %% 4. Visualizzazione
    Browser -- "2. REST GET + Token" --> APIGW_REST
    APIGW_REST -- "Auth Check" --> Cognito
    APIGW_REST --> ApiHandler
    ApiHandler --> DDB_Vit & DDB_Alert

    %% 5. Real-Time
    Browser <== "3. WebSocket + Token" ==> APIGW_WS
    APIGW_WS --> ConnMgr
    ConnMgr --> DDB_Conn
    APIGW_WS -- "Push Alert" --> Browser