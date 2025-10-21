import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCopilotStudio, ChatMessage } from '../CopilotStudioService';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Avatar } from './Avatar';
import { useAuth } from '../AuthContext';
import { useSpeechAvatar } from '../hooks/useSpeechAvatar';

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

  useEffect(() => {
    // Add initial welcome message
    const welcomeMessage: ChatMessage = {
      id: uuidv4(),
      text: "Hello! I'm your Copilot Studio assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (text: string) => {
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
      if (speechAvatar.isInitialized) {
        try {
          await speechAvatar.speakWithLipSync(response);
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
      if (speechAvatar.isInitialized) {
        try {
          await speechAvatar.speakWithLipSync(errorMessage.text);
        } catch (speechError) {
          console.warn('Speech synthesis failed for error message:', speechError);
        }
      }
    } finally {
      setIsTyping(false);
      setIsListening(false); // Hide listening state
    }
  };

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
          isSpeaking={speechAvatar.isSpeaking}
          visemeData={speechAvatar.visemeData}
          audioBuffer={speechAvatar.audioBuffer || undefined}
          onSpeechStart={speechAvatar.handleSpeechStart}
          onSpeechEnd={speechAvatar.handleSpeechEnd}
        />
        
        {/* Speech Status */}
        <div className="speech-status">
          {speechAvatar.error && (
            <div className="speech-error" onClick={speechAvatar.clearError}>
              <small>⚠️ {speechAvatar.error}</small>
            </div>
          )}
          {speechAvatar.isLoading && (
            <div className="speech-loading">
              <small>🔊 Preparing speech...</small>
            </div>
          )}
          {!speechAvatar.isInitialized && !speechAvatar.error && (
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

      <MessageInput onSendMessage={handleSendMessage} disabled={isTyping || speechAvatar.isSpeaking} />
    </div>
  );
};