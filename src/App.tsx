import React, { useState, useEffect, Suspense, memo } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { LoginComponent } from './components/LoginComponent';
import { useCopilotStudio, CopilotStudioConfig } from './CopilotStudioService';
import { PowerPlatformCloud, AgentType } from '@microsoft/agents-copilotstudio-client';
import { debugTokenScope } from './debugUtils';
import './App.css';

// Lazy load ChatInterface to reduce initial bundle
const ChatInterface = React.lazy(() => 
  import('./components/ChatInterface').then(module => ({ default: module.ChatInterface }))
);

// Loading fallback component
const LoadingFallback = memo(() => (
  <div className="copilot-loading">
    <div className="loading-spinner"></div>
    <p>Loading chat interface...</p>
  </div>
));

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { initializeCopilot, isInitialized, resetService } = useCopilotStudio();
  const [copilotError, setCopilotError] = useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState<string>('');

  // Reset service when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('User logged out, resetting Copilot service');
      resetService();
      setCopilotError(null);
      setCopilotLoading(false);
    }
  }, [isAuthenticated, resetService]);

  useEffect(() => {
    if (isAuthenticated && !isInitialized && !copilotLoading) {
      initializeCopilotStudio();
    }
  }, [isAuthenticated, isInitialized, copilotLoading]);

  const initializeCopilotStudio = async () => {
    setCopilotLoading(true);
    setCopilotError(null);

    try {
      console.log('Environment variables:', {
        environmentId: import.meta.env.VITE_COPILOT_ENVIRONMENT_ID,
        agentIdentifier: import.meta.env.VITE_COPILOT_AGENT_IDENTIFIER,
        appClientId: import.meta.env.VITE_COPILOT_APP_CLIENT_ID,
        tenantId: import.meta.env.VITE_COPILOT_TENANT_ID,
        cloud: import.meta.env.VITE_COPILOT_CLOUD,
        agentType: import.meta.env.VITE_COPILOT_AGENT_TYPE,
      //  directConnectUrl: import.meta.env.VITE_COPILOT_DIRECT_CONNECT_URL,
      });

      const config: CopilotStudioConfig = {
        environmentId: import.meta.env.VITE_COPILOT_ENVIRONMENT_ID || '',
        agentIdentifier: import.meta.env.VITE_COPILOT_AGENT_IDENTIFIER || '',
        appClientId: import.meta.env.VITE_COPILOT_APP_CLIENT_ID || '',
        tenantId: import.meta.env.VITE_COPILOT_TENANT_ID || '',
        cloud: (import.meta.env.VITE_COPILOT_CLOUD as PowerPlatformCloud) || PowerPlatformCloud.Prod,
        agentType: (import.meta.env.VITE_COPILOT_AGENT_TYPE as AgentType) || AgentType.Published,
        // directConnectUrl: import.meta.env.VITE_COPILOT_DIRECT_CONNECT_URL,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_COPILOT_TENANT_ID || 'common'}`,
        useMock: import.meta.env.VITE_USE_MOCK_CLIENT === 'true',
      };

      // Debug token scope
      console.log('Debugging token scope for configuration...');
      debugTokenScope(config);

      // Validate required configuration
      if (!config.environmentId || !config.agentIdentifier || !config.appClientId || !config.tenantId) {
        throw new Error('Missing required Copilot Studio configuration. Please check your environment variables.');
      }

      const welcomeText = await initializeCopilot(config);
      setWelcomeMessage(welcomeText);
    } catch (error) {
      console.error('Failed to initialize Copilot Studio:', error);
      setCopilotError(error instanceof Error ? error.message : 'Failed to initialize Copilot Studio');
    } finally {
      setCopilotLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app-container">
        <LoginComponent />
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Copilot Studio Chat</h1>
        <div className="user-info">
          <span>Welcome, {user?.name || user?.username || 'User'}</span>
        </div>
      </header>

      <main className="app-main">
        {copilotError && (
          <div className="error-banner">
            <p>Error: {copilotError}</p>
            <button onClick={initializeCopilotStudio} className="retry-button">
              Retry
            </button>
          </div>
        )}

        {copilotLoading && (
          <div className="copilot-loading">
            <div className="loading-spinner"></div>
            <p>Initializing Copilot Studio...</p>
          </div>
        )}

        {!copilotLoading && !copilotError && isInitialized && (
          <Suspense fallback={<LoadingFallback />}>
            <ChatInterface welcomeMessage={welcomeMessage} />
          </Suspense>
        )}

        {!copilotLoading && !copilotError && !isInitialized && (
          <div className="initialization-prompt">
            <p>Copilot Studio is not initialized.</p>
            <button onClick={initializeCopilotStudio} className="init-button">
              Initialize Copilot Studio
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;