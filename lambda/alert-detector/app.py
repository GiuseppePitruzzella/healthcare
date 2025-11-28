import json
import boto3
import uuid
from datetime import datetime

# --- CONFIGURAZIONE ---
dynamodb = boto3.resource('dynamodb')
alerts_table = dynamodb.Table('Alerts')
connection_table = dynamodb.Table('WebSocketConnections')

# Client SNS per email
sns_client = boto3.client('sns')
SNS_TOPIC_ARN = "arn:aws:sns:eu-north-1:972742752781:healthcare_alerts"

# Configurazione WebSocket
WEBSOCKET_ENDPOINT = 'dbohl3t6fa.execute-api.eu-north-1.amazonaws.com'
WEBSOCKET_STAGE = 'production'
REGION_NAME = 'eu-north-1'

# Client API Gateway per WebSocket
gateway_client = boto3.client(
    'apigatewaymanagementapi',
    endpoint_url=f"https://{WEBSOCKET_ENDPOINT}/{WEBSOCKET_STAGE}",
    region_name=REGION_NAME
)


def check_vitals(record):
    """
    Analizza i parametri vitali e restituisce una lista di problemi trovati
    """
    new_image = record['dynamodb']['NewImage']
    
    def get_val(key):
        if 'N' in new_image.get(key, {}):
            return float(new_image[key]['N'])
        return None
    
    hr = get_val('heart_rate')
    sys = get_val('bp_systolic')
    spo2 = get_val('spo2')
    temp = get_val('temperature')
    pid = new_image['patient_id']['S']
    pname = new_image.get('patient_name', {}).get('S', 'Sconosciuto')
    
    violations = []
    
    # Soglie Critiche
    if hr and hr > 110:
        violations.append(f"Tachicardia: {hr} bpm")
    elif hr and hr < 45:
        violations.append(f"Bradicardia: {hr} bpm")
    
    if sys and sys > 160:
        violations.append(f"Ipertensione: {sys} mmHg")
    
    if spo2 and spo2 < 90:
        violations.append(f"Ipossia: {spo2}%")
    
    if temp and temp > 38.5:
        violations.append(f"Febbre alta: {temp}°C")
    
    return pid, pname, violations


def broadcast_websocket(alert_data):
    """
    Invia l'allarme a tutti i client WebSocket connessi
    """
    try:
        # Recupera tutte le connessioni attive
        response = connection_table.scan(ProjectionExpression='connectionId')
        active_connections = response.get('Items', [])
        
        if not active_connections:
            print("⚠️ NESSUN CLIENT WEBSOCKET CONNESSO")
            return False
        
        # Prepara il payload nel formato che il frontend si aspetta
        alert_payload = {
            "action": "newAlert",
            "data": alert_data
        }
        
        data_to_send = json.dumps(alert_payload, default=str)
        print(f"📤 Invio allarme WebSocket a {len(active_connections)} client")
        
        dead_connections = []
        successful_sends = 0
        
        for item in active_connections:
            connection_id = item['connectionId']
            try:
                gateway_client.post_to_connection(
                    ConnectionId=connection_id,
                    Data=data_to_send.encode('utf-8')
                )
                successful_sends += 1
                print(f"✅ WebSocket inviato a {connection_id}")
                
            except gateway_client.exceptions.GoneException:
                print(f"🔌 Connessione morta: {connection_id}")
                dead_connections.append(connection_id)
                
            except Exception as e:
                print(f"❌ Errore invio WebSocket a {connection_id}: {str(e)}")
        
        # Pulisci connessioni morte
        for conn_id in dead_connections:
            try:
                connection_table.delete_item(Key={'connectionId': conn_id})
            except Exception as e:
                print(f"⚠️ Errore rimozione {conn_id}: {str(e)}")
        
        print(f"📊 WebSocket: {successful_sends}/{len(active_connections)} inviati, {len(dead_connections)} rimossi")
        return successful_sends > 0
        
    except Exception as e:
        print(f"❌ ERRORE WebSocket broadcast: {str(e)}")
        return False


def send_sns_notification(patient_id, patient_name, violations, timestamp):
    """
    Invia notifica email via SNS
    """
    try:
        message_text = f"""
🚨 ALLARME CRITICO - CODICE ROSSO

Paziente: {patient_name}
ID: {patient_id}
Data/Ora: {timestamp}

Problemi Rilevati:
{chr(10).join([f'• {v}' for v in violations])}

⚠️ INTERVENIRE IMMEDIATAMENTE ⚠️

Questo è un messaggio automatico dal sistema di monitoraggio Hospital Cloud.
"""
        
        response = sns_client.publish(
            TopicArn=SNS_TOPIC_ARN,
            Message=message_text,
            Subject=f"🚨 CODICE ROSSO: {patient_name} ({patient_id})"
        )
        
        print(f"📧 Notifica SNS inviata! MessageId: {response['MessageId']}")
        return True
        
    except Exception as e:
        print(f"❌ ERRORE invio SNS: {str(e)}")
        return False


def lambda_handler(event, context):
    """
    Gestisce i nuovi record di DynamoDB Stream e invia allarmi
    """
    print(f"🔍 Ricevuti {len(event['Records'])} record da analizzare")
    
    alerts_sent = 0
    
    for record in event['Records']:
        if record['eventName'] == 'INSERT':
            try:
                pid, pname, violations = check_vitals(record)
                
                if violations:
                    timestamp = datetime.now().isoformat()
                    message_text = f"Paziente: {pname} ({pid})\nProblemi: {', '.join(violations)}"
                    
                    print(f"🚨 ALLARME RILEVATO!")
                    print(f"   Paziente: {pname} ({pid})")
                    print(f"   Problemi: {', '.join(violations)}")
                    
                    # 1. Salva l'allarme nel database
                    alert_id = str(uuid.uuid4())
                    alerts_table.put_item(Item={
                        'alert_id': alert_id,
                        'patient_id': pid,
                        'patient_name': pname,
                        'timestamp': timestamp,
                        'severity': 'CRITICAL',
                        'message': message_text,
                        'status': 'NEW'
                    })
                    print(f"💾 Allarme salvato su DB con ID: {alert_id}")
                    
                    # 2. Prepara i dati per le notifiche
                    alert_data = {
                        "alert_id": alert_id,
                        "patient_id": pid,
                        "name": pname,
                        "violations": violations,
                        "severity": "CRITICAL",
                        "timestamp": timestamp,
                        "message": message_text
                    }
                    
                    # 3. Invia notifica WebSocket in tempo reale
                    websocket_success = broadcast_websocket(alert_data)
                    
                    # 4. Invia notifica SNS (Email)
                    sns_success = send_sns_notification(pid, pname, violations, timestamp)
                    
                    # Riepilogo
                    if websocket_success or sns_success:
                        alerts_sent += 1
                        print(f"✅ Allarme #{alerts_sent} notificato")
                        print(f"   - WebSocket: {'✅ Inviato' if websocket_success else '❌ Fallito'}")
                        print(f"   - SNS Email: {'✅ Inviato' if sns_success else '❌ Fallito'}")
                    else:
                        print(f"⚠️ Allarme salvato ma NESSUNA notifica inviata con successo")
                    
                else:
                    print(f"✅ Parametri vitali OK per {pname} ({pid})")
                    
            except Exception as e:
                print(f"❌ Errore nel processamento del record: {str(e)}")
                import traceback
                print(traceback.format_exc())
                continue
    
    print(f"🏁 Completato: {alerts_sent} allarmi notificati")
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'Analisi completata',
            'alerts_sent': alerts_sent
        })
    }