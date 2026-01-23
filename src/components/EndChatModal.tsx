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
            const originalElement = chatContainerRef.current;

            // Create a deep clone to capture the entire scrollable content
            // We clone it, force it to be full height/width, and render it off-screen
            const clone = originalElement.cloneNode(true) as HTMLElement;

            // Style the clone to ensure all content is visible (no scroll)
            clone.style.position = 'absolute';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            clone.style.width = `${originalElement.offsetWidth}px`;
            clone.style.height = 'auto';
            clone.style.maxHeight = 'none';
            clone.style.overflow = 'visible';

            // Append to body so it renders
            document.body.appendChild(clone);

            // Use html2canvas to capture the *cloned* content
            const canvas = await html2canvas(clone, {
                scale: 2, // Higher quality
                logging: false,
                useCORS: true,
                backgroundColor: '#ffffff',
                windowHeight: clone.scrollHeight,
                windowWidth: clone.scrollWidth
            });

            // Clean up clone
            document.body.removeChild(clone);

            // PDF Constants
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = 210;
            const pageHeight = 297;
            const margin = 10;
            const headerHeight = 20;
            const footerHeight = 15;
            const contentWidth = pageWidth - (margin * 2);

            // Header Config
            const headerText = "Ask blAIr Anything EZCORP";

            // Footer Config
            const footerText = "AI blAIr can make mistakes, so double-check it";

            // Calculate content height available on first vs subsequent pages
            // Page 1: Header + Content + Footer
            const page1ContentHeight = pageHeight - margin - headerHeight - footerHeight - margin;
            // Page N: Margin + Content + Footer (assuming no header on subsequent pages, or we can add minimal margin)
            // Let's keep consistent top margin for subsequent pages
            const pageNContentHeight = pageHeight - margin - footerHeight - margin;

            const imgWidth = contentWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0; // Current position in the SOURCE image (in PDF units relative to top of image)
            let pageNum = 1;

            // Helper to add Header
            const addHeader = (doc: jsPDF) => {
                doc.setFontSize(16);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(40, 40, 40); // Dark Gray

                // Centered text
                const textWidth = doc.getTextWidth(headerText);
                const x = (pageWidth - textWidth) / 2;
                const y = margin + 10; // Vertically centered in header area roughly
                doc.text(headerText, x, y);
            };

            // Helper to add Footer
            const addFooter = (doc: jsPDF) => {
                doc.setFontSize(10);
                doc.setFont("helvetica", "italic");
                doc.setTextColor(100, 100, 100); // Gray

                // Centered text
                const textWidth = doc.getTextWidth(footerText);
                const x = (pageWidth - textWidth) / 2;
                const y = pageHeight - margin; // Bottom of page minus margin
                doc.text(footerText, x, y);
            };

            // --- First Page ---
            addHeader(pdf);
            addFooter(pdf);

            // Calculate source rectangle for Page 1
            // Determine how much of the image fits in page1ContentHeight
            // We need to act on the Canvas data to slice it efficiently, OR use addImage with cropping if supported (only some versions).
            // Standard jsPDF addImage usually places the *whole* image. 
            // To mock cropping, we can add the whole image and translate it up, but we need a masking clip.
            // Converting canvas to multiple sub-canvases is safer for standard jsPDF usage.

            const canvasCtx = canvas.getContext('2d');
            if (!canvasCtx) throw new Error("Could not get canvas context");

            const pxScale = canvas.width / contentWidth; // Pixels per MM

            // Helper to create a slice
            const getCanvasSlice = (yMm: number, hMm: number) => {
                const yPx = yMm * pxScale;
                const hPx = hMm * pxScale;
                const wPx = canvas.width;

                // Create a new canvas for the slice
                const sliceCanvas = document.createElement('canvas');
                sliceCanvas.width = wPx;
                sliceCanvas.height = hPx;

                const sliceCtx = sliceCanvas.getContext('2d');
                if (!sliceCtx) return null;

                // Draw the relevant portion
                sliceCtx.drawImage(canvas, 0, yPx, wPx, hPx, 0, 0, wPx, hPx);
                return sliceCanvas.toDataURL('image/png');
            };

            // Process Page 1
            const sliceHeightMm1 = Math.min(heightLeft, page1ContentHeight);
            const slice1Data = getCanvasSlice(0, sliceHeightMm1);

            if (slice1Data) {
                // Determine Y position on PDF
                const pdfY = margin + headerHeight;
                pdf.addImage(slice1Data, 'PNG', margin, pdfY, contentWidth, sliceHeightMm1);
            }

            heightLeft -= sliceHeightMm1;
            position += sliceHeightMm1; // Track how much we've covered in MM

            // Process Subsequent Pages
            while (heightLeft > 0) {
                pageNum++;
                pdf.addPage();
                addFooter(pdf); // Footer on every page

                const sliceHeightMmN = Math.min(heightLeft, pageNContentHeight);
                const sliceNData = getCanvasSlice(position, sliceHeightMmN);

                if (sliceNData) {
                    const pdfY = margin; // Start at top margin (no header)
                    pdf.addImage(sliceNData, 'PNG', margin, pdfY, contentWidth, sliceHeightMmN);
                }

                heightLeft -= sliceHeightMmN;
                position += sliceHeightMmN;
            }

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
