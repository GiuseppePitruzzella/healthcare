import json
import random
import time
import boto3
from datetime import datetime
from decimal import Decimal

# Inizializziamo la connessione a DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='eu-north-1')
patients_table = dynamodb.Table('Patients')
vitals_table = dynamodb.Table('VitalSigns')

def get_all_patients():
    """Scarica la lista dei pazienti attivi dal DB"""
    response = patients_table.scan()
    return response['Items']

def simulate_vital_signs(patient):
    """Genera dati realistici basati sulla baseline del paziente"""
    
    # NOTA: I numeri in DynamoDB tornano come Decimal, dobbiamo convertirli per fare calcoli
    # e poi riconvertirli per salvarli.
    
    # 1. Heart Rate
    base_hr = float(patient['baseline_heart_rate'])
    hr_var = random.uniform(-3, 10) # Variazione un po' più ampia
    heart_rate = round(base_hr + hr_var, 1)

    # 2. Pressione
    base_sys = float(patient['baseline_bp_sys'])
    base_dia = float(patient['baseline_bp_dia'])
    bp_var = random.uniform(-5, 5)
    bp_sys = int(base_sys + bp_var)
    bp_dia = int(base_dia + (bp_var * 0.6))

    # 3. Temperatura & SpO2
    base_temp = float(patient['baseline_temp'])
    temp = round(base_temp + random.uniform(-0.2, 0.4), 1)
    
    base_spo2 = float(patient['baseline_spo2'])
    spo2 = int(min(100, base_spo2 + random.uniform(-2, 1)))

    # Creiamo l'oggetto da salvare
    return {
        "patient_id": patient['patient_id'],
        "timestamp": datetime.now().isoformat(), # La chiave temporale!
        "patient_name": patient['name'], # Utile averlo qui per la dashboard
        "heart_rate": Decimal(str(heart_rate)), # DynamoDB vuole Decimal
        "bp_systolic": bp_sys,
        "bp_diastolic": bp_dia,
        "blood_pressure": f"{bp_sys}/{bp_dia}",
        "temperature": Decimal(str(temp)),
        "spo2": spo2
    }

def lambda_handler(event, context):
    print("Connessione al database...")
    
    # 1. LEGGIAMO i pazienti reali
    patients = get_all_patients()
    print(f"Trovati {len(patients)} pazienti da simulare.")

    generated_count = 0

    # 2. GENERIAMO E SCRIVIAMO i dati
    # In una Lambda reale useremmo 'batch_writer' per velocità, ma iniziamo semplice
    for patient in patients:
        vitals = simulate_vital_signs(patient)
        
        # Scrittura su DynamoDB
        vitals_table.put_item(Item=vitals)
        
        print(f"Salvati dati per {patient['name']}: HR={vitals['heart_rate']}")
        generated_count += 1

    return {
        'statusCode': 200,
        'body': json.dumps(f"Simulazione completata. Generati {generated_count} record.")
    }

# Test locale
if __name__ == "__main__":
    lambda_handler(None, None)