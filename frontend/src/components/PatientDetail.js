import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Notare: ora riceviamo 'getAuthToken' come prop dal padre
function PatientDetail({ patientId, apiUrl, getAuthToken }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) return;

    const fetchHistory = async () => {
      setLoading(true);
      
      // 1. Recuperiamo il token
      const token = await getAuthToken();
      if (!token) return;

      try {
        // 2. Chiamata API autenticata
        const response = await axios.get(`${apiUrl}/${patientId}`, {
          headers: { Authorization: token }
        });
        
        const reversedData = response.data.history.reverse(); 
        setHistory(reversedData);
      } catch (error) {
        console.error("Errore caricamento dettagli:", error);
      }
      setLoading(false);
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);

  }, [patientId, apiUrl, getAuthToken]); // Aggiunto getAuthToken alle dipendenze

  if (!patientId) return <div className="placeholder">Seleziona un paziente dalla lista</div>;
  if (loading && history.length === 0) return <div>Caricamento dati clinici...</div>;

  return (
    <div className="patient-detail">
      <h2>Monitoraggio Real-Time: {patientId}</h2>
      
      <div className="chart-container">
        <h3>Battito Cardiaco (BPM)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" tick={false} />
            <YAxis domain={[40, 160]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="heart_rate" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* ... Il resto dei grafici rimane uguale ... */}
       <div className="chart-container">
        <h3>Pressione Sanguigna (mmHg)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" tick={false} />
            <YAxis domain={[50, 200]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="bp_systolic" stroke="#ff7300" name="Sistolica" />
            <Line type="monotone" dataKey="bp_diastolic" stroke="#387908" name="Diastolica" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default PatientDetail;