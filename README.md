# Copilot Studio agent custom front-end

A React application that provides a front-end UI for a Microsoft Copilot Studio agent.

## Features

- 🎭 Handles conversation with a Copilot Studio agent
- 🔐 Microsoft Azure AD authentication using MSAL
- 💬 Real-time chat interface with Copilot Studio agents
- 🎭 Human-like (eh!) avatar with lip-sync animation
- 🔊 Azure Speech Service integration for text-to-speech
- 👄 Real-time viseme-based lip synchronization
- 📱 Responsive design for desktop and mobile
- ⚡ TypeScript support for better development experience
- 🎨 Modern UI with Microsoft Fluent Design principles
- 🧪 Mock client for development and testing

## Prerequisites

Before running this application, you need:

1. **Azure AD Application Registration**
   - Create an application registration in Azure AD
   - Configure redirect URIs for your application
   - Configure [API permissions](https://learn.microsoft.com/en-us/microsoft-copilot-studio/publication-integrate-web-or-native-app-m365-agents-sdk?tabs=dotnet#configure-your-app-registration-for-user-interactive-sign-in) (`CopilotStudio.Copilots.Invoke`). See below.

**Note:** Seems like Github Copilot generated code asks for and gets a token to 'https://api.powerplatform.com'. Its name under *API my organization uses* is *Dataverse* (not PowerPlatform API). Its appid is *00000007-0000-0000-c000-000000000000*. Found [some documentation](https://learn.microsoft.com/en-us/power-platform/admin/programmability-authentication-v2?tabs=powershell#step-2-configure-api-permissions) saying I need to add app with id=8578e004-a5c6-46e7-913e-12f58912df43 as Service Principal and grant user_impersonation. That returns an access token with aud=https://api.gov.powerplatform.microsoft.us/ (!!).


2. **Copilot Studio Agent**
   - Create and publish an agent in Microsoft Copilot Studio
   - Enable Microsoft authentication
   - ???
   - Get the Environment ID and Agent Schema Name from Metadata
   - Configure API permissions for 
   

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

### 6. Avatar Photo Setup (Optional)

To use a real human face for the avatar:

1. Add your photo to `public/avatars/` (for example `public/avatars/agent.jpg`)
2. Update the `.env` file with the photo path and optional mouth placement tweaks:
   ```env
   REACT_APP_AVATAR_IMAGE_URL=/avatars/agent.jpg
   REACT_APP_AVATAR_MOUTH_TOP=68%
   REACT_APP_AVATAR_MOUTH_LEFT=50%
   REACT_APP_AVATAR_MOUTH_WIDTH=24%
   REACT_APP_AVATAR_MOUTH_HEIGHT=14%
   ```
3. Adjust the mouth placement values to align the lip-sync overlay with your photo

The mouth values accept any CSS unit (e.g., `%`, `px`) and control the overlay's
position and size relative to the image.

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

### Real Photo Support
- Drop in any JPEG/PNG headshot to immediately personalize the avatar
- Configurable mouth overlay to match your subject's facial geometry
- Reverts to the stylised fallback if no photo is supplied

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

## Next steps

1. Secure Speech Service secret
1. Consider LiveKit for audio handling
2. Do custom voice training

## License

This project is licensed under the MIT License - see the LICENSE file for details.