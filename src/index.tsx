import React from 'react';
import ReactDOM from 'react-dom/client';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './authConfig';
import App from './App';
import './index.css';

// Initialize MSAL and handle redirects before rendering
msalInstance.initialize().then(() => {
  // Handle redirect promise to complete authentication
  msalInstance.handleRedirectPromise()
    .then((response) => {
      if (response) {
        console.log('Redirect authentication successful:', response);
      }
      
      const root = ReactDOM.createRoot(
        document.getElementById('root') as HTMLElement
      );

      root.render(
        <React.StrictMode>
          <MsalProvider instance={msalInstance}>
            <App />
          </MsalProvider>
        </React.StrictMode>
      );
    })
    .catch((error) => {
      console.error('Error handling redirect:', error);
      
      // Still render the app even if there's an error
      const root = ReactDOM.createRoot(
        document.getElementById('root') as HTMLElement
      );

      root.render(
        <React.StrictMode>
          <MsalProvider instance={msalInstance}>
            <App />
          </MsalProvider>
        </React.StrictMode>
      );
    });
}).catch((error) => {
  console.error('MSAL initialization error:', error);
});