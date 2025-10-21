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
    environmentId: process.env.REACT_APP_COPILOT_ENVIRONMENT_ID || '',
    agentIdentifier: process.env.REACT_APP_COPILOT_AGENT_IDENTIFIER || '',
    appClientId: process.env.REACT_APP_COPILOT_APP_CLIENT_ID || '',
    tenantId: process.env.REACT_APP_COPILOT_TENANT_ID || '',
    cloud: (process.env.REACT_APP_COPILOT_CLOUD as PowerPlatformCloud) || PowerPlatformCloud.Prod,
    agentType: (process.env.REACT_APP_COPILOT_AGENT_TYPE as AgentType) || AgentType.Published,
    directConnectUrl: process.env.REACT_APP_COPILOT_DIRECT_CONNECT_URL,
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_TENANT_ID || 'common'}`,
  };

  return debugTokenScope(config);
};