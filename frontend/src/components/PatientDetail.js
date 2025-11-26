import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function PatientDetail({ patientId, apiUrl }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        // Chiama l'endpoint specifico /patients/PTxxxxx
        const response = await axios.get(`${apiUrl}/${patientId}`);
        
        // I dati arrivano invertiti (dal più recente), li giriamo per il grafico (dal più vecchio)
        const reversedData = response.data.history.reverse(); 
        setHistory(reversedData);
      } catch (error) {
        console.error("Errore caricamento dettagli:", error);
      }
      setLoading(false);
    };

    fetchHistory();
    
    // Polling: Aggiorna il grafico ogni 5 secondi automaticamente!
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);

  }, [patientId, apiUrl]);

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
            <XAxis dataKey="timestamp" tick={false} /> {/* Nascondiamo l'ora per pulizia */}
            <YAxis domain={[40, 160]} /> {/* Scala fissa medica */}
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="heart_rate" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

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