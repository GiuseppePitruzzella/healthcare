import boto3
import csv
import json
from decimal import Decimal

dynamodb = boto3.resource('dynamodb', region_name='eu-north-1')
table = dynamodb.Table('Patients')
filename = 'data/patients.csv'

print(f"[INFO] Caricamento dati da {filename}...")

def decimalize(value):
    if value is None or value == "" or value == "null":
        return None
    try:
        return Decimal(str(value))
    except:
        return None

try:
    with open(filename, mode='r', encoding='utf-8') as csv_file:
        csv_reader = csv.DictReader(csv_file)
        
        with table.batch_writer() as batch:
            count = 0

            for row in csv_reader:

                item = {
                    "patient_id": row["patient_id"],
                    "full_name": row["full_name"],
                    "gender": row["GENDER"],
                    "birthdate": row["DOB"],
                    "department": row["department"],
                    "room": row["room"],
                    "attending_physician": row["attending_physician"],
                    "status": row["status"],
                    "diagnoses": row["diagnoses"].split("|") if row["diagnoses"] else [],
                    "medications": row["medications"].split("|") if row["medications"] else [],
                    "allergies": row["allergies"],
                    "baseline_hr": decimalize(row["baseline_hr"]),
                    "baseline_bp_sys": decimalize(row["baseline_bp_sys"]),
                    "baseline_bp_dia": decimalize(row["baseline_bp_dia"]),
                    "baseline_temp": decimalize(row["baseline_temp"]),
                    "baseline_spo2": decimalize(row["baseline_spo2"]),
                }

                # emergency_contact contiene un JSON come stringa
                if row.get("emergency_contact"):
                    try:
                        item["emergency_contact"] = json.loads(row["emergency_contact"])
                    except:
                        pass

                batch.put_item(Item=item)
                count += 1

        print(f"[SUCCESS] Caricati {count} pazienti in DynamoDB.")

except FileNotFoundError:
    print(f"[ERROR] File non trovato: {filename}")
except Exception as e:
    print(f"[ERROR] Errore durante il caricamento: {e}")
