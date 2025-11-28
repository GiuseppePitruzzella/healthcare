import React, { useState, useRef, useEffect } from 'react';
import './AlertsDropdown.css';

function AlertsDropdown({ alerts, onRemoveAlert, onClearAll }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Chiudi dropdown quando clicchi fuori
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Adesso';
    if (diffMins < 60) return `${diffMins} min fa`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h fa`;
    
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSeverityColor = (severity) => {
    switch(severity?.toUpperCase()) {
      case 'CRITICAL': return '#dc2626';
      case 'WARNING': return '#f59e0b';
      case 'INFO': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  return (
    <div className="alerts-dropdown-container" ref={dropdownRef}>
      {/* Bell Icon */}
      <button 
        className={`alerts-bell ${alerts.length > 0 ? 'has-alerts' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifiche"
      >
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        
        {alerts.length > 0 && (
          <span className="alerts-badge">{alerts.length}</span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="alerts-dropdown-panel">
          <div className="alerts-header">
            <h3>Notifiche ({alerts.length})</h3>
            {alerts.length > 0 && (
              <button 
                className="clear-all-btn"
                onClick={() => {
                  onClearAll();
                  setIsOpen(false);
                }}
              >
                Cancella Tutto
              </button>
            )}
          </div>

          <div className="alerts-list">
            {alerts.length === 0 ? (
              <div className="no-alerts">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeWidth="1.5"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeWidth="1.5"/>
                </svg>
                <p>Nessun allarme attivo</p>
              </div>
            ) : (
              alerts.map((alert, index) => (
                <div key={alert.alert_id || index} className="alert-item">
                  <div className="alert-content">
                    <div className="alert-header-row">
                      <span 
                        className="severity-badge"
                        style={{ 
                          backgroundColor: `${getSeverityColor(alert.severity)}15`,
                          color: getSeverityColor(alert.severity),
                          borderColor: getSeverityColor(alert.severity)
                        }}
                      >
                        {alert.severity || 'ALERT'}
                      </span>
                      <span className="alert-time">
                        {formatTime(alert.timestamp)}
                      </span>
                    </div>

                    <div className="alert-patient">
                      <strong>{alert.name || 'Paziente Sconosciuto'}</strong>
                      <span className="patient-id">{alert.patient_id}</span>
                    </div>

                    <div className="alert-violations">
                      {alert.violations && alert.violations.length > 0 ? (
                        <ul>
                          {alert.violations.map((violation, idx) => (
                            <li key={idx}>⚠️ {violation}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>{alert.message}</p>
                      )}
                    </div>
                  </div>

                  <button 
                    className="remove-alert-btn"
                    onClick={() => onRemoveAlert(alert.alert_id || index)}
                    aria-label="Rimuovi allarme"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AlertsDropdown;