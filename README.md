# Copilot Studio React Application

A React application that provides a front-end UI for Microsoft Copilot Studio agents using MSAL for authentication.

## Features

- 🔐 Microsoft Azure AD authentication using MSAL
- 💬 Real-time chat interface with Copilot Studio agents
- 🎭 **NEW**: Human-like avatar with lip-sync animation
- 🔊 **NEW**: Azure Speech Service integration for text-to-speech
- 👄 **NEW**: Real-time viseme-based lip synchronization
- 📱 Responsive design for desktop and mobile
- ⚡ TypeScript support for better development experience
- 🎨 Modern UI with Microsoft Fluent Design principles
- 🧪 Mock client for development and testing

## Prerequisites

Before running this application, you need:

1. **Azure AD Application Registration**
   - Create an application registration in Azure AD
   - Configure redirect URIs for your application
   - Note the Client ID and Tenant ID

2. **Copilot Studio Agent**
   - Create and publish an agent in Microsoft Copilot Studio
   - Get the Environment ID and Agent Schema Name
   - Configure API permissions for `CopilotStudio.Copilots.Invoke`

3. **Azure Speech Service (Optional for Avatar Features)**
   - Create an Azure Speech Service resource
   - Get the subscription key and region
   - Required for text-to-speech and lip-sync functionality

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd copilot-studio-react-app

# Install dependencies
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
# Azure AD Configuration
REACT_APP_CLIENT_ID=your-azure-app-client-id-here
REACT_APP_TENANT_ID=your-tenant-id-here
REACT_APP_REDIRECT_URI=http://localhost:3000

# Copilot Studio Configuration
REACT_APP_COPILOT_ENVIRONMENT_ID=your-environment-id-here
REACT_APP_COPILOT_AGENT_IDENTIFIER=your-agent-schema-name-here
REACT_APP_COPILOT_APP_CLIENT_ID=your-copilot-app-client-id-here
REACT_APP_COPILOT_TENANT_ID=your-tenant-id-here
REACT_APP_COPILOT_CLOUD=Prod
REACT_APP_COPILOT_AGENT_TYPE=Published

# Azure Speech Service Configuration (Optional)
REACT_APP_SPEECH_KEY=your-azure-speech-service-key
REACT_APP_SPEECH_REGION=eastus
REACT_APP_SPEECH_VOICE=en-US-JennyNeural

# Development/Testing Configuration
REACT_APP_USE_MOCK_CLIENT=false
```

### 3. Azure AD Configuration

1. Go to the [Azure Portal](https://portal.azure.com)
2. Navigate to Azure Active Directory > App registrations
3. Create a new registration or select an existing one
4. Configure the following:
   - **Redirect URIs**: Add `http://localhost:3000` for development
   - **API permissions**: Add `CopilotStudio.Copilots.Invoke` permission
   - **Authentication**: Enable public client flows if needed

### 4. Copilot Studio Setup

1. Go to [Copilot Studio](https://copilotstudio.microsoft.com)
2. Create or open your agent
3. Publish the agent
4. Go to Settings > Advanced > Metadata and copy:
   - Schema name (Agent Identifier)
   - Environment ID

### 5. Azure Speech Service Setup (Optional)

For avatar lip-sync and text-to-speech features:

1. Go to the [Azure Portal](https://portal.azure.com)
2. Create a new **Speech Service** resource
3. Go to **Keys and Endpoint** section
4. Copy **Key 1** and **Region**
5. Add these to your `.env` file:
   ```env
   REACT_APP_SPEECH_KEY=your-speech-service-key
   REACT_APP_SPEECH_REGION=your-region (e.g., eastus)
   ```

**Supported Voices**: The application supports all Azure Neural voices. Popular options:
- `en-US-JennyNeural` (default, female)
- `en-US-GuyNeural` (male)
- `en-US-AriaNeural` (female)
- `en-GB-SoniaNeural` (British female)
- `en-AU-NatashaNeural` (Australian female)

**Note**: If Azure Speech Service is not configured, the avatar will still display but without voice and lip-sync.

## Running the Application

### Development Mode

```bash
npm start
```

The application will open at `http://localhost:3000`.

### Production Build

```bash
npm run build
```

This creates an optimized production build in the `build/` folder.

## Project Structure

```
src/
├── components/
│   ├── Avatar.tsx             # Animated avatar with lip-sync
│   ├── Avatar.css             # Avatar styles and animations
│   ├── ChatInterface.tsx      # Main chat interface with avatar
│   ├── LoginComponent.tsx     # Login/authentication UI
│   ├── MessageInput.tsx       # Message input component
│   └── MessageList.tsx        # Message display component
├── hooks/
│   └── useSpeechAvatar.ts     # Speech avatar integration hook
├── AuthContext.tsx            # MSAL authentication context
├── authConfig.ts              # MSAL configuration
├── AzureSpeechService.ts      # Azure Speech Service integration
├── CopilotStudioService.ts    # Copilot Studio client service
├── MockCopilotStudioClient.ts # Mock client for testing
├── debugUtils.ts              # Debugging utilities
├── App.tsx                    # Main application component
├── App.css                    # Application styles
├── index.tsx                  # Application entry point
└── index.css                  # Global styles
```

## Key Components

### Avatar
An animated human-like avatar that:
- Displays realistic facial expressions
- Synchronizes lip movements with speech (visemes)
- Shows listening and speaking states
- Provides visual feedback during conversations

### AzureSpeechService
Integration with Azure Speech Service that:
- Converts text responses to natural speech
- Generates viseme data for lip synchronization
- Supports multiple neural voices
- Handles audio playback and timing

### AuthContext
Manages MSAL authentication state and provides login/logout functionality.

### CopilotStudioService
Handles communication with the Copilot Studio agent using the Microsoft Agents SDK.
Includes mock client support for testing without live connections.

### ChatInterface
Main chat UI with message history, real-time messaging, typing indicators, and integrated avatar display.

### useSpeechAvatar Hook
Custom React hook that:
- Manages Azure Speech Service integration
- Handles speech synthesis with viseme data
- Provides loading and error states
- Coordinates audio playback timing

## Authentication Flow

1. User clicks "Sign in with Microsoft"
2. MSAL handles Azure AD authentication
3. Application receives access token
4. Copilot Studio client initializes with the token
5. User can start chatting with the agent

## Troubleshooting

### Common Issues

1. **MSAL Configuration Errors**
   - Verify Client ID and Tenant ID are correct
   - Check redirect URIs in Azure AD
   - Ensure proper API permissions are granted

2. **Copilot Studio Connection Issues**
   - Verify Environment ID and Agent Identifier
   - Check that the agent is published
   - Ensure proper API permissions for Copilot Studio

3. **Build Errors**
   - Run `npm install` to ensure all dependencies are installed
   - Check TypeScript configuration in `tsconfig.json`

### Getting Help

- Check the browser console for detailed error messages
- Verify environment variables are set correctly
- Ensure Azure AD and Copilot Studio configurations match

## Avatar Features

### Lip-Sync Technology
The avatar uses Azure Speech Service's viseme data to provide accurate lip synchronization:

- **Visemes**: Speech sounds mapped to mouth shapes
- **Real-time sync**: Mouth movements match audio timing
- **Natural animation**: Smooth transitions between mouth shapes
- **Multiple expressions**: Support for vowels, consonants, and silence

### Avatar Animations
- **Eye blinking**: Random, natural blinking patterns
- **Listening state**: Visual indicator when processing user input
- **Speaking animation**: Gentle movement during speech
- **Responsive design**: Scales appropriately on different screen sizes

### Testing and Development

#### Mock Client
Set `REACT_APP_USE_MOCK_CLIENT=true` to use the mock Copilot Studio client:
- No network dependencies
- Predictable responses for UI testing
- Simulates conversation flow
- Perfect for development and demos

#### Speech Service Testing
- Works without Azure Speech Service (silent avatar)
- Graceful degradation when service unavailable
- Detailed error reporting and user feedback

## Dependencies

- **React 18**: Modern React with concurrent features
- **@microsoft/agents-copilotstudio-client**: Official Copilot Studio SDK
- **@azure/msal-browser & @azure/msal-react**: Microsoft Authentication Library
- **microsoft-cognitiveservices-speech-sdk**: Azure Speech Service SDK
- **TypeScript**: Type safety and better development experience
- **UUID**: Unique identifier generation for messages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.