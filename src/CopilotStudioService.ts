import { CopilotStudioClient, ConnectionSettings, PowerPlatformCloud, AgentType } from '@microsoft/agents-copilotstudio-client';
import { Activity } from '@microsoft/agents-activity';
import { useAuth } from './AuthContext';
import { MockCopilotStudioClient } from './MockCopilotStudioClient';

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface CopilotStudioConfig {
  environmentId: string;
  agentIdentifier: string;
  appClientId: string;
  tenantId: string;
  cloud?: PowerPlatformCloud;
  agentType?: AgentType;
  directConnectUrl?: string;
  authority?: string;
  useMock?: boolean; // Flag to use mock client for testing
}

class CopilotStudioService {
  private client: CopilotStudioClient | MockCopilotStudioClient | null = null;
  private conversationId: string | null = null;

  async initialize(config: CopilotStudioConfig, accessToken: string): Promise<void> {
    try {
      console.log('Initializing Copilot Studio client with config:', {
        environmentId: config.environmentId,
        agentIdentifier: config.agentIdentifier,
        cloud: config.cloud,
        agentType: config.agentType,
        hasDirectConnectUrl: !!config.directConnectUrl
      });

      // Create connection settings
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

      console.log('Connection settings:', connectionSettings);

      // Initialize the Copilot Studio client (real or mock)
      if (config.useMock) {
        console.log('Using MockCopilotStudioClient for testing');
        this.client = new MockCopilotStudioClient(connectionSettings, accessToken);
      } else {
        console.log('Using real CopilotStudioClient');
        this.client = new CopilotStudioClient(connectionSettings, accessToken);
      }

      // Start a new conversation
      await this.startNewConversation();
    } catch (error) {
      console.error('Error initializing Copilot Studio client:', error);
      throw error;
    }
  }

  private async startNewConversation(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const activity = await this.client.startConversationAsync(true);
      this.conversationId = activity.conversation?.id || null;
    } catch (error) {
      console.error('Error starting new conversation:', error);
      throw error;
    }
  }

  async sendMessage(message: string): Promise<string> {
    if (!this.client || !this.conversationId) {
      throw new Error('Client or conversation not initialized');
    }

    try {
      const activities = await this.client.askQuestionAsync(message, this.conversationId);
      
      // Get the text from the last activity response
      const lastActivity = activities[activities.length - 1];
      return lastActivity?.text || 'No response received';
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async endConversation(): Promise<void> {
    // The Copilot Studio client doesn't have an explicit end conversation method
    // We'll just reset our local state
    this.conversationId = null;
    this.client = null;
  }

  isInitialized(): boolean {
    return this.client !== null && this.conversationId !== null;
  }
}

export const copilotService = new CopilotStudioService();

// Custom hook for using Copilot Studio with authentication
export const useCopilotStudio = () => {
  const { getAccessToken, isAuthenticated } = useAuth();

  const initializeCopilot = async (config: CopilotStudioConfig): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('User must be authenticated to use Copilot Studio');
    }

    try {
      const accessToken = await getAccessToken(config);
      if (!accessToken) {
        throw new Error('Unable to obtain access token');
      }
      await copilotService.initialize(config, accessToken);
    } catch (error) {
      console.error('Error initializing Copilot Studio:', error);
      throw error;
    }
  };

  const sendMessage = async (message: string): Promise<string> => {
    if (!copilotService.isInitialized()) {
      throw new Error('Copilot Studio client not initialized');
    }

    return await copilotService.sendMessage(message);
  };

  const endConversation = async (): Promise<void> => {
    await copilotService.endConversation();
  };

  return {
    initializeCopilot,
    sendMessage,
    endConversation,
    isInitialized: copilotService.isInitialized(),
  };
};