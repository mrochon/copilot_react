import React from 'react';
import ReactDOM from 'react-dom/client';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './authConfig';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Initialize MSAL instance
msalInstance.initialize().then(() => {
  console.log('MSAL initialized');
  
  // Handle redirect promise
  msalInstance.handleRedirectPromise()
    .then((response) => {
      if (response) {
        console.log('Redirect authentication successful:', response);
      }
    })
    .catch((error) => {
      console.error('Error handling redirect:', error);
    });
}).catch((error) => {
  console.error('Error initializing MSAL:', error);
});

// Render app immediately
root.render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  </React.StrictMode>
);