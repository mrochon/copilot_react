import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCopilotStudio, ChatMessage } from '../CopilotStudioService';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Avatar, AvatarRef } from './Avatar';
import { useAuth } from '../AuthContext';
import { useSpeechAvatar } from '../hooks/useSpeechAvatar';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface ChatInterfaceProps {
  welcomeMessage: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ welcomeMessage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const { sendMessage, resetService } = useCopilotStudio();
  const { logout, userPhotoUrl } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<AvatarRef>(null);

  // Initialize speech avatar with TTS provider
  const ttsProvider = (import.meta.env.VITE_TTS_PROVIDER || 'azure') as 'azure' | 'elevenlabs';

  const speechAvatar = useSpeechAvatar({
    ttsProvider,
    // Azure configuration
    speechKey: import.meta.env.VITE_SPEECH_KEY || '',
    speechRegion: import.meta.env.VITE_SPEECH_REGION || 'eastus',
    voiceName: import.meta.env.VITE_SPEECH_VOICE || 'en-US-JennyNeural',
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
  const hasSpokenWelcomeRef = useRef(false);

  const cleanTextForSpeech = useCallback((text: string) => {
    return text
      .replace(/\[\d+\](\([^\)]+\))?/g, '')    // Remove citation links like [1] or [1](URL)
      .replace(/\^(\d+)\^/g, '')               // Remove superscript citations like ^1^
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Keep filename for other links like [File.pdf](URL)
      .replace(/(https?:\/\/[^\s]+)/g, '')     // Strip standalone URLs
      .replace(/\*Source:\*/gi, "Source: ")    // Make Source label sound natural
      .replace(/EZCORP/gi, "easy corp")
      .replace(/:/g, ", ");
  }, []);

  // Handle welcome message: Wait for speech to init, then play and show message
  useEffect(() => {
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
  }, [isSpeechInitialized, welcomeMessage, isAvatarSpeaking, isSpeechLoading, speakWithLipSync, cleanTextForSpeech, speechAvatarError]);

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
      <div className="chat-header">
        <h3>Chat with Copilot Studio</h3>
        <button onClick={handleLogout} className="logout-button">
          Sign Out
        </button>
      </div>

      <div className="chat-content-wrapper">
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
      />
    </div>
  );
};