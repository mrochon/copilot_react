# Building a Voice-Enabled React UI for Copilot Studio Agent

## Overview

This document outlines how to build a custom React application that serves as a user interface for a Microsoft Copilot Studio agent. The UI supports both text and voice input, displays voice input as text, and delivers responses in both text and voice using a lip-synced avatar. The app uses MSAL for authentication via Entra ID and is hosted as an Azure Static Web App.

---

## 1. Lip-Synced Avatar Technology

**Recommended Service**: Azure Cognitive Services – Text-to-Speech Avatar

- Converts text into a photorealistic video of a human avatar speaking.
- Supports real-time synthesis via WebRTC.
- Offers prebuilt avatars and voices; custom avatars available via registration.
- Integrates with Azure Speech SDK for JavaScript.

**Setup Requirements**:
- Azure Speech resource (Standard S0 tier).
- Choose avatar character and style (e.g., “Lisa”, “casual-sitting”).
- Configure `SpeechSynthesisVoiceName` and `AvatarConfig` in SDK.

---

## 2. Copilot Studio Agent Configuration

**Channel**: Direct Line (Web/Custom Website)

**Authentication Options**:
- **Direct Line Secret**: Use in backend only.
- **Token Exchange**: Recommended. Use secret to generate short-lived tokens via Azure Function or secure backend.
- **Microsoft 365 Agents SDK**: Alternative with built-in SSO support (recommended for new projects).

**Security Settings**:
- Enable “Require secured access” in Copilot Studio.
- Use token-based authentication for browser clients.
- Avoid exposing secrets in frontend code.

---

## 3. Required Azure Services

| Service | Purpose |
|--------|--------|
| Azure Speech Service | Speech-to-text, text-to-speech, avatar rendering |
| Azure Static Web Apps | Hosting the React application |
| Azure AD (Entra ID) | Authentication via MSAL |
| Azure Function (optional) | Secure token exchange for Direct Line |
| Azure Bot Service (optional) | Only needed for advanced channel routing |

---

## 4. SDKs and APIs for React App

### Authentication
- **MSAL** (`@azure/msal-browser`, `@azure/msal-react`)
  - Handles login via Entra ID.
  - Protects UI and backend token exchange endpoint.

### Speech Input/Output
- **Azure Speech SDK for JavaScript** (`microsoft-cognitiveservices-speech-sdk`)
  - `SpeechRecognizer`: Captures voice and converts to text.
  - `SpeechSynthesizer`: Converts text to speech.
  - `AvatarSynthesizer`: Streams avatar video and audio via WebRTC.

### Agent Communication
- **Bot Framework Direct Line API**
  - REST or WebSocket protocol.
  - Use Direct Line JS client or REST endpoints.
  - Requires token for secure access.

### UI Integration
- `<video>` element for avatar rendering.
- `<audio>` element for voice playback.
- State management for conversation flow and media control.

---

## Architecture Summary

1. **User logs in** via MSAL.
2. **React app requests Direct Line token** from secure backend.
3. **User speaks or types question**.
4. **Speech SDK transcribes voice** to text.
5. **Text sent to Copilot agent** via Direct Line.
6. **Agent responds with text**.
7. **Speech SDK renders avatar** speaking the response.
8. **UI displays text and avatar video/audio**.

---

## References

- [Azure Text-to-Speech Avatar Overview](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech-avatar/what-is-text-to-speech-avatar)
- [Real-Time Avatar Synthesis Guide](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech-avatar/real-time-synthesis-avatar)
- [Copilot Studio Channel Security](https://learn.microsoft.com/en-us/microsoft-copilot-studio/configure-web-security)
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/integrate-web-native-apps-agents-sdk
- [GitHub Sample: Copilot Studio + Azure Speech](https://github.com/nguyennhianhtri/copilot-studio-azure-avatar)

---

## Notes

- Avatar feature is in public preview and available in select Azure regions.
- Ensure secure handling of secrets and tokens.
- Consider fallback to audio-only if avatar rendering fails or is unsupported.


# Architecture Comparison: Copilot Studio Agent vs. Foundry Agent (Agent Framework)

## Overview

This document compares the architectural differences between using a Microsoft Copilot Studio agent and a Foundry Agent built with the Microsoft Agent Framework API. It highlights hosting models, communication flows, SDKs, authentication, and deployment strategies.

---

## 🧠 Copilot Studio Agent (Managed)

```plaintext
[User Browser (React App)]
     |
     |-- MSAL (Azure AD) Authentication
     |
     |-- Azure Speech SDK (STT/TTS + Avatar)
     |
     |-- Direct Line Token Exchange
     |
     v
[Direct Line Channel (Microsoft-managed)]
     |
     v
[Copilot Studio Agent (Microsoft-hosted)]
     |
     |-- Built-in plugins, flows, and connectors
     |
     v
[Response: Text + optional actions]