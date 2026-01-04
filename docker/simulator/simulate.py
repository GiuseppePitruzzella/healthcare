#!/usr/bin/env python3
"""
Local IoT Simulator - Simula device medicali che inviano dati a DynamoDB
Questo script wrappa la Lambda vitals-simulator per eseguirla in loop
"""
import os
import sys
import time
import json
from datetime import datetime

# Aggiungi il path della Lambda al PYTHONPATH
sys.path.insert(0, '/app/lambda/vitals-simulator')

try:
    from app import lambda_handler
except ImportError as e:
    print(f"Errore import Lambda: {e}")
    print("Assicurati che /app/lambda/vitals-simulator/app.py esista")
    sys.exit(1)

# Configurazione
SIMULATION_INTERVAL = int(os.environ.get('SIMULATION_INTERVAL', 10))
NUM_PATIENTS = int(os.environ.get('NUM_PATIENTS', 50))

def simulate_iot_devices():
    """Simula l'invio continuo di dati da device IoT"""
    print("=" * 70)
    print("Hospital IoT Device Simulator - Starting...")
    print("=" * 70)
    print("Configurazione:")
    print(f"   - Pazienti monitorati: {NUM_PATIENTS}")
    print(f"   - Intervallo simulazione: {SIMULATION_INTERVAL} secondi")
    print(f"   - Tabella Pazienti: {os.environ.get('PATIENTS_TABLE', 'N/A')}")
    print(f"   - Tabella Vitals: {os.environ.get('VITAL_SIGNS_TABLE', 'N/A')}")
    print(f"   - AWS Region: {os.environ.get('AWS_DEFAULT_REGION', 'N/A')}")
    print("=" * 70)
    
    iteration = 0
    
    while True:
        iteration += 1
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        print(f"\nIterazione #{iteration} - {timestamp}")
        print("-" * 70)
        
        try:
            # Simula l'evento Lambda
            event = {
                "source": "docker-simulator",
                "time": timestamp,
                "detail": {
                    "num_patients": NUM_PATIENTS
                }
            }
            
            context = type('obj', (object,), {
                'function_name': 'local-vitals-simulator',
                'memory_limit_in_mb': 128,
                'invoked_function_arn': 'arn:aws:lambda:local:000000000000:function:simulator',
                'aws_request_id': f'docker-sim-{iteration}'
            })
            
            # Esegui la Lambda
            result = lambda_handler(event, context)
            
            # Mostra risultato
            if result.get('statusCode') == 200:
                body = json.loads(result.get('body', '{}'))
                records = body.get('records_written', 0)
                print(f"Successo: {records} record scritti su DynamoDB")
            else:
                print(f"Status Code: {result.get('statusCode')}")
                print(f"    Message: {result.get('body', 'N/A')}")
        
        except Exception as e:
            print(f"Errore durante simulazione: {str(e)}")
            import traceback
            traceback.print_exc()
        
        # Attendi prima della prossima iterazione
        print(f"Attendo {SIMULATION_INTERVAL} secondi prima della prossima iterazione...")
        time.sleep(SIMULATION_INTERVAL)

if __name__ == "__main__":
    try:
        simulate_iot_devices()
    except KeyboardInterrupt:
        print("\n\nSimulazione interrotta dall'utente")
        print("Simulator stopped gracefully")
        sys.exit(0)
    except Exception as e:
        print(f"\nErrore fatale: {e}")
        sys.exit(1)