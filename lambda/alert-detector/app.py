import json
import boto3
import uuid
from datetime import datetime
from decimal import Decimal

# Colleghiamo la tabella Alerts dove scriveremo i pericoli
dynamodb = boto3.resource('dynamodb')
alerts_table = dynamodb.Table('Alerts')

def check_vitals(record):
    """
    Analizza i parametri vitali e restituisce una lista di problemi trovati.
    """
    # Dobbiamo deserializzare il formato strano di DynamoDB Stream
    # I dati arrivano tipo: {"heart_rate": {"N": "125"}}
    new_image = record['dynamodb']['NewImage']
    
    # Helper per estrarre valori puliti
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

    # REGOLE MEDICHE (Soglie)
    if hr and hr > 110:
        violations.append(f"Tachicardia rilevata: {hr} bpm")
    elif hr and hr < 45:
        violations.append(f"Bradicardia grave: {hr} bpm")
        
    if sys and sys > 160:
        violations.append(f"Crisi Ipertensiva: {sys} mmHg")
    
    if spo2 and spo2 < 90:
        violations.append(f"Ipossia critica: {spo2}%")

    if temp and temp > 38.5:
        violations.append(f"Febbre alta: {temp}°C")

    return pid, pname, violations, new_image

def lambda_handler(event, context):
    print(f"Ricevuti {len(event['Records'])} record da analizzare.")
    
    for record in event['Records']:
        # Processiamo solo nuovi inserimenti (INSERT)
        if record['eventName'] == 'INSERT':
            try:
                pid, pname, violations, raw_data = check_vitals(record)
                
                if violations:
                    print(f"⚠️ ALLARME per {pname}: {violations}")
                    
                    # Creiamo l'oggetto Alert
                    alert = {
                        'alert_id': str(uuid.uuid4()),
                        'patient_id': pid,
                        'patient_name': pname,
                        'timestamp': datetime.now().isoformat(),
                        'severity': 'CRITICAL',
                        'message': " | ".join(violations),
                        'status': 'NEW', # L'infermiere dovrà gestirlo
                        'raw_vitals': json.dumps(raw_data, default=str) # Snapshot dei dati
                    }
                    
                    # Scriviamo nella tabella Alerts
                    alerts_table.put_item(Item=alert)
                    
            except Exception as e:
                print(f"Errore processando record: {e}")
                
    return {'statusCode': 200, 'body': 'Analisi completata'}