import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function PatientDetail({ patientId, patientName, apiUrl, getAuthToken }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) return;

    const fetchHistory = async () => {
      setLoading(true);
      
      const token = await getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
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

  }, [patientId, apiUrl, getAuthToken]);

  if (!patientId) {
    return (
      <div className="placeholder">
        Select a patient from the list
      </div>
    );
  }

  if (loading && history.length === 0) {
    return (
      <div className="patient-detail" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <div style={{ textAlign: 'center', color: '#999999', fontSize: '0.875rem' }}>
          Loading clinical data...
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: '#ffffff',
          padding: '0.75rem 1rem',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e8e8e8',
          fontSize: '0.8rem'
        }}>
          <p style={{ 
            margin: '0 0 0.5rem 0', 
            fontWeight: '500', 
            color: '#0a0a0a',
            fontSize: '0.75rem',
            fontFamily: 'Courier New, monospace'
          }}>
            {payload[0].payload.timestamp}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ 
              margin: '0.25rem 0', 
              color: entry.color, 
              fontSize: '0.8rem',
              fontWeight: '400'
            }}>
              {entry.name}: <span style={{ fontWeight: '500' }}>{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const latestData = history[history.length - 1] || {};

  return (
    <div className="patient-detail">
      <h2>{patientName}</h2>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: '1rem', 
        marginBottom: '3rem' 
      }}>
        <div style={{
          background: '#fafafa',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e8e8e8'
        }}>
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#737373', 
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: '500'
          }}>
            Heart Rate
          </div>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: '400', 
            color: '#0a0a0a',
            letterSpacing: '-0.02em'
          }}>
            {latestData.heart_rate || '--'}
            <span style={{ fontSize: '0.875rem', color: '#999999', marginLeft: '0.5rem', fontWeight: '400' }}>
              BPM
            </span>
          </div>
        </div>

        <div style={{
          background: '#fafafa',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e8e8e8'
        }}>
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#737373', 
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: '500'
          }}>
            Systolic
          </div>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: '400', 
            color: '#0a0a0a',
            letterSpacing: '-0.02em'
          }}>
            {latestData.bp_systolic || '--'}
            <span style={{ fontSize: '0.875rem', color: '#999999', marginLeft: '0.5rem', fontWeight: '400' }}>
              mmHg
            </span>
          </div>
        </div>

        <div style={{
          background: '#fafafa',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e8e8e8'
        }}>
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#737373', 
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: '500'
          }}>
            Diastolic
          </div>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: '400', 
            color: '#0a0a0a',
            letterSpacing: '-0.02em'
          }}>
            {latestData.bp_diastolic || '--'}
            <span style={{ fontSize: '0.875rem', color: '#999999', marginLeft: '0.5rem', fontWeight: '400' }}>
              mmHg
            </span>
          </div>
        </div>
      </div>

      {/* Heart Rate Chart */}
      <div className="chart-container">
        <h3>Heart Rate</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" vertical={false} />
            <XAxis 
              dataKey="timestamp" 
              tick={{ fontSize: 11, fill: '#999999' }}
              tickFormatter={(value) => value.split(' ')[1]?.substring(0, 5) || ''}
              stroke="#e8e8e8"
            />
            <YAxis 
              domain={[40, 160]} 
              tick={{ fontSize: 11, fill: '#999999' }}
              stroke="#e8e8e8"
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="heart_rate" 
              stroke="#0a0a0a" 
              strokeWidth={2} 
              dot={false}
              activeDot={{ r: 4, fill: '#0a0a0a' }}
              name="Heart Rate"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Blood Pressure Chart */}
      <div className="chart-container">
        <h3>Blood Pressure</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" vertical={false} />
            <XAxis 
              dataKey="timestamp" 
              tick={{ fontSize: 11, fill: '#999999' }}
              tickFormatter={(value) => value.split(' ')[1]?.substring(0, 5) || ''}
              stroke="#e8e8e8"
            />
            <YAxis 
              domain={[50, 200]} 
              tick={{ fontSize: 11, fill: '#999999' }}
              stroke="#e8e8e8"
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="bp_systolic" 
              stroke="#0a0a0a" 
              strokeWidth={2}
              name="Systolic" 
              dot={false}
              activeDot={{ r: 4, fill: '#0a0a0a' }}
            />
            <Line 
              type="monotone" 
              dataKey="bp_diastolic" 
              stroke="#737373" 
              strokeWidth={2}
              name="Diastolic" 
              dot={false}
              activeDot={{ r: 4, fill: '#737373' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default PatientDetail;