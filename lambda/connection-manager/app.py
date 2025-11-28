import json
import boto3

dynamodb = boto3.resource('dynamodb')
connection_table = dynamodb.Table('WebSocketConnections')

def lambda_handler(event, context):
    # Recuperiamo l'ID connessione
    connection_id = event.get('requestContext', {}).get('connectionId')
    route_key = event.get('requestContext', {}).get('routeKey')
    
    # --- NUOVO: CONTROLLO SICUREZZA ---
    # Recuperiamo i parametri dall'URL (quello che hai messo nel frontend ?token=...)
    query_params = event.get('queryStringParameters', {})
    token = query_params.get('token') if query_params else None

    # Se stiamo cercando di connetterci ($connect)
    if route_key == '$connect':
        if not token:
            print(f"Tentativo di connessione senza token: {connection_id}")
            # Rifiutiamo la connessione con un codice 403 (Forbidden)
            return {'statusCode': 403, 'body': 'Accesso Negato: Token mancante'}
        
        # (Opzionale: Qui potresti validare se il token è scaduto usando librerie JWT)
        # Per ora ci fidiamo che se il token c'è, l'utente viene dal frontend autenticato.
        
        # Se il token c'è, salviamo la connessione
        connection_table.put_item(Item={'connectionId': connection_id})
        print(f"Connesso e Autenticato: {connection_id}")
        return {'statusCode': 200, 'body': 'Connected'}

    elif route_key == '$disconnect':
        connection_table.delete_item(Key={'connectionId': connection_id})
        return {'statusCode': 200, 'body': 'Disconnected'}
        
    return {'statusCode': 200, 'body': 'OK'}