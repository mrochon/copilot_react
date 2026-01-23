import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import './EndChatModal.css';

interface EndChatModalProps {
    onResume: () => void;
    onLeaveChat: () => void;
    chatContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const EndChatModal: React.FC<EndChatModalProps> = ({ onResume, onLeaveChat, chatContainerRef }) => {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownload = async () => {
        if (!chatContainerRef.current) return;

        try {
            setIsGenerating(true);
            const element = chatContainerRef.current;

            // Use html2canvas to capture the chat content
            const canvas = await html2canvas(element, {
                scale: 2, // Higher quality
                logging: false,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');

            // Calculate PDF dimensions
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210; // A4 width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save('copilot-chat-history.pdf');

            setIsGenerating(false);
        } catch (error) {
            console.error('Error generating PDF:', error);
            setIsGenerating(false);
        }
    };

    return (
        <div className="end-chat-modal-overlay">
            <div className="end-chat-modal">
                <div className="end-chat-content">
                    <div className="end-chat-icon">📄</div>
                    <h2>End Chat Session</h2>
                    <p className="end-chat-message">
                        Would you like to save a record of this conversation before you leave?
                    </p>

                    <div className="end-chat-actions">
                        <button
                            className="download-pdf-button"
                            onClick={handleDownload}
                            disabled={isGenerating}
                        >
                            {isGenerating ? 'Generating PDF...' : 'Download Chat to PDF'}
                        </button>

                        <button
                            className="leave-chat-button"
                            onClick={onLeaveChat}
                        >
                            Leave Chat
                        </button>

                        <a
                            href="#"
                            className="resume-link"
                            onClick={(e) => {
                                e.preventDefault();
                                onResume();
                            }}
                        >
                            Back to Chat
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
