#!/usr/bin/env python3
"""
Script per svuotare una tabella DynamoDB in modo sicuro
Uso: python3 clear_dynamodb.py --table Alerts
"""

import boto3
import argparse
import sys
from datetime import datetime

def clear_table(table_name, confirm=True):
    """
    Svuota completamente una tabella DynamoDB
    
    Args:
        table_name: Nome della tabella
        confirm: Se True, chiede conferma prima di procedere
    """
    dynamodb = boto3.resource('dynamodb', region_name='eu-north-1')
    
    try:
        table = dynamodb.Table(table_name)
        
        # 1. Verifica che la tabella esista
        table.load()
        
        # 2. Ottieni info tabella
        item_count = table.item_count
        table_size_bytes = table.table_size_bytes
        key_schema = table.key_schema
        
        print(f"\n📊 Informazioni Tabella: {table_name}")
        print(f"   Record: ~{item_count}")
        print(f"   Dimensione: {table_size_bytes / 1024 / 1024:.2f} MB")
        print(f"   Chiave: {key_schema}")
        
        # 3. Conferma
        if confirm:
            print(f"\n⚠️  ATTENZIONE: Stai per eliminare TUTTI i dati dalla tabella '{table_name}'")
            response = input("   Sei sicuro? Scrivi 'DELETE' per confermare: ")
            
            if response != 'DELETE':
                print("❌ Operazione annullata")
                return False
        
        # 4. Ottieni il nome della chiave primaria
        primary_key = key_schema[0]['AttributeName']
        sort_key = None
        if len(key_schema) > 1:
            sort_key = key_schema[1]['AttributeName']
        
        print(f"\n🗑️  Inizio eliminazione...")
        deleted_count = 0
        start_time = datetime.now()
        
        # 5. Scan e delete in batch
        response = table.scan()
        
        while True:
            items = response.get('Items', [])
            
            if not items:
                break
            
            # Delete in batch (max 25 per volta)
            with table.batch_writer() as batch:
                for item in items:
                    # Costruisci la chiave
                    key = {primary_key: item[primary_key]}
                    if sort_key:
                        key[sort_key] = item[sort_key]
                    
                    batch.delete_item(Key=key)
                    deleted_count += 1
                    
                    # Progress ogni 100 record
                    if deleted_count % 100 == 0:
                        print(f"   🗑️  Eliminati {deleted_count} record...")
            
            # Gestisci paginazione
            if 'LastEvaluatedKey' not in response:
                break
            
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        
        # 6. Risultato finale
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print(f"\n✅ Completato!")
        print(f"   Totale eliminati: {deleted_count} record")
        print(f"   Tempo impiegato: {duration:.2f} secondi")
        print(f"   Velocità: {deleted_count / duration:.0f} record/sec")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Errore: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Svuota una tabella DynamoDB',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Esempi:
  # Svuota la tabella Alerts (con conferma)
  python3 clear_dynamodb.py --table Alerts
  
  # Svuota senza conferma (automatico)
  python3 clear_dynamodb.py --table Alerts --force
  
  # Svuota con regione specifica
  python3 clear_dynamodb.py --table Alerts --region us-east-1
        """
    )
    
    parser.add_argument(
        '--table',
        required=True,
        help='Nome della tabella da svuotare'
    )
    
    parser.add_argument(
        '--force',
        action='store_true',
        help='Non chiedere conferma (pericoloso!)'
    )
    
    parser.add_argument(
        '--region',
        default='eu-north-1',
        help='Regione AWS (default: eu-north-1)'
    )
    
    args = parser.parse_args()
    
    # Banner
    print("=" * 60)
    print("🗑️  DYNAMODB TABLE CLEANER")
    print("=" * 60)
    
    # Esegui
    success = clear_table(
        table_name=args.table,
        confirm=not args.force
    )
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()