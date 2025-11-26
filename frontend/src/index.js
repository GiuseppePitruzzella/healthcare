import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Amplify } from 'aws-amplify';

// --- CONFIGURAZIONE COGNITO ---
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'eu-north-1_91ml6EEGx', 
      
      userPoolClientId: '49o2b0oc2ek4d4pdhn0kn8sclk', 
      
      loginWith: {
        email: true,
      }
    }
  }
});
// -----------------------------

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);