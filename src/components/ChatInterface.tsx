import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCopilotStudio, ChatMessage } from '../CopilotStudioService';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Avatar } from './Avatar';
import { useAuth } from '../AuthContext';
import { useSpeechAvatar } from '../hooks/useSpeechAvatar';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const { sendMessage } = useCopilotStudio();
  const { logout } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize speech avatar
  const speechAvatar = useSpeechAvatar({
    speechKey: process.env.REACT_APP_SPEECH_KEY || '',
    speechRegion: process.env.REACT_APP_SPEECH_REGION || 'eastus',
    voiceName: process.env.REACT_APP_SPEECH_VOICE || 'en-US-JennyNeural'
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

  const avatarImageSrc = process.env.REACT_APP_AVATAR_IMAGE_URL;

  const avatarMouthConfig = useMemo(() => ({
    top: process.env.REACT_APP_AVATAR_MOUTH_TOP || '68%',
    left: process.env.REACT_APP_AVATAR_MOUTH_LEFT || '50%',
    width: process.env.REACT_APP_AVATAR_MOUTH_WIDTH || '24%',
    height: process.env.REACT_APP_AVATAR_MOUTH_HEIGHT || '14%',
  }), []);

  const recognitionLanguage = useMemo(() => {
    const explicitLanguage = process.env.REACT_APP_SPEECH_RECOGNITION_LANGUAGE;
    if (explicitLanguage && explicitLanguage.trim()) {
      return explicitLanguage.trim();
    }

    const voiceName = process.env.REACT_APP_SPEECH_VOICE;
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

  useEffect(() => {
    // Add initial welcome message
    const welcomeMessage: ChatMessage = {
      id: uuidv4(),
      text: "Hello! I'm your Copilot Studio assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);

    // Speak the welcome message when speech service is initialized
    if (isSpeechInitialized) {
      speakWithLipSync(welcomeMessage.text).catch((error) => {
        console.warn('Failed to speak welcome message:', error);
      });
    }
  }, [isSpeechInitialized, speakWithLipSync]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = useCallback(async (text: string) => {
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
  }, [isSpeechInitialized, speakWithLipSync, sendMessage]);

  useEffect(() => {
    if (!isVoiceRecording && voiceFinalResult.trim()) {
      const recognizedText = voiceFinalResult.trim();
      void handleSendMessage(recognizedText);
      resetVoiceRecognition();
      setInputResetToken(prev => prev + 1);
    }
  }, [handleSendMessage, isVoiceRecording, resetVoiceRecognition, voiceFinalResult]);

  const handleStartVoice = useCallback(() => {
    resetVoiceRecognition();
    void startRecording();
  }, [resetVoiceRecognition, startRecording]);

  const handleStopVoice = useCallback(() => {
    void stopRecording();
  }, [stopRecording]);

  const handleLogout = async () => {
    try {
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
        <Avatar
          isListening={isListening}
          isSpeaking={isAvatarSpeaking}
          visemeData={visemeData}
          audioBuffer={audioBuffer || undefined}
          imageSrc={avatarImageSrc || undefined}
          mouthConfig={avatarImageSrc ? avatarMouthConfig : undefined}
          onSpeechStart={handleSpeechStart}
          onSpeechEnd={handleSpeechEnd}
        />
        
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
        disabled={isTyping || isAvatarSpeaking}
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