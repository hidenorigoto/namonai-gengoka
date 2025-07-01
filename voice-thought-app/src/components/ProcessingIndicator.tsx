import React from 'react';

interface ProcessingIndicatorProps {
  isProcessing: boolean;
  processedText: string;
}

const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({ isProcessing, processedText }) => {
  if (!isProcessing && !processedText) return null;

  return (
    <div className="processing-indicator">
      {isProcessing && (
        <div className="processing-animation">
          <div className="spinner"></div>
          <span>AI処理中...</span>
        </div>
      )}
      {processedText && (
        <div className="processed-text">
          <h5>処理中のテキスト:</h5>
          <p>{processedText.slice(-100)}...</p>
        </div>
      )}
    </div>
  );
};

export default ProcessingIndicator;