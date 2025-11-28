import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Authenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth'; 
import '@aws-amplify/ui-react/styles.css';
import PatientDetail from './components/PatientDetail';
import AlertsDropdown from './components/AlertsDropdown';
import './App.css';

function App() {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);

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
      
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("✅ WebSocket CONNESSO con successo!");
      };

      ws.onmessage = (event) => {
        console.log("📩 Messaggio WebSocket ricevuto:", event.data);
        
        try {
          const data = JSON.parse(event.data);
          
          if (data.action === 'newAlert') {
            const newAlert = data.data;
            console.log("🚨 ALERT RICEVUTO:", newAlert);
            
            setActiveAlerts(prev => {
              // Evita duplicati basati su alert_id
              const exists = prev.some(alert => alert.alert_id === newAlert.alert_id);
              if (exists) return prev;
              return [newAlert, ...prev];
            });
          }
        } catch (error) {
          console.error("❌ Errore parsing messaggio WebSocket:", error);
        }
      };

      ws.onclose = (event) => {
        console.log("🔌 WebSocket DISCONNESSO - Code:", event.code);
        
        if (!isUnmounted) {
          console.log("🔄 Riconnessione tra 5 secondi...");
          reconnectTimeout = setTimeout(connect, 5000);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket ERRORE:", error);
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

  // Rimuovi un singolo allarme
  const handleRemoveAlert = useCallback((alertId) => {
    setActiveAlerts(prev => prev.filter(alert => 
      (alert.alert_id || alert.patient_id) !== alertId
    ));
    console.log(`🗑️ Allarme rimosso: ${alertId}`);
  }, []);

  // Cancella tutti gli allarmi
  const handleClearAllAlerts = useCallback(() => {
    setActiveAlerts([]);
    console.log("🗑️ Tutti gli allarmi cancellati");
  }, []);

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="App">
          <header className="app-header">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h1>🏥 Cloud Hospital Monitor</h1>
              <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                {/* Dropdown Allarmi */}
                <AlertsDropdown 
                  alerts={activeAlerts}
                  onRemoveAlert={handleRemoveAlert}
                  onClearAll={handleClearAllAlerts}
                />
                
                <span style={{fontSize: '0.9rem'}}>Dr. {user?.username}</span>
                <button onClick={signOut} style={{cursor: 'pointer', padding: '5px 10px'}}>
                  Esci
                </button>
              </div>
            </div>
          </header>
          
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