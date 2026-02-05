import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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
  getAccessTokenForScopes: (scopes: string[]) => Promise<string | null>;
  userPhotoUrl: string | null;
  consentError: string | null;
  resetConsentAttempts: (scope?: string) => void;
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
  const [consentError, setConsentError] = useState<string | null>(null);
  const consentAttemptsRef = useRef<Map<string, { count: number; lastAttempt: number }>>(new Map());
  const MAX_CONSENT_ATTEMPTS = 3;
  const CONSENT_ATTEMPT_WINDOW_MS = 60000; // 1 minute

  const checkConsentLoop = (scope: string): boolean => {
    const now = Date.now();
    const attempts = consentAttemptsRef.current.get(scope);
    
    if (!attempts) {
      consentAttemptsRef.current.set(scope, { count: 1, lastAttempt: now });
      return false;
    }
    
    // Reset if outside window
    if (now - attempts.lastAttempt > CONSENT_ATTEMPT_WINDOW_MS) {
      consentAttemptsRef.current.set(scope, { count: 1, lastAttempt: now });
      return false;
    }
    
    // Increment and check
    attempts.count++;
    attempts.lastAttempt = now;
    
    if (attempts.count > MAX_CONSENT_ATTEMPTS) {
      console.error(`Consent loop detected for scope: ${scope}`);
      return true;
    }
    
    return false;
  };

  const resetConsentAttempts = (scope?: string) => {
    if (scope) {
      consentAttemptsRef.current.delete(scope);
    } else {
      consentAttemptsRef.current.clear();
    }
    setConsentError(null);
  };

  const isInteractionRequiredError = (error: unknown): boolean => {
    const errorMessage = error instanceof Error ? error.message : String(error || '');
    const errorCode = (error as { errorCode?: string })?.errorCode;
    const errorString = `${errorCode || ''} ${errorMessage}`.toLowerCase();

    return (
      errorString.includes('consent_required') ||
      errorString.includes('interaction_required') ||
      errorString.includes('login_required') ||
      errorString.includes('aadsts65001')
    );
  };

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

      let response: AuthenticationResult;
      try {
        response = await instance.acquireTokenSilent(tokenRequest);
      } catch (error) {
        if (!isInteractionRequiredError(error)) {
          throw error;
        }

        response = await instance.acquireTokenPopup({
          ...tokenRequest,
          prompt: 'consent' as any,
        });
      }

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
        if (isInteractionRequiredError(tokenError)) {
          try {
            await instance.acquireTokenPopup({
              scopes: ['https://api.powerplatform.com/.default'],
              account: response.account,
              prompt: 'consent' as any,
            });
            console.log('Power Platform token pre-fetched interactively');
          } catch (interactiveError) {
            console.warn('Interactive pre-fetch for Power Platform failed:', interactiveError);
          }
        }
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

  const getAccessTokenForScopes = async (scopes: string[]): Promise<string | null> => {
    const scopeKey = scopes.join(',');
    
    try {
      if (accounts.length === 0) {
        console.log('No accounts available for token acquisition');
        return null;
      }

      const tokenRequest = {
        scopes,
        account: accounts[0],
      };

      console.log('Requesting access token with scopes:', scopes);
      const response = await instance.acquireTokenSilent(tokenRequest);
      console.log('Access token acquired successfully');
      resetConsentAttempts(scopeKey);
      return response.accessToken;
    } catch (error) {
      console.error('Error getting access token silently:', error);

      const isConsentRequired = isInteractionRequiredError(error);
      
      if (!isConsentRequired) {
        throw error;
      }

      // Check for consent loop
      if (checkConsentLoop(scopeKey)) {
        const errorMsg = `Consent loop detected for scopes: ${scopes.join(', ')}. ` +
          'This usually means:\n' +
          '1. The app registration needs admin consent granted in Azure Portal\n' +
          '2. The required API permissions are not configured\n' +
          '3. Popup blockers are preventing consent dialogs\n\n' +
          'For Azure Speech Service: Ensure the app has "Cognitive Services" > "user_impersonation" delegated permission.';
        setConsentError(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const tokenRequest = {
          scopes,
          account: accounts[0],
          prompt: 'consent' as any,
        };

        console.log('Trying interactive token acquisition with scopes:', scopes);
        console.log('Forcing consent prompt due to consent_required error');

        const response = await instance.acquireTokenPopup(tokenRequest);
        console.log('Interactive token acquisition successful');
        resetConsentAttempts(scopeKey);
        return response.accessToken;
      } catch (interactiveError) {
        console.error('Interactive token acquisition failed:', interactiveError);
        
        // Check if popup was blocked
        const errorMsg = interactiveError instanceof Error ? interactiveError.message : String(interactiveError);
        if (errorMsg.includes('popup_window_error') || errorMsg.includes('popup was blocked')) {
          const blockMsg = 'Popup was blocked by browser. Please allow popups for this site and try again.';
          setConsentError(blockMsg);
          throw new Error(blockMsg);
        }
        
        try {
          // Fallback to full login popup to complete consent if token popup is dismissed
          console.log('Falling back to login popup for consent with scopes:', scopes);
          const response = await instance.loginPopup({
            scopes,
            prompt: 'consent' as any,
          });
          console.log('Login popup consent successful');
          resetConsentAttempts(scopeKey);
          return response.accessToken;
        } catch (loginError) {
          console.error('Login popup consent failed:', loginError);
          const finalErrorMsg = 'Failed to acquire access token. Please:\n' +
            '1. Ensure popups are not blocked\n' +
            '2. Check that API permissions are configured in Azure Portal\n' +
            '3. Grant admin consent if required\n' +
            '4. Try logging out and logging back in';
          setConsentError(finalErrorMsg);
          throw new Error(finalErrorMsg);
        }
      }
    }
  };

  const getAccessToken = async (config?: any): Promise<string | null> => {
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

    return getAccessTokenForScopes([tokenScope]);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading: isLoading || inProgress !== 'none',
    login,
    logout,
    getAccessToken,
    getAccessTokenForScopes,
    userPhotoUrl,
    consentError,
    resetConsentAttempts,
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