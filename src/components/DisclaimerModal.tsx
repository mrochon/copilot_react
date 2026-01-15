import React from 'react';
import './DisclaimerModal.css';

interface DisclaimerModalProps {
  onContinue: () => void;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ onContinue }) => {
  return (
    <div className="disclaimer-modal-overlay">
      <div className="disclaimer-modal">
        <div className="disclaimer-content">
          <div className="disclaimer-icon">⚠️</div>
          <h2>Important Notice</h2>
          <p className="disclaimer-message">
            This is an AI agent. It may give incorrect answers. Press Continue to acknowledge.
          </p>
          <button 
            className="disclaimer-button" 
            onClick={onContinue}
            autoFocus
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};
