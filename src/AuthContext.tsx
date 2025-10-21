import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';
import { CopilotStudioClient, ConnectionSettings } from '@microsoft/agents-copilotstudio-client';
import { loginRequest } from './authConfig';

interface AuthContextType {
  user: AccountInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: (config?: any) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { instance, accounts, inProgress } = useMsal();
  const [user, setUser] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('MSAL accounts changed:', accounts.length);
    if (accounts.length > 0) {
      console.log('Setting user from MSAL accounts:', accounts[0].username);
      setUser(accounts[0]);
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, [accounts]);

  const login = async (): Promise<void> => {
    try {
      setIsLoading(true);
      console.log('Starting login process...');
      const response: AuthenticationResult = await instance.loginPopup(loginRequest);
      console.log('Login successful:', response.account?.username);
      // The account will be set automatically via the useEffect above
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      console.log('Starting logout process...');
      await instance.logoutPopup();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAccessToken = async (config?: any): Promise<string | null> => {
    try {
      if (accounts.length === 0) {
        console.log('No accounts available for token acquisition');
        return null;
      }

      let tokenScope: string;
      
      if (config) {
        // Use the Copilot Studio client to determine the correct token audience
        try {
          const connectionSettings: ConnectionSettings = {
            environmentId: config.environmentId,
            agentIdentifier: config.agentIdentifier,
            appClientId: config.appClientId,
            tenantId: config.tenantId,
            cloud: config.cloud,
            directConnectUrl: config.directConnectUrl,
            authority: config.authority || 'https://login.microsoftonline.com',
          };
          
          // Get the correct token audience from the Copilot Studio client
          tokenScope = CopilotStudioClient.scopeFromSettings(connectionSettings);
          console.log('Using token scope from Copilot Studio settings:', tokenScope);
        } catch (error) {
          console.error('Error determining token scope:', error);
          // Fallback to default scope
          tokenScope = 'https://api.powerplatform.com/.default';
        }
      } else {
        // Default scope for Power Platform
        tokenScope = 'https://api.powerplatform.com/.default';
      }

      // Request token for Power Platform API
      const tokenRequest = {
        scopes: [tokenScope],
        account: accounts[0],
      };

      console.log('Requesting access token with scope:', tokenScope);
      const response = await instance.acquireTokenSilent(tokenRequest);
      console.log('Access token acquired successfully');
      return response.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      try {
        // Try to get token interactively if silent acquisition fails
        const tokenRequest = {
          scopes: [config ? CopilotStudioClient.scopeFromSettings({
            environmentId: config.environmentId,
            agentIdentifier: config.agentIdentifier,
            appClientId: config.appClientId,
            tenantId: config.tenantId,
            cloud: config.cloud,
            directConnectUrl: config.directConnectUrl,
            authority: config.authority || 'https://login.microsoftonline.com',
          } as ConnectionSettings) : 'https://api.powerplatform.com/.default'],
          account: accounts[0],
        };
        console.log('Trying interactive token acquisition...');
        const response = await instance.acquireTokenPopup(tokenRequest);
        console.log('Interactive token acquisition successful');
        return response.accessToken;
      } catch (interactiveError) {
        console.error('Interactive token acquisition failed:', interactiveError);
        return null;
      }
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading: isLoading || inProgress !== 'none',
    login,
    logout,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};