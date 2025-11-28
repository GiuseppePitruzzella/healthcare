import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Authenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth'; 
import '@aws-amplify/ui-react/styles.css';
import PatientDetail from './components/PatientDetail';
import './App.css';

function App() {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [wsStatus, setWsStatus] = useState('disconnected'); // NUOVO: stato connessione

  const BASE_URL = "https://kok1mewu89.execute-api.eu-north-1.amazonaws.com/prod";
  const WEBSOCKET_URL = "wss://dbohl3t6fa.execute-api.eu-north-1.amazonaws.com/production/";

  const getAuthToken = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      return session.tokens.idToken.toString();
    } catch (error) {
      console.error("Errore token:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    const fetchPatients = async () => {
      const token = await getAuthToken();
      if (!token) return;

      try {
        const response = await axios.get(`${BASE_URL}/patients`, {
          headers: { Authorization: token } 
        });
        
        const sorted = response.data.sort((a, b) => (a.status === 'Critical' ? -1 : 1));
        setPatients(sorted);
      } catch (error) {
        console.error("Errore caricamento lista:", error);
      }
    };

    fetchPatients();
  }, [BASE_URL, getAuthToken]);

  useEffect(() => {
    let ws;
    let reconnectTimeout;
    let isUnmounted = false;

    const connect = async () => {
      if (!WEBSOCKET_URL) return;

      const token = await getAuthToken();
      if (!token || isUnmounted) {
        console.error("❌ Token mancante o componente smontato");
        return;
      }

      const wsUrl = `${WEBSOCKET_URL}?token=${encodeURIComponent(token)}`;
      console.log("🔌 Tentativo di connessione WebSocket...");
      console.log("   URL:", wsUrl);
      
      setWsStatus('connecting');
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("✅ WebSocket CONNESSO con successo!");
        setWsStatus('connected');
      };

      ws.onmessage = (event) => {
        console.log("📩 Messaggio WebSocket ricevuto RAW:", event.data);
        
        try {
          const data = JSON.parse(event.data);
          console.log("📦 Dati parsati:", data);
          
          if (data.action === 'newAlert') {
            const newAlert = data.data;
            console.log("🚨 ALERT VALIDO RICEVUTO:", newAlert);
            
            setActiveAlerts(prev => {
              const updated = [newAlert, ...prev];
              console.log("📊 Allarmi aggiornati, totale:", updated.length);
              return updated;
            });
          } else {
            console.warn("⚠️ Messaggio ricevuto ma action non è 'newAlert':", data);
          }
        } catch (error) {
          console.error("❌ Errore parsing messaggio WebSocket:", error);
        }
      };

      ws.onclose = (event) => {
        console.log("🔌 WebSocket DISCONNESSO");
        console.log("   Code:", event.code);
        console.log("   Reason:", event.reason);
        console.log("   Clean:", event.wasClean);
        
        setWsStatus('disconnected');
        
        if (!isUnmounted) {
          console.log("🔄 Riconnessione tra 5 secondi...");
          reconnectTimeout = setTimeout(connect, 5000);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket ERRORE:", error);
        setWsStatus('error');
      };
    };

    connect();

    return () => {
      console.log("🧹 Cleanup WebSocket...");
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close();
      }
    };
  }, [WEBSOCKET_URL, getAuthToken]);

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="App">
          <header className="app-header">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h1>🏥 Cloud Hospital Monitor</h1>
              <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                {/* Indicatore stato WebSocket */}
                <div style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  fontSize: '0.8rem',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: wsStatus === 'connected' ? '#dcfce7' : '#fee2e2',
                  color: wsStatus === 'connected' ? '#166534' : '#991b1b'
                }}>
                  <span>{wsStatus === 'connected' ? '🟢' : '🔴'}</span>
                  <span>{wsStatus === 'connected' ? 'Live' : 'Disconnesso'}</span>
                </div>
                
                {/* Contatore allarmi */}
                {activeAlerts.length > 0 && (
                  <span className="live-alert-count">
                    🚨 {activeAlerts.length} NUOVI ALLARMI!
                  </span>
                )}
                
                <span style={{fontSize: '0.9rem'}}>Dr. {user?.username}</span>
                <button onClick={signOut} style={{cursor: 'pointer', padding: '5px 10px'}}>
                  Esci
                </button>
              </div>
            </div>
          </header>
          
          {/* Debug panel - RIMUOVI DOPO IL TEST */}
          <div style={{
            padding: '10px',
            margin: '10px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '0.85rem'
          }}>
            <strong>🔧 Debug Info:</strong><br/>
            WebSocket Status: <strong>{wsStatus}</strong><br/>
            Active Alerts: <strong>{activeAlerts.length}</strong><br/>
            {activeAlerts.length > 0 && (
              <>
                Latest Alert: <code>{JSON.stringify(activeAlerts[0], null, 2)}</code>
              </>
            )}
          </div>
          
          <div className="main-container">
            <div className="sidebar">
              <h3>Pazienti ({patients.length})</h3>
              <ul className="patient-list">
                {patients.map(p => (
                  <li 
                    key={p.patient_id} 
                    className={`patient-item ${p.status.toLowerCase()} ${selectedPatientId === p.patient_id ? 'active' : ''}`}
                    onClick={() => setSelectedPatientId(p.patient_id)}
                  >
                    <div className="p-info">
                      <strong>{p.name}</strong>
                      <span className="p-id">{p.patient_id}</span>
                    </div>
                    <span className={`badge ${p.status.toLowerCase()}`}>{p.status}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="content">
              <PatientDetail 
                patientId={selectedPatientId} 
                apiUrl={`${BASE_URL}/patients`}
                getAuthToken={getAuthToken} 
              />
            </div>
          </div>
        </div>
      )}
    </Authenticator>
  );
}

export default App;