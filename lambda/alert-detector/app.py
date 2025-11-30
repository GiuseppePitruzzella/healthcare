import json
import boto3
import uuid
from datetime import datetime

# --- CONFIGURAZIONE ---
dynamodb = boto3.resource('dynamodb')
alerts_table = dynamodb.Table('Alerts')
connection_table = dynamodb.Table('WebSocketConnections')

# WIP: Email aggregate - Temporaneamente disabilitate
# Client SNS gestito da Lambda separata (hospital-batch-email-sender)
# Vedere EventBridge Schedule per configurazione ogni 5 minuti
# sns_client = boto3.client('sns')
# SNS_TOPIC_ARN = "arn:aws:sns:eu-north-1:972742752781:HospitalEmergencyAlerts"

# Configurazione WebSocket
WEBSOCKET_ENDPOINT = 'dbohl3t6fa.execute-api.eu-north-1.amazonaws.com'
WEBSOCKET_STAGE = 'production'
REGION_NAME = 'eu-north-1'

# Client API Gateway (creato fuori dal handler per caching)
gateway_client = boto3.client(
    'apigatewaymanagementapi',
    endpoint_url=f"https://{WEBSOCKET_ENDPOINT}/{WEBSOCKET_STAGE}",
    region_name=REGION_NAME
)


def check_vitals(record):
    """
    Analizza i parametri vitali e ritorna dati completi + violazioni
    """
    new_image = record['dynamodb']['NewImage']
    
    def get_val(key):
        if 'N' in new_image.get(key, {}):
            return float(new_image[key]['N'])
        return None

    # Estraiamo i dati
    hr = get_val('heart_rate')
    sys = get_val('bp_systolic')
    dia = get_val('bp_diastolic')
    spo2 = get_val('spo2')
    temp = get_val('temperature')
    pid = new_image['patient_id']['S']
    pname = new_image.get('patient_name', {}).get('S', 'Sconosciuto')
    
    # Status iniziale dal database (se presente)
    current_status = new_image.get('status', {}).get('S', 'Stable')

    violations = []
    is_critical = False

    # Soglie Critiche
    if hr and hr > 110:
        violations.append(f"Tachicardia: {hr} bpm")
        is_critical = True
    elif hr and hr < 45:
        violations.append(f"Bradicardia: {hr} bpm")
        is_critical = True
    
    if sys and sys > 160:
        violations.append(f"Ipertensione: {sys} mmHg")
        is_critical = True
    
    if spo2 and spo2 < 90:
        violations.append(f"Ipossia: {spo2}%")
        is_critical = True
    
    if temp and temp > 38.5:
        violations.append(f"Febbre alta: {temp}°C")
        is_critical = True

    # Determina lo status finale
    if is_critical:
        final_status = 'Critical'
    elif current_status == 'Critical':
        # Mantieni Critical se era già Critical (non declassare automaticamente)
        final_status = 'Critical'
    else:
        # Altrimenti usa lo status del database
        final_status = current_status

    # Dati completi per il frontend
    vitals_data = {
        "patient_id": pid,
        "name": pname,
        "heart_rate": hr,
        "bp_systolic": sys,
        "bp_diastolic": dia,
        "spo2": spo2,
        "temperature": temp,
        "status": final_status,
        "timestamp": datetime.now().isoformat()
    }

    return pid, pname, violations, vitals_data, is_critical


def broadcast_websocket(payload):
    """
    Invia messaggi a tutti i client WebSocket connessi
    Gestisce automaticamente le connessioni morte
    """
    try:
        # Recupera connessioni attive
        response = connection_table.scan(ProjectionExpression='connectionId')
        active_connections = response.get('Items', [])
        
        if not active_connections:
            print("⚠️ Nessun client WebSocket connesso")
            return False
        
        data_to_send = json.dumps(payload, default=str).encode('utf-8')
        
        dead_connections = []
        successful_sends = 0
        
        for item in active_connections:
            connection_id = item['connectionId']
            try:
                gateway_client.post_to_connection(
                    ConnectionId=connection_id,
                    Data=data_to_send
                )
                successful_sends += 1
                
            except gateway_client.exceptions.GoneException:
                dead_connections.append(connection_id)
                
            except Exception as e:
                print(f"❌ Errore invio a {connection_id}: {str(e)}")
        
        # Rimuovi connessioni morte
        for conn_id in dead_connections:
            try:
                connection_table.delete_item(Key={'connectionId': conn_id})
            except Exception as e:
                print(f"⚠️ Errore rimozione {conn_id}: {str(e)}")
        
        if dead_connections:
            print(f"🗑️ Rimosse {len(dead_connections)} connessioni morte")
        
        return successful_sends > 0
        
    except Exception as e:
        print(f"❌ Errore broadcast: {str(e)}")
        return False


def lambda_handler(event, context):
    """
    Gestisce i nuovi record DynamoDB Stream e invia notifiche
    """
    print(f"🏥 Ricevuti {len(event['Records'])} record")
    
    alerts_count = 0
    updates_count = 0
    
    for idx, record in enumerate(event['Records']):
        if record['eventName'] == 'INSERT':
            try:
                pid, pname, violations, vitals_data, is_critical = check_vitals(record)
                
                # --- 1. ALLARME CRITICO (se ci sono violazioni) ---
                if violations:
                    alerts_count += 1
                    timestamp = datetime.now().isoformat()
                    
                    print(f"\n🚨 ALLARME #{alerts_count}: {pname} ({pid})")
                    print(f"   Violazioni: {', '.join(violations)}")
                    
                    # Salva in database
                    alert_id = str(uuid.uuid4())
                    alerts_table.put_item(Item={
                        'alert_id': alert_id,
                        'patient_id': pid,
                        'patient_name': pname,
                        'timestamp': timestamp,
                        'severity': 'CRITICAL',
                        'message': ' | '.join(violations),
                        'status': 'NEW'
                    })
                    
                    # WebSocket: Notifica allarme critico
                    alert_payload = {
                        "action": "newAlert",
                        "data": {
                            "alert_id": alert_id,
                            "patient_id": pid,
                            "name": pname,
                            "violations": violations,
                            "severity": "CRITICAL",
                            "timestamp": timestamp
                        }
                    }
                    broadcast_websocket(alert_payload)
                    print(f"   📤 Allarme critico inviato via WebSocket")
                
                # --- 2. AGGIORNAMENTO PARAMETRI VITALI (SEMPRE) ---
                updates_count += 1
                update_payload = {
                    "action": "vitalUpdate",
                    "data": vitals_data
                }
                broadcast_websocket(update_payload)
                
                status_emoji = "🚨" if vitals_data['status'] == 'Critical' else "💚"
                print(f"{status_emoji} VitalUpdate: {pname} ({pid}) - Status: {vitals_data['status']}")
                
            except Exception as e:
                print(f"❌ Errore record #{idx}: {str(e)}")
                import traceback
                print(traceback.format_exc())
                continue
    
    print(f"\n🏁 Completato: {alerts_count} allarmi, {updates_count} aggiornamenti vitali")
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'alerts': alerts_count,
            'updates': updates_count
        })
    }