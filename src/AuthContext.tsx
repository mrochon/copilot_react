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
  userPhotoUrl: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { instance, accounts, inProgress } = useMsal();
  const [user, setUser] = useState<AccountInfo | null>(null);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('MSAL accounts changed:', accounts.length);
    if (accounts.length > 0) {
      console.log('Setting user from MSAL accounts:', accounts[0].username);
      setUser(accounts[0]);
      void fetchUserPhoto(accounts[0]);
    } else {
      setUser(null);
      setUserPhotoUrl(null);
    }
    setIsLoading(false);
  }, [accounts]);

  const fetchUserPhoto = async (account: AccountInfo) => {
    try {
      const tokenRequest = {
        scopes: ['User.Read'],
        account: account
      };

      const response = await instance.acquireTokenSilent(tokenRequest);

      const photoResponse = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
        headers: {
          Authorization: `Bearer ${response.accessToken}`
        }
      });

      if (photoResponse.ok) {
        const photoBlob = await photoResponse.blob();
        const photoUrl = URL.createObjectURL(photoBlob);
        setUserPhotoUrl(photoUrl);
        console.log('User photo fetched successfully');
      } else {
        console.warn('Failed to fetch user photo:', photoResponse.statusText);
      }
    } catch (error) {
      console.warn('Error fetching user photo:', error);
    }
  };

  const login = async (): Promise<void> => {
    try {
      setIsLoading(true);
      console.log('Starting login process...');
      console.log('MSAL Config:', {
        clientId: instance.getConfiguration().auth.clientId,
        authority: instance.getConfiguration().auth.authority,
        redirectUri: instance.getConfiguration().auth.redirectUri
      });

      const response: AuthenticationResult = await instance.loginPopup({
        ...loginRequest,
        redirectUri: window.location.origin, // Explicitly set redirect URI
      });

      console.log('Login successful:', response.account?.username);

      // Pre-fetch token for Power Platform to ensure consent is granted
      try {
        const tokenRequest = {
          scopes: ['https://api.powerplatform.com/.default'],
          account: response.account,
        };
        await instance.acquireTokenSilent(tokenRequest);
        console.log('Power Platform token pre-fetched successfully');
      } catch (tokenError) {
        console.warn('Could not pre-fetch Power Platform token silently:', tokenError);
        // This is OK - it will be requested interactively later if needed
      }

      // The account will be set automatically via the useEffect above
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      console.log('Starting logout process...');

      // Get the current account to logout
      const currentAccount = accounts[0];

      if (currentAccount) {
        console.log('Logging out account:', currentAccount.username);

        // Logout with specific account to ensure proper token cleanup
        await instance.logoutPopup({
          account: currentAccount,
          postLogoutRedirectUri: import.meta.env.VITE_REDIRECT_URI || window.location.origin
        });
      } else {
        // Fallback to generic logout if no account found
        await instance.logoutPopup();
      }

      // Note: logoutPopup with specific account should handle token cleanup
      // MSAL will clear tokens for the logged out account automatically

      setUser(null);
      console.log('Logout completed successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state
      setUser(null);
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
      console.error('Error getting access token silently:', error);

      // Check if this is a consent required error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isConsentRequired = errorMessage.includes('consent_required') ||
        errorMessage.includes('interaction_required') ||
        errorMessage.includes('login_required');

      try {
        // Try to get token interactively if silent acquisition fails
        let tokenScope: string;
        if (config) {
          try {
            tokenScope = CopilotStudioClient.scopeFromSettings({
              environmentId: config.environmentId,
              agentIdentifier: config.agentIdentifier,
              appClientId: config.appClientId,
              tenantId: config.tenantId,
              cloud: config.cloud,
              directConnectUrl: config.directConnectUrl,
              authority: config.authority || 'https://login.microsoftonline.com',
            } as ConnectionSettings);
          } catch {
            tokenScope = 'https://api.powerplatform.com/.default';
          }
        } else {
          tokenScope = 'https://api.powerplatform.com/.default';
        }

        const tokenRequest = {
          scopes: [tokenScope],
          account: accounts[0],
          // Force consent prompt if consent is required
          ...(isConsentRequired && { prompt: 'consent' as any }),
        };

        console.log('Trying interactive token acquisition with scope:', tokenScope);
        if (isConsentRequired) {
          console.log('Forcing consent prompt due to consent_required error');
        }

        const response = await instance.acquireTokenPopup(tokenRequest);
        console.log('Interactive token acquisition successful');
        return response.accessToken;
      } catch (interactiveError) {
        console.error('Interactive token acquisition failed:', interactiveError);
        throw new Error('Failed to acquire access token. Please ensure you have the necessary permissions and try logging in again.');
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
    userPhotoUrl,
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