import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../CopilotStudioService';

interface MessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isTyping }) => {
  return (
    <div className="message-list">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`message ${message.isUser ? 'message-user' : 'message-bot'}`}
        >
          <div className="message-content">
            <div className="message-text">
              {message.isUser ? (
                message.text
              ) : (
                <ReactMarkdown>{message.text}</ReactMarkdown>
              )}
            </div>
            <div className="message-timestamp">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
      
      {isTyping && (
        <div className="message message-bot">
          <div className="message-content">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};