Ecco una descrizione tecnica dettagliata del progetto **"Hospital Patient Monitoring System"**, basata sulla documentazione fornita.

### 1. Panoramica Architetturale
Il sistema è una soluzione **Cloud-Native** e **Serverless** costruita interamente su **Amazon Web Services (AWS)**. L'architettura è progettata per essere scalabile e guidata dagli eventi (**Event-Driven**), eliminando la necessità di gestire server fisici o virtuali. Il sistema simula, processa e visualizza i parametri vitali di 200 pazienti in tempo reale, utilizzando un dataset clinico reale (MIMIC-III).

### 2. Stack Tecnologico

#### Frontend (Presentation Layer)
* **Framework:** React 18 (Single Page Application).
* **Hosting:** Amazon S3 (Static Website Hosting).
* **Librerie Chiave:** Tailwind CSS per lo styling, Recharts per la visualizzazione grafica dei dati (time-series), Axios per le chiamate HTTP e React Router per la navigazione.
* **Interazione:** Effettua polling ogni 10 secondi verso le API per aggiornamenti quasi real-time.

#### Backend (Compute Layer)
La logica applicativa è gestita da **AWS Lambda** (Python 3.11), suddivisa in tre funzioni distinte per garantire il principio di responsabilità singola:
1.  **`vitals-simulator`:** Genera i dati dei pazienti ogni 5 minuti.
2.  **`alert-detector`:** Analizza i dati in ingresso per rilevare anomalie tramite **DynamoDB Streams**.
3.  **`api-handler`:** Gestisce le richieste REST provenienti dal frontend (interfaccia con API Gateway).

#### Data Layer (Persistence)
Il sistema utilizza un approccio ibrido per lo stoccaggio dei dati:
* **Amazon DynamoDB (NoSQL):** Gestisce i dati caldi e operativi tramite tre tabelle principali:
    * `Patients`: Anagrafica statica dei 200 pazienti.
    * `VitalSigns`: Dati time-series dei parametri vitali (con **TTL** impostato a 30 giorni per la gestione del ciclo di vita).
    * `Alerts`: Registro degli eventi critici rilevati (severity e status).
* **Amazon S3 (Object Storage):** Utilizzato per l'hosting del frontend, come Data Lake per il dataset MIMIC-III processato e per i backup automatici.

### 3. Workflow e Flussi Dati

Il funzionamento tecnico si articola in tre flussi principali:

**A. Ingestion e Simulazione (Event-Driven Schedule)**
Un evento pianificato su **Amazon CloudWatch Events** (ora EventBridge) attiva la Lambda `vitals-simulator` ogni 5 minuti. Questa funzione legge la lista pazienti e genera nuovi parametri vitali applicando variazioni gaussiane e pattern temporali realistici basati sul dataset MIMIC-III, salvando il risultato su DynamoDB.

**B. Processing e Alerting (Event-Driven Stream)**
L'inserimento di un nuovo record nella tabella `VitalSigns` attiva automaticamente **DynamoDB Streams**, che invoca la Lambda `alert-detector`. Questa funzione confronta i dati con soglie cliniche predefinite (es. *heart_rate > 120 bpm* per tachicardia o *SpO2 < 92%* per ipossia). Se viene rilevata un'anomalia, viene scritto immediatamente un record nella tabella `Alerts`.

**C. Visualizzazione (Request-Response)**
L'utente accede alla dashboard tramite browser (S3). Il frontend invia richieste REST ad **Amazon API Gateway**, che funge da entry point sicuro gestendo CORS e validazione. L'API Gateway invoca la Lambda `api-handler`, che esegue query su DynamoDB e restituisce un payload JSON contenente lista pazienti, grafici delle ultime 24 ore e pannello degli alert.

### 4. DevOps e Infrastructure as Code (IaC)
L'intera infrastruttura non è configurata manualmente, ma definita tramite codice (**IaC**) utilizzando template **AWS CloudFormation** versionati. Questo permette il deployment dell'intero stack (DynamoDB, Lambda, API Gateway, S3) in circa 15 minuti tramite script automatizzati.

Il ciclo di rilascio è gestito da una pipeline **CI/CD** su **GitHub Actions**:
* Deploy automatico delle Lambda e dell'infrastruttura su push nel branch main.
* Build e sync del frontend React sul bucket S3.

### 5. Sicurezza e Performance
* **Sicurezza:** Implementata tramite **AWS IAM** con principio di *least privilege* (le Lambda accedono solo alle risorse necessarie). I dati sono criptati a riposo (DynamoDB/S3) e in transito (HTTPS).