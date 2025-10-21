import { Configuration, PublicClientApplication } from '@azure/msal-browser';

// MSAL configuration
const msalConfig: Configuration = {
  auth: {
    clientId: process.env.REACT_APP_CLIENT_ID || 'your-client-id-here',
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_TENANT_ID || 'common'}`,
    redirectUri: process.env.REACT_APP_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: process.env.REACT_APP_REDIRECT_URI || window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case 1: // LogLevel.Error
            console.error(message);
            return;
          case 2: // LogLevel.Warning
            console.warn(message);
            return;
          case 3: // LogLevel.Info
            console.info(message);
            return;
          case 4: // LogLevel.Verbose
            console.debug(message);
            return;
          default:
            return;
        }
      }
    }
  }
};

// Create MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);

// Login request configuration
export const loginRequest = {
  scopes: [
    'openid', 
    'profile', 
    'user.read'
  ],
};