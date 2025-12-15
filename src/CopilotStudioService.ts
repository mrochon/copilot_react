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

  private isConsentCard(activity: any): boolean {
    // Check if this activity contains a consent adaptive card
    if (!activity?.attachments || !Array.isArray(activity.attachments) || activity.attachments.length === 0) {
      return false;
    }
    console.log('Response includes attachements')
    console.log('Checking activity for consent card:', activity);
    const attachment = activity.attachments[0] as any;
    if (!attachment?.content?.body || !Array.isArray(attachment.content.body)) {
      return false;
    }

    // Look for the "Connect to continue" text block
    const hasConnectText = attachment.content.body.some((item: any) => 
      item.type === 'TextBlock' && 
      item.text && 
      item.text.includes('Agent needs your permission to continue')
    );

    if (!hasConnectText) {
      return false;
    }

    // Look for Allow and Cancel action buttons
    //MR: This code is not looking for these buttons correctly and above test is sufficeint anyway
    // const actions = attachment.content.actions;
    // if (!actions || !Array.isArray(actions)) {
    //   return false;
    // }

    // const hasAllowButton = actions.some((action: any) => 
    //   action.type === 'Action.Submit' && action.title === 'Allow'
    // );
    // const hasCancelButton = actions.some((action: any) => 
    //   action.type === 'Action.Submit' && action.title === 'Cancel'
    // );

    // return hasAllowButton && hasCancelButton;
    return true;
  }

  private async respondToConsentCard(userChoice: 'Allow' | 'Cancel'): Promise<Activity[]> {
    if (!this.client || !this.conversationId) {
      throw new Error('Client or conversation not initialized');
    }

    console.log(`Responding to consent card with: ${userChoice}`);

    // Create the consent response activity as an adaptive card response
    // This mimics the user clicking the Allow/Cancel button on the adaptive card
    // Based on: https://microsoft.github.io/mcscatblog/posts/connector-consent-card-obo
    const consentActivity = {
      type: 'message',
      from: {
        id: 'user'
      },
      channelData: {
        postBack: true
      },
      value: {
        action: userChoice,
        id: 'submit'
      }
    } as any;

    // Use sendActivity instead of askQuestionAsync to send the Activity object
    // This simulates the adaptive card button click
    const activities = await this.client.sendActivity(consentActivity, this.conversationId);
    console.log('Received activities after consent response:', activities);
    return activities;
  }

  async sendMessage(message: string): Promise<string> {
    if (!this.client || !this.conversationId) {
      throw new Error('Client or conversation not initialized');
    }

    try {
      let activities = await this.client.askQuestionAsync(message, this.conversationId);
      console.log('Received activities from Copilot Studio:', activities);
      
      // Check if any activity is a consent card
      // See https://microsoft.github.io/mcscatblog/posts/connector-consent-card-obo
      const consentActivity = activities.find(activity => this.isConsentCard(activity));
      if (consentActivity) {
        console.log('Consent card detected, automatically sending Allow response');
        // Automatically respond with "Allow" and get the next set of activities
        activities = await this.respondToConsentCard('Allow');
      }

      // Get the text from the last activity response
      const lastActivity = activities[activities.length - 1];
      
      // Check if attachments exist and have the expected structure
      if (lastActivity?.attachments && Array.isArray(lastActivity.attachments) && lastActivity.attachments.length > 0) {
        const attachment = lastActivity.attachments[0] as any;
        if (attachment?.content?.body && Array.isArray(attachment.content.body) && attachment.content.body.length > 0) {
          const text = attachment.content.body[0].text;
          return text;
        }
      }
      
      return lastActivity?.text || 'No response received';
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Check if this is an authorization error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('permission') || 
          errorMessage.includes('unauthorized') || 
          errorMessage.includes('403') ||
          errorMessage.includes('401')) {
        throw new Error('Authorization error: The agent needs your permission to continue. Please refresh the page and grant the necessary permissions when prompted.');
      }
      
      throw error;
    }
  }

  async endConversation(): Promise<void> {
    // The Copilot Studio client doesn't have an explicit end conversation method
    // We'll just reset our local state
    this.conversationId = null;
    this.client = null;
  }

  reset(): void {
    // Force reset all service state (useful for logout)
    console.log('Resetting Copilot Studio service');
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

  const resetService = (): void => {
    copilotService.reset();
  };

  return {
    initializeCopilot,
    sendMessage,
    endConversation,
    resetService,
    isInitialized: copilotService.isInitialized(),
  };
};