import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCopilotStudio, ChatMessage } from '../CopilotStudioService';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Avatar, AvatarRef } from './Avatar';
import { useAuth } from '../AuthContext';
import { useSpeechAvatar } from '../hooks/useSpeechAvatar';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { EndChatModal } from './EndChatModal';
import { TopicRotator } from './TopicRotator';

interface ChatInterfaceProps {
  welcomeMessage: string;
  isInteractionEnabled?: boolean;
  onEndSession: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ welcomeMessage, isInteractionEnabled = true, onEndSession }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const { sendMessage, resetService } = useCopilotStudio();
  const { logout, userPhotoUrl, getAccessTokenForScopes, consentError, resetConsentAttempts } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<AvatarRef>(null);
  const chatContentRef = useRef<HTMLDivElement>(null);
  const [showEndChatModal, setShowEndChatModal] = useState(false);

  // Initialize speech avatar with TTS provider
  const ttsProvider = (import.meta.env.VITE_TTS_PROVIDER || 'azure') as 'azure' | 'elevenlabs';
  const speechScope = import.meta.env.VITE_SPEECH_SCOPE || 'https://cognitiveservices.azure.com/user_impersonation';

  const getSpeechToken = useCallback(async () => {
    return await getAccessTokenForScopes([speechScope]);
  }, [getAccessTokenForScopes, speechScope]);

  const speechAvatar = useSpeechAvatar({
    ttsProvider,
    // Azure configuration
    speechRegion: import.meta.env.VITE_SPEECH_REGION || 'eastus',
    voiceName: import.meta.env.VITE_SPEECH_VOICE || 'en-US-JennyNeural',
    getSpeechToken,
    // ElevenLabs configuration
    elevenLabsApiKey: import.meta.env.VITE_ELEVENLABS_API_KEY || '',
    elevenLabsVoiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
    elevenLabsModel: import.meta.env.VITE_ELEVENLABS_MODEL || 'eleven_multilingual_v2'
  });

  const {
    isInitialized: isSpeechInitialized,
    isSpeaking: isAvatarSpeaking,
    isLoading: isSpeechLoading,
    error: speechAvatarError,
    visemeData,
    audioBuffer,
    speakWithLipSync,
    handleSpeechStart,
    handleSpeechEnd,
    clearError: clearSpeechAvatarError
  } = speechAvatar;

  const avatarImageSrc = import.meta.env.VITE_AVATAR_IMAGE_URL;

  const avatarMouthConfig = useMemo(() => ({
    top: import.meta.env.VITE_AVATAR_MOUTH_TOP || '68%',
    left: import.meta.env.VITE_AVATAR_MOUTH_LEFT || '50%',
    width: import.meta.env.VITE_AVATAR_MOUTH_WIDTH || '24%',
    height: import.meta.env.VITE_AVATAR_MOUTH_HEIGHT || '14%',
  }), []);

  const recognitionLanguage = useMemo(() => {
    const explicitLanguage = import.meta.env.VITE_SPEECH_RECOGNITION_LANGUAGE;
    if (explicitLanguage && explicitLanguage.trim()) {
      return explicitLanguage.trim();
    }

    const voiceName = import.meta.env.VITE_SPEECH_VOICE;
    if (voiceName) {
      const localeMatch = voiceName.match(/^[a-z]{2}-[A-Z]{2}/);
      if (localeMatch) {
        return localeMatch[0];
      }
    }

    return 'en-US';
  }, []);

  const {
    isRecording: isVoiceRecording,
    interimResult: voiceInterimResult,
    finalResult: voiceFinalResult,
    error: voiceError,
    startRecording,
    stopRecording,
    reset: resetVoiceRecognition
  } = useSpeechRecognition({ language: recognitionLanguage });

  const [inputResetToken, setInputResetToken] = useState(0);
  const [externalInput, setExternalInput] = useState<string | null>(null);
  const hasSpokenWelcomeRef = useRef(false);

  const cleanTextForSpeech = useCallback((text: string) => {
    return text
      .replace(/\[\d+\](\([^\)]+\))?/g, '')    // Remove citation links like [1] or [1](URL)
      .replace(/\^(\d+)\^/g, '')               // Remove superscript citations like ^1^
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Keep filename for other links like [File.pdf](URL)
      .replace(/(https?:\/\/[^\s]+)/g, '')     // Strip standalone URLs
      .replace(/\*Source:\*/gi, "Source: ")    // Make Source label sound natural
      .replace(/EZCORP/gi, "easy corp")
      .replace(/EZPAWN/gi, "easy pawn")
      .replace(/:/g, ", ");
  }, []);

  // Handle welcome message: Wait for speech to init, then play and show message
  useEffect(() => {
    // If interaction is disabled, wait
    if (!isInteractionEnabled) {
      return;
    }

    // If no welcome message, or already spoken, do nothing
    if (!welcomeMessage || hasSpokenWelcomeRef.current) {
      return;
    }

    // Define function to add message (with or without typing animation)
    const addWelcomeMessage = (duration: number = 0) => {
      const welcome: ChatMessage = {
        id: uuidv4(),
        text: welcomeMessage,
        isUser: false,
        timestamp: new Date(),
        typingDuration: duration > 0 ? duration : undefined
      };
      setMessages([welcome]);
      hasSpokenWelcomeRef.current = true;
    };

    // If speech is NOT initialized and NOT loading, we might be in a state where speech won't load
    // (e.g. missing keys). Wait a bit and then just show the message.
    if (!isSpeechInitialized && !isSpeechLoading && !speechAvatarError) {
      const timeoutId = setTimeout(() => {
        if (!hasSpokenWelcomeRef.current) {
          console.log('Speech service not ready, showing welcome message without audio');
          addWelcomeMessage();
        }
      }, 2000); // 2 second fallback
      return () => clearTimeout(timeoutId);
    }

    // Logic when speech IS initialized
    if (isSpeechInitialized && !isAvatarSpeaking && !isSpeechLoading) {
      console.log('Attempting to speak welcome message...');

      // Use setTimeout to ensure Avatar component is ready
      const timeoutId = setTimeout(() => {
        speakWithLipSync(cleanTextForSpeech(welcomeMessage))
          .then(duration => {
            // Speech prepared successfully, NOW show the message with typing
            addWelcomeMessage(duration);
          })
          .catch((error) => {
            console.error('Failed to speak welcome message:', error);
            // Speech failed, show message anyway without typing/audio
            addWelcomeMessage();
          });
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [isSpeechInitialized, welcomeMessage, isAvatarSpeaking, isSpeechLoading, speakWithLipSync, cleanTextForSpeech, speechAvatarError, isInteractionEnabled]);

  const handleSendMessage = useCallback(async (text: string) => {
    // Stop any ongoing speech when user sends a new message (interruption)
    if (isAvatarSpeaking) {
      avatarRef.current?.stopSpeech();
    }

    const userMessage: ChatMessage = {
      id: uuidv4(),
      text,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    // setIsListening(true); // Removed: Avatar shouldn't animate as "listening" during processing

    try {
      const rawResponse = await sendMessage(text);
      const cleanResponse = rawResponse.replace(/<\/?[^>]+(>|$)/g, "");

      let duration = 0;
      if (isSpeechInitialized) {
        const speechText = cleanTextForSpeech(cleanResponse);

        duration = await speakWithLipSync(speechText).catch(speechError => {
          console.warn('Speech synthesis failed, continuing without audio:', speechError);
          return 0;
        });
      }

      const botMessage: ChatMessage = {
        id: uuidv4(),
        text: cleanResponse,
        isUser: false,
        timestamp: new Date(),
        typingDuration: duration > 0 ? duration : undefined
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);

      const errorText = "I'm sorry, I encountered an error while processing your message. Please try again.";
      let duration = 0;

      if (isSpeechInitialized) {
        duration = await speakWithLipSync(cleanTextForSpeech(errorText)).catch(() => 0);
      }

      const errorMessage: ChatMessage = {
        id: uuidv4(),
        text: errorText,
        isUser: false,
        timestamp: new Date(),
        typingDuration: duration > 0 ? duration : undefined
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      // setIsListening(false); // Removed
    }
  }, [isAvatarSpeaking, isSpeechInitialized, sendMessage, speakWithLipSync, cleanTextForSpeech]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToBottomInstant = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  useEffect(() => {
    if (!isVoiceRecording && voiceFinalResult.trim()) {
      const recognizedText = voiceFinalResult.trim();
      void handleSendMessage(recognizedText);
      resetVoiceRecognition();
      setInputResetToken(prev => prev + 1);
    }
  }, [handleSendMessage, isVoiceRecording, resetVoiceRecognition, voiceFinalResult]);

  const handleStopSpeech = useCallback(() => {
    avatarRef.current?.stopSpeech();
  }, []);

  // Keyboard shortcut to stop speech: Shift + S
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Shift + S
      if (isAvatarSpeaking && event.shiftKey && (event.key === 'S' || event.key === 's')) {
        event.preventDefault(); // Prevent default browser behavior if any
        handleStopSpeech();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAvatarSpeaking, handleStopSpeech]);

  const handleStartVoice = useCallback(() => {
    // Stop any ongoing speech when user starts voice input (interruption)
    if (isAvatarSpeaking) {
      avatarRef.current?.stopSpeech();
    }
    resetVoiceRecognition();
    void startRecording();
  }, [isAvatarSpeaking, resetVoiceRecognition, startRecording]);

  const handleStopVoice = useCallback(() => {
    void stopRecording();
  }, [stopRecording]);

  const handleQuestionClick = useCallback((question: string) => {
    setExternalInput(question);
    // Optional: Focus the input? The input component manages focus but we are just setting state.
    // Set to null after a tick so it can be set again if clicked again? 
    // Actually the useEffect in MessageInput just checks if truthy. 
    // To allow re-clicking same question we might need a timestamp or unique object, but string change is simple enough.
    // If user clicks same question twice, useEffect won't fire if string is same.
    // Solution: pass object { text: q, id: Date.now() } or simply rely on user editing.
    // For now simple string.
  }, []);



  const handleLogout = async () => {
    try {
      // Reset Copilot service before logout to clear any cached clients/tokens
      resetService();
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="chat-interface">
      {showEndChatModal && (
        <EndChatModal
          onResume={() => setShowEndChatModal(false)}
          onLeaveChat={onEndSession}
          chatContainerRef={chatContentRef}
        />
      )}

      {/* Consent Error Banner */}
      {consentError && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          backgroundColor: '#d32f2f',
          color: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          maxWidth: '600px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <strong style={{ fontSize: '1.1rem' }}>⚠️ Consent Required</strong>
              <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-line', fontSize: '0.9rem' }}>
                {consentError}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  resetConsentAttempts();
                  window.location.reload();
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'white',
                  color: '#d32f2f',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Retry
              </button>
              <button
                onClick={() => resetConsentAttempts()}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="chat-header">
        <h3>Ask blAIr Anything EZCORP</h3>
        <button onClick={() => setShowEndChatModal(true)} className="end-chat-button" style={{
          backgroundColor: '#0078d4',
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 600
        }}>
          End Chat
        </button>
      </div>

      <div className="chat-content-wrapper" ref={chatContentRef}>
        {/* Avatar Section */}
        <div className="avatar-section">
          <div className="avatar-controls">
            <Avatar
              ref={avatarRef}
              isListening={isListening}
              isSpeaking={isAvatarSpeaking}
              visemeData={visemeData}
              audioBuffer={audioBuffer || undefined}
              imageSrc={avatarImageSrc || undefined}
              mouthConfig={avatarImageSrc ? avatarMouthConfig : undefined}
              onSpeechStart={handleSpeechStart}
              onSpeechEnd={handleSpeechEnd}
            />
          </div>

          {/* Speech Status */}
          <div className="speech-status">
            {speechAvatarError && (
              <div className="speech-error" onClick={clearSpeechAvatarError}>
                <small>⚠️ {speechAvatarError}</small>
              </div>
            )}
            {isSpeechLoading && (
              <div className="speech-loading">
                <small>🔊 Preparing speech...</small>
              </div>
            )}
            {isTyping && !isSpeechLoading && (
              <div className="speech-loading">
                <small>🤔 Thinking...</small>
              </div>
            )}
            {!isSpeechInitialized && !speechAvatarError && (
              <div className="speech-info">
                <small>💡 Configure Azure Speech Service for voice responses</small>
              </div>
            )}
          </div>

          <TopicRotator onQuestionClick={handleQuestionClick} />
        </div>

        <div className="chat-container">
          <MessageList
            messages={messages}
            isTyping={isTyping}
            userPhotoUrl={userPhotoUrl || undefined}
            onContentChange={scrollToBottomInstant}
          />
          <div ref={messagesEndRef} />
        </div>
      </div>

      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={isTyping}
        onStartVoice={isSpeechInitialized ? handleStartVoice : undefined}
        onStopVoice={isSpeechInitialized ? handleStopVoice : undefined}
        isVoiceRecording={isVoiceRecording}
        voiceDraft={voiceInterimResult || voiceFinalResult || undefined}
        voiceError={voiceError}
        voiceSupported={isSpeechInitialized}
        resetToken={inputResetToken}
        externalMessage={externalInput}
      />
    </div>
  );
};