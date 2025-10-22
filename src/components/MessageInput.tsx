import React, { useState, KeyboardEvent, useEffect } from 'react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  onStartVoice?: () => void;
  onStopVoice?: () => void;
  isVoiceRecording?: boolean;
  voiceDraft?: string;
  voiceError?: string | null;
  voiceSupported?: boolean;
  resetToken?: number;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
  onStartVoice,
  onStopVoice,
  isVoiceRecording = false,
  voiceDraft,
  voiceError,
  voiceSupported = true,
  resetToken
}) => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (voiceDraft !== undefined) {
      setMessage(voiceDraft);
    }
  }, [voiceDraft]);

  useEffect(() => {
    if (resetToken !== undefined) {
      setMessage('');
    }
  }, [resetToken]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled && !isVoiceRecording) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isVoiceRecording) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const textareaDisabled = disabled || isVoiceRecording;
  const voiceButtonDisabled = (!voiceSupported || disabled) && !isVoiceRecording;

  const renderVoiceButton = Boolean(onStartVoice && onStopVoice);

  return (
    <form onSubmit={handleSubmit} className="message-input-form">
      <div className="input-container">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
          disabled={textareaDisabled}
          className="message-textarea"
          rows={1}
        />
        {renderVoiceButton && (
          <button
            type="button"
            onClick={isVoiceRecording ? onStopVoice : onStartVoice}
            className={`voice-button${isVoiceRecording ? ' recording' : ''}`}
            disabled={voiceButtonDisabled}
          >
            {isVoiceRecording ? 'Listening...' : 'Speak'}
          </button>
        )}
        <button
          type="submit"
          disabled={!message.trim() || disabled || isVoiceRecording}
          className="send-button"
        >
          Send
        </button>
      </div>
      {voiceError && (
        <div className="voice-feedback">
          <small>{voiceError}</small>
        </div>
      )}
    </form>
  );
};