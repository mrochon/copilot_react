import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../CopilotStudioService';

interface MessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
}

const TypedMessage: React.FC<{ text: string; duration: number }> = ({ text, duration }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    if (!duration || duration <= 0) {
      setDisplayedText(text);
      return;
    }

    const startTime = performance.now();
    let animationFrame: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentLength = Math.floor(progress * text.length);
      
      setDisplayedText(text.substring(0, currentLength));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [text, duration]);

  return <ReactMarkdown>{displayedText}</ReactMarkdown>;
};

export const MessageList: React.FC<MessageListProps> = ({ messages, isTyping }) => {
  return (
    <div className="message-list">
      {messages.map((message, index) => (
        <div
          key={message.id}
          className={`message ${message.isUser ? 'message-user' : 'message-bot'}`}
        >
          <div className="message-content">
            <div className="message-text">
              {message.isUser ? (
                message.text
              ) : (message.typingDuration && index === messages.length - 1) ? (
                <TypedMessage text={message.text} duration={message.typingDuration} />
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