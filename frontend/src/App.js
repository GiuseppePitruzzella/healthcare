import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Authenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth'; 
import '@aws-amplify/ui-react/styles.css';
import PatientDetail from './components/PatientDetail';
import './App.css';

function App() {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  
  const BASE_URL = "https://kok1mewu89.execute-api.eu-north-1.amazonaws.com/prod";

  // Funzione magica: recupera il Token JWT dell'utente loggato
  const getAuthToken = async () => {
    try {
      const session = await fetchAuthSession();
      return session.tokens.idToken.toString();
    } catch (error) {
      console.error("Errore token:", error);
      return null;
    }
  };

  useEffect(() => {
    const fetchPatients = async () => {
      // 1. Chiediamo il pass
      const token = await getAuthToken();
      if (!token) return;

      try {
        // 2. Lo mostriamo all'entrata (Header Authorization)
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
  }, []);

  return (
    // Questo componente crea tutto il sistema di Login!
    <Authenticator>
      {({ signOut, user }) => (
        <div className="App">
          <header className="app-header">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h1>🏥 Cloud Hospital Monitor</h1>
              <div style={{fontSize: '0.9rem'}}>
                <span style={{marginRight: '15px'}}>Dr. {user?.username}</span>
                <button onClick={signOut} style={{cursor: 'pointer', padding: '5px 10px'}}>Esci</button>
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
              {/* Passiamo la funzione del token e l'URL al componente figlio */}
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

// import React, { useEffect, useState } from 'react';
// import axios from 'axios';
// import PatientDetail from './components/PatientDetail';
// import './App.css';

// function App() {
//   const [patients, setPatients] = useState([]);
//   const [selectedPatientId, setSelectedPatientId] = useState(null);

//   const BASE_URL = "https://kok1mewu89.execute-api.eu-north-1.amazonaws.com/prod"; 

//   useEffect(() => {
//     const fetchPatients = async () => {
//       try {
//         const response = await axios.get(`${BASE_URL}/patients`);
//         const sorted = response.data.sort((a, b) => (a.status === 'Critical' ? -1 : 1));
//         setPatients(sorted);
//       } catch (error) {
//         console.error("Errore lista pazienti:", error);
//       }
//     };
//     fetchPatients();
//   }, []);

//   const getStatusIcon = (status) => {
//     switch(status) {
//       case 'Critical': return '🔴';
//       case 'Warning': return '🟡';
//       case 'Stable': return '🟢';
//       default: return '⚪';
//     }
//   };

//   return (
//     <div className="App">
//       <header className="app-header">
//         <div className="header-content">
//           <div className="header-left">
//             <div className="logo">
//               <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
//                 <rect width="32" height="32" rx="8" fill="url(#gradient)"/>
//                 <path d="M16 8v16M8 16h16" stroke="white" strokeWidth="3" strokeLinecap="round"/>
//                 <defs>
//                   <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32">
//                     <stop offset="0%" stopColor="#667eea"/>
//                     <stop offset="100%" stopColor="#764ba2"/>
//                   </linearGradient>
//                 </defs>
//               </svg>
//             </div>
//             <h1>Hospital Monitor</h1>
//           </div>
//           <div className="header-stats">
//             <div className="stat-badge critical-count">
//               {patients.filter(p => p.status === 'Critical').length} Critici
//             </div>
//             <div className="stat-badge warning-count">
//               {patients.filter(p => p.status === 'Warning').length} Attenzione
//             </div>
//           </div>
//         </div>
//       </header>
      
//       <div className="main-container">
//         <aside className="sidebar">
//           <div className="sidebar-header">
//             <h3>Pazienti</h3>
//             <span className="patient-count">{patients.length}</span>
//           </div>
//           <div className="patient-list">
//             {patients.map(p => (
//               <div 
//                 key={p.patient_id} 
//                 className={`patient-card ${p.status.toLowerCase()} ${selectedPatientId === p.patient_id ? 'selected' : ''}`}
//                 onClick={() => setSelectedPatientId(p.patient_id)}
//               >
//                 <div className="patient-card-header">
//                   <span className="status-icon">{getStatusIcon(p.status)}</span>
//                   <div className="patient-info">
//                     <h4>{p.name}</h4>
//                     <span className="patient-id">{p.patient_id}</span>
//                   </div>
//                 </div>
//                 <div className={`status-badge ${p.status.toLowerCase()}`}>
//                   {p.status}
//                 </div>
//               </div>
//             ))}
//           </div>
//         </aside>

//         <main className="content">
//           <PatientDetail 
//             patientId={selectedPatientId} 
//             apiUrl={`${BASE_URL}/patients`} 
//           />
//         </main>
//       </div>
//     </div>
//   );
// }

// export default App;