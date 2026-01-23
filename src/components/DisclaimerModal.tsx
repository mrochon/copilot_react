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
          <img src="/Ask_Blair.png" alt="Ask Blair" className="disclaimer-image" />
          <h2>⚠️ Important Notice ⚠️</h2>
          <p className="disclaimer-message">
            I'm AI Blair, your quick EZCORP HR assistant; I'm helpful but can make mistakes, so please verify my info.</p>
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
