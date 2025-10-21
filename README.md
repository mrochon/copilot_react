# Copilot Studio React Application

A React application that provides a front-end UI for Microsoft Copilot Studio agents using MSAL for authentication.

## Features

- 🔐 Microsoft Azure AD authentication using MSAL
- 💬 Real-time chat interface with Copilot Studio agents
- 📱 Responsive design for desktop and mobile
- ⚡ TypeScript support for better development experience
- 🎨 Modern UI with Microsoft Fluent Design principles

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
# MSAL Configuration
REACT_APP_CLIENT_ID=your-azure-app-client-id-here
REACT_APP_AUTHORITY=https://login.microsoftonline.com/common

# Copilot Studio Configuration
REACT_APP_COPILOT_ENVIRONMENT_ID=your-environment-id-here
REACT_APP_COPILOT_AGENT_IDENTIFIER=your-agent-schema-name-here
REACT_APP_COPILOT_APP_CLIENT_ID=your-copilot-app-client-id-here
REACT_APP_COPILOT_TENANT_ID=your-tenant-id-here
REACT_APP_COPILOT_DIRECT_CONNECT_URL=your-direct-connect-url-here
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
│   ├── ChatInterface.tsx      # Main chat interface
│   ├── LoginComponent.tsx     # Login/authentication UI
│   ├── MessageInput.tsx       # Message input component
│   └── MessageList.tsx        # Message display component
├── AuthContext.tsx            # MSAL authentication context
├── authConfig.ts              # MSAL configuration
├── CopilotStudioService.ts    # Copilot Studio client service
├── App.tsx                    # Main application component
├── App.css                    # Application styles
├── index.tsx                  # Application entry point
└── index.css                  # Global styles
```

## Key Components

### AuthContext
Manages MSAL authentication state and provides login/logout functionality.

### CopilotStudioService
Handles communication with the Copilot Studio agent using the Microsoft Agents SDK.

### ChatInterface
Main chat UI with message history, real-time messaging, and typing indicators.

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

## Dependencies

- **React 18**: Modern React with concurrent features
- **@microsoft/agents-copilotstudio-client**: Official Copilot Studio SDK
- **@azure/msal-browser & @azure/msal-react**: Microsoft Authentication Library
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