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
          <h2>{import.meta.env.VITE_APP_DISCLAIMER_TITLE}</h2>
          <img src="/Ask_Blair.png" alt="Ask Blair" className="disclaimer-image" />
          <p className="disclaimer-message">
            {import.meta.env.VITE_APP_DISCLAIMER_MESSAGE}</p>
          <p className="disclaimer-message">Press Continue to acknowledge.</p>
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
