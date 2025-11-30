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
        console.log("📩 Messaggio ricevuto:", event.data);
        
        try {
          const message = JSON.parse(event.data);
          console.log("📦 Action:", message.action);
          
          // CASO 1: Nuovo Allarme Critico
          if (message.action === 'newAlert') {
            const newAlert = message.data;
            console.log("🚨 ALERT RICEVUTO:", newAlert);
            
            // 1. Aggiungi alla lista allarmi (campanella)
            setActiveAlerts(prev => {
              const exists = prev.some(alert => alert.alert_id === newAlert.alert_id);
              if (exists) {
                console.log("⚠️ Allarme già presente, ignorato");
                return prev;
              }
              console.log("✅ Allarme aggiunto alla lista");
              return [newAlert, ...prev];
            });

            // 2. CRITICO: Aggiorna lo status del paziente → Critical
            setPatients(prev => {
              const updated = prev.map(patient => {
                if (patient.patient_id === newAlert.patient_id) {
                  console.log(`🔄 Aggiornamento: ${patient.name} (${patient.status} → Critical)`);
                  return { ...patient, status: 'Critical' };
                }
                return patient;
              }).sort((a, b) => (a.status === 'Critical' ? -1 : 1));
              
              console.log(`📊 Lista aggiornata: ${updated.filter(p => p.status === 'Critical').length} pazienti Critical`);
              return updated;
            });
          }
          
          // CASO 2: Aggiornamento Parametri Vitali (Tutti i pazienti)
          else if (message.action === 'vitalUpdate') {
            const vitals = message.data;
            console.log(`📊 VitalUpdate: ${vitals.name} - Status: ${vitals.status}`);
            
            setPatients(prev => {
              const updated = prev.map(patient => {
                if (patient.patient_id === vitals.patient_id) {
                  return {
                    ...patient,
                    status: vitals.status,  // Aggiorna status (può essere Critical, Stable, Warning)
                    latest_vitals: {
                      heart_rate: vitals.heart_rate,
                      bp: `${vitals.bp_systolic}/${vitals.bp_diastolic}`,
                      spo2: vitals.spo2,
                      temperature: vitals.temperature,
                      timestamp: vitals.timestamp
                    }
                  };
                }
                return patient;
              }).sort((a, b) => {
                // Ordinamento: Critical > Warning > Stable
                const order = { Critical: 0, Warning: 1, Stable: 2 };
                return (order[a.status] || 999) - (order[b.status] || 999);
              });
              
              return updated;
            });
          }
          
        } catch (error) {
          console.error("❌ Errore parsing messaggio:", error);
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

  // ⚠️ POLLING COMPLETAMENTE DISABILITATO
  // Il WebSocket gestisce TUTTI gli aggiornamenti in tempo reale
  // Non riattivare questo codice a meno che non ci siano modifiche esterne al database
  
  /*
  // ❌ NON USARE - Causa conflitti con WebSocket
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = await getAuthToken();
      if (!token) return;

      try {
        const response = await axios.get(`${BASE_URL}/patients`, {
          headers: { Authorization: token }
        });
        const sorted = response.data.sort((a, b) => (a.status === 'Critical' ? -1 : 1));
        
        setPatients(prev => {
          return sorted.map(dbPatient => {
            const localPatient = prev.find(p => p.patient_id === dbPatient.patient_id);
            if (localPatient?.latest_vitals) {
              return { ...dbPatient, latest_vitals: localPatient.latest_vitals };
            }
            return dbPatient;
          });
        });
        
        console.log("🔄 Lista pazienti aggiornata dal database");
      } catch (error) {
        console.error("Errore refresh pazienti:", error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [BASE_URL, getAuthToken]);
  */

  // Rimuovi un singolo allarme
  const handleRemoveAlert = useCallback((alertId) => {
    console.log(`🗑️ Tentativo rimozione allarme ID: ${alertId}`);
    
    setActiveAlerts(prev => {
      const filtered = prev.filter((alert, index) => {
        // Usa alert_id se disponibile, altrimenti usa l'index
        const currentId = alert.alert_id || index;
        return currentId !== alertId;
      });
      
      console.log(`   Prima: ${prev.length} allarmi, Dopo: ${filtered.length} allarmi`);
      return filtered;
    });
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

                      {/* Mostra parametri vitali (solo se disponibili via vitalUpdate) */}
                      {p.latest_vitals && (
                        <span style={{
                          fontSize: '0.75rem', 
                          color: '#737373', 
                          display: 'block',
                          marginTop: '4px'
                        }}>
                          HR: {p.latest_vitals.heart_rate} | BP: {p.latest_vitals.bp} | SpO2: {p.latest_vitals.spo2}%
                        </span>
                      )}
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