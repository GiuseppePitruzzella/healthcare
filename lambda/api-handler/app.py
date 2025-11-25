import json
import boto3
from boto3.dynamodb.conditions import Key
from decimal import Decimal

# Helper per convertire i Decimal di DynamoDB in float per il JSON
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

dynamodb = boto3.resource('dynamodb')
patients_table = dynamodb.Table('Patients')
vitals_table = dynamodb.Table('VitalSigns')
alerts_table = dynamodb.Table('Alerts')

def get_patients():
    """Restituisce la lista di tutti i pazienti"""
    response = patients_table.scan()
    return response.get('Items', [])

def get_patient_details(patient_id):
    """Recupera storico parametri e alert per un singolo paziente"""
    
    # 1. Recupera ultimi 20 rilevamenti vitali (Query inversa per data)
    vitals_resp = vitals_table.query(
        KeyConditionExpression=Key('patient_id').eq(patient_id),
        ScanIndexForward=False, # Dal più recente al più vecchio
        Limit=20
    )
    
    # 2. Recupera eventuali allarmi
    alerts_resp = alerts_table.query(
        KeyConditionExpression=Key('patient_id').eq(patient_id)
    )
    
    return {
        'history': vitals_resp.get('Items', []),
        'alerts': alerts_resp.get('Items', [])
    }

def lambda_handler(event, context):
    print("Richiesta API ricevuta:", event)
    
    http_method = event.get('httpMethod')
    path = event.get('path')
    
    headers = {
        'Access-Control-Allow-Origin': '*', # Importante per React (CORS)
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,GET'
    }

    try:
        if http_method == 'GET':
            if path == '/patients':
                # Restituisce lista pazienti
                data = get_patients()
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps(data, cls=DecimalEncoder)
                }
            
            elif path.startswith('/patients/'):
                # Estrae ID dall'URL (es. /patients/PT00001)
                patient_id = path.split('/')[-1]
                data = get_patient_details(patient_id)
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps(data, cls=DecimalEncoder)
                }

        return {
            'statusCode': 404,
            'headers': headers,
            'body': json.dumps({'error': 'Percorso non trovato'})
        }

    except Exception as e:
        print(f"Errore: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }