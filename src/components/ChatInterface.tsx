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
  const { logout } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<AvatarRef>(null);

  // Initialize speech avatar with TTS provider
  const ttsProvider = (process.env.REACT_APP_TTS_PROVIDER || 'azure') as 'azure' | 'elevenlabs';
  
  const speechAvatar = useSpeechAvatar({
    ttsProvider,
    // Azure configuration
    speechKey: process.env.REACT_APP_SPEECH_KEY || '',
    speechRegion: process.env.REACT_APP_SPEECH_REGION || 'eastus',
    voiceName: process.env.REACT_APP_SPEECH_VOICE || 'en-US-JennyNeural',
    // ElevenLabs configuration
    elevenLabsApiKey: process.env.REACT_APP_ELEVENLABS_API_KEY || '',
    elevenLabsVoiceId: process.env.REACT_APP_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
    elevenLabsModel: process.env.REACT_APP_ELEVENLABS_MODEL || 'eleven_multilingual_v2'
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

  // Add initial welcome message on mount
  useEffect(() => {
    if (welcomeMessage) {
      const welcome: ChatMessage = {
        id: uuidv4(),
        text: welcomeMessage,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([welcome]);
    }
  }, [welcomeMessage]); // Update when welcomeMessage changes

  // Speak the welcome message when speech service is initialized
  useEffect(() => {
    if (isSpeechInitialized && welcomeMessage && !hasSpokenWelcomeRef.current && !isAvatarSpeaking && !isSpeechLoading) {
      hasSpokenWelcomeRef.current = true;
      console.log('Attempting to speak welcome message...');
      
      // Use setTimeout to ensure Avatar component is ready
      const timeoutId = setTimeout(() => {
        speakWithLipSync(welcomeMessage).catch((error) => {
          console.error('Failed to speak welcome message:', error);
          hasSpokenWelcomeRef.current = false; // Reset so it can try again
        });
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isSpeechInitialized, welcomeMessage, isAvatarSpeaking, isSpeechLoading, speakWithLipSync]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
    setIsListening(true); // Show listening state

    try {
      const response = await sendMessage(text);
      
      const botMessage: ChatMessage = {
        id: uuidv4(),
        text: response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);

      // Speak the response with lip-sync if speech service is available
      if (isSpeechInitialized) {
        try {
          await speakWithLipSync(response);
        } catch (speechError) {
          console.warn('Speech synthesis failed, continuing without audio:', speechError);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        text: "I'm sorry, I encountered an error while processing your message. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);

      // Speak error message
      if (isSpeechInitialized) {
        try {
          await speakWithLipSync(errorMessage.text);
        } catch (speechError) {
          console.warn('Speech synthesis failed for error message:', speechError);
        }
      }
    } finally {
      setIsTyping(false);
      setIsListening(false); // Hide listening state
    }
  }, [isAvatarSpeaking, isSpeechInitialized, speakWithLipSync, sendMessage]);

  useEffect(() => {
    if (!isVoiceRecording && voiceFinalResult.trim()) {
      const recognizedText = voiceFinalResult.trim();
      void handleSendMessage(recognizedText);
      resetVoiceRecognition();
      setInputResetToken(prev => prev + 1);
    }
  }, [handleSendMessage, isVoiceRecording, resetVoiceRecognition, voiceFinalResult]);

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

  const handleStopSpeech = useCallback(() => {
    avatarRef.current?.stopSpeech();
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
      <div className="chat-header">
        <h3>Chat with Copilot Studio</h3>
        <button onClick={handleLogout} className="logout-button">
          Sign Out
        </button>
      </div>

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
          {isAvatarSpeaking && (
            <button 
              className="stop-speech-button"
              onClick={handleStopSpeech}
              aria-label="Stop speech"
            >
              🔇 Stop
            </button>
          )}
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
          {!isSpeechInitialized && !speechAvatarError && (
            <div className="speech-info">
              <small>💡 Configure Azure Speech Service for voice responses</small>
            </div>
          )}
        </div>
      </div>

      <div className="chat-container">
        <MessageList messages={messages} isTyping={isTyping} />
        <div ref={messagesEndRef} />
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