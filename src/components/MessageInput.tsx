import React, { useState, KeyboardEvent, useEffect, PointerEvent } from 'react';

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
  const voiceButtonDisabled = !voiceSupported || disabled;

  const renderVoiceButton = Boolean(onStartVoice && onStopVoice);

  const handleVoicePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (voiceButtonDisabled || !onStartVoice || isVoiceRecording) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    onStartVoice();
  };

  const handleVoicePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (!onStopVoice) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    onStopVoice();
  };

  const handleVoicePointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    if (!onStopVoice) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    onStopVoice();
  };

  const handleVoiceKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!onStartVoice || voiceButtonDisabled) {
      return;
    }

    if ((event.key === ' ' || event.key === 'Enter') && !isVoiceRecording) {
      event.preventDefault();
      onStartVoice();
    }
  };

  const handleVoiceKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!onStopVoice) {
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      onStopVoice();
    }
  };

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
            onPointerDown={handleVoicePointerDown}
            onPointerUp={handleVoicePointerUp}
            onPointerCancel={handleVoicePointerCancel}
            onKeyDown={handleVoiceKeyDown}
            onKeyUp={handleVoiceKeyUp}
            className={`voice-button${isVoiceRecording ? ' recording' : ''}`}
            disabled={voiceButtonDisabled}
            aria-pressed={isVoiceRecording}
          >
            {isVoiceRecording ? 'Release to send' : 'Hold to speak'}
          </button>
        )}
        <button
          type="submit"
          disabled={!message.trim() || disabled || isVoiceRecording}
          className="send-button"
        >

          <span className="button-text">Send</span>
          <span className="button-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.5 8L.5 15.5v-5l10-2.5-10-2.5v-5L15.5 8z" />
            </svg>
          </span>
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