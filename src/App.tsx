import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { ChatInterface } from './components/ChatInterface';
import { LoginComponent } from './components/LoginComponent';
import { useCopilotStudio, CopilotStudioConfig } from './CopilotStudioService';
import { PowerPlatformCloud, AgentType } from '@microsoft/agents-copilotstudio-client';
import { debugTokenScope } from './debugUtils';
import './App.css';

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
        environmentId: process.env.REACT_APP_COPILOT_ENVIRONMENT_ID,
        agentIdentifier: process.env.REACT_APP_COPILOT_AGENT_IDENTIFIER,
        appClientId: process.env.REACT_APP_COPILOT_APP_CLIENT_ID,
        tenantId: process.env.REACT_APP_COPILOT_TENANT_ID,
        cloud: process.env.REACT_APP_COPILOT_CLOUD,
        agentType: process.env.REACT_APP_COPILOT_AGENT_TYPE,
      //  directConnectUrl: process.env.REACT_APP_COPILOT_DIRECT_CONNECT_URL,
      });

      const config: CopilotStudioConfig = {
        environmentId: process.env.REACT_APP_COPILOT_ENVIRONMENT_ID || '',
        agentIdentifier: process.env.REACT_APP_COPILOT_AGENT_IDENTIFIER || '',
        appClientId: process.env.REACT_APP_COPILOT_APP_CLIENT_ID || '',
        tenantId: process.env.REACT_APP_COPILOT_TENANT_ID || '',
        cloud: (process.env.REACT_APP_COPILOT_CLOUD as PowerPlatformCloud) || PowerPlatformCloud.Prod,
        agentType: (process.env.REACT_APP_COPILOT_AGENT_TYPE as AgentType) || AgentType.Published,
        // directConnectUrl: process.env.REACT_APP_COPILOT_DIRECT_CONNECT_URL,
        authority: `https://login.microsoftonline.com/${process.env.REACT_APP_TENANT_ID || 'common'}`,
        useMock: process.env.REACT_APP_USE_MOCK_CLIENT === 'true',
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
          <ChatInterface welcomeMessage={welcomeMessage} />
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