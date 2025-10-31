import { Activity } from '@microsoft/agents-activity';
import { ConnectionSettings, PowerPlatformCloud } from '@microsoft/agents-copilotstudio-client';

export class MockCopilotStudioClient {
  private connectionSettings: ConnectionSettings;
  private accessToken: string;
  private conversationId: string = '';
  private messageCount: number = 0;
  private lastResponse: string = 'Hello';

  constructor(connectionSettings: ConnectionSettings, accessToken: string) {
    this.connectionSettings = connectionSettings;
    this.accessToken = accessToken;
    
    console.log('MockCopilotStudioClient initialized with settings:', {
      environmentId: connectionSettings.environmentId,
      agentIdentifier: connectionSettings.agentIdentifier,
      cloud: connectionSettings.cloud,
      agentType: connectionSettings.copilotAgentType
    });
  }

  async startConversationAsync(startNewConversation: boolean = true): Promise<Activity> {
    console.log('MockCopilotStudioClient: Starting new conversation...');
    
    // Simulate some processing delay
    await this.simulateDelay(500);
    
    // Generate a mock conversation ID
    this.conversationId = `mock_conversation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const startActivity = {
      type: 'message',
      id: `activity_start_${Date.now()}`,
      timestamp: new Date(),
      from: {
        id: 'copilot_agent',
        name: 'Copilot Agent'
      },
      conversation: {
        id: this.conversationId
      },
      text: 'Hello! I\'m your mock Copilot Studio agent. How can I help you today?',
      channelData: {}
    } as Activity;

    console.log('MockCopilotStudioClient: Conversation started with ID:', this.conversationId);
    return startActivity;
  }

  async askQuestionAsync(question: string, conversationId: string): Promise<Activity[]> {
    console.log(`MockCopilotStudioClient: Received question "${question}" for conversation ${conversationId}`);
    
    // Simulate processing delay
    await this.simulateDelay(1000);
    
    this.messageCount++;
    
    // Generate mock responses based on the question
    const response = this.generateMockResponse(question);
    this.lastResponse = response;
    
    const responseActivity = {
      type: 'message',
      id: `activity_response_${Date.now()}`,
      timestamp: new Date(),
      from: {
        id: 'copilot_agent',
        name: 'Copilot Studio Agent'
      },
      conversation: {
        id: conversationId
      },
      text: response,
      channelData: {}
    } as Activity;

    console.log('MockCopilotStudioClient: Sending response:', response);
    return [responseActivity];
  }

  private generateMockResponse(question: string): string {
    const lowerQuestion = question.toLowerCase();
    
    // Simulate different types of responses based on keywords
    if (lowerQuestion.includes('hello') || lowerQuestion.includes('hi')) {
      return 'Hello! Great to meet you. What would you like to know?';
    } else if (lowerQuestion.includes('help')) {
      return 'I\'m here to help! This is a mock response. In a real scenario, I would connect to your Copilot Studio agent.';
    } else if (lowerQuestion.includes('weather')) {
      return 'I\'m a mock agent, so I can\'t check real weather data. But I can tell you it\'s always sunny in the world of testing! ☀️';
    } else if (lowerQuestion.includes('time')) {
      return `The current time is ${new Date().toLocaleTimeString()}. This is from the mock client.`;
    } else if (lowerQuestion.includes('repeat')) {
      return this.lastResponse;      
    } else if (lowerQuestion.includes('bye') || lowerQuestion.includes('goodbye')) {
      return 'Goodbye! Thanks for testing with the mock Copilot Studio client.';
    } else if (lowerQuestion.includes('error') || lowerQuestion.includes('test error')) {
      // Simulate an error for testing error handling
      throw new Error('Mock error: This is a simulated error for testing purposes');
    } else {
      // Generic responses with some variation
      const responses = [
        `That's an interesting question about "${question}". This is a mock response from your test agent.`,
        `I understand you're asking about "${question}". In a real scenario, your Copilot Studio agent would provide a more specific answer.`,
        `Thanks for your question: "${question}". This mock client is working properly! Your real agent would handle this differently.`,
        `Regarding "${question}" - this is response #${this.messageCount} from the mock client. Everything seems to be functioning correctly.`,
        `I received your message about "${question}". This mock agent confirms that your authentication and client setup are working properly.`
      ];
      
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Mock method to simulate the static scopeFromSettings method
  static scopeFromSettings(settings: ConnectionSettings): string {
    console.log('MockCopilotStudioClient: Getting scope for settings...');
    
    // Return a mock scope based on the cloud setting
    switch (settings.cloud) {
      case PowerPlatformCloud.Gov:
        return 'https://api.gov.powerplatform.microsoft.us/.default';
      case PowerPlatformCloud.Prod:
      default:
        return 'https://api.powerplatform.com/.default';
    }
  }
}