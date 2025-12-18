import { CopilotStudioClient, ConnectionSettings, PowerPlatformCloud, AgentType } from '@microsoft/agents-copilotstudio-client';

// Debugging utility to test token scope resolution
export const debugTokenScope = (config: any) => {
  try {
    const connectionSettings: ConnectionSettings = {
      environmentId: config.environmentId,
      agentIdentifier: config.agentIdentifier,
      appClientId: config.appClientId,
      tenantId: config.tenantId,
      cloud: config.cloud || PowerPlatformCloud.Prod,
      copilotAgentType: config.agentType || AgentType.Published,
      directConnectUrl: config.directConnectUrl,
      authority: config.authority || 'https://login.microsoftonline.com',
    };

    const tokenScope = CopilotStudioClient.scopeFromSettings(connectionSettings);
    
    console.log('=== Token Scope Debug Information ===');
    console.log('Configuration:', connectionSettings);
    console.log('Resolved Token Scope:', tokenScope);
    console.log('=====================================');
    
    return tokenScope;
  } catch (error) {
    console.error('Error resolving token scope:', error);
    return null;
  }
};

// Test with your configuration
export const testConfiguration = () => {
  const config = {
    environmentId: import.meta.env.VITE_COPILOT_ENVIRONMENT_ID || '',
    agentIdentifier: import.meta.env.VITE_COPILOT_AGENT_IDENTIFIER || '',
    appClientId: import.meta.env.VITE_COPILOT_APP_CLIENT_ID || '',
    tenantId: import.meta.env.VITE_COPILOT_TENANT_ID || '',
    cloud: (import.meta.env.VITE_COPILOT_CLOUD as PowerPlatformCloud) || PowerPlatformCloud.Prod,
    agentType: (import.meta.env.VITE_COPILOT_AGENT_TYPE as AgentType) || AgentType.Published,
    // directConnectUrl: import.meta.env.VITE_COPILOT_DIRECT_CONNECT_URL,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_COPILOT_TENANT_ID || 'common'}`,
  };

  return debugTokenScope(config);
};