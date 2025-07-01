import React, { useEffect, useRef } from 'react';
import { SpeechRecognitionService } from '../services/speechRecognition';

interface VoiceInputProps {
  isRecording: boolean;
  onTranscription: (text: string, isFinal: boolean) => void;
  onToggleRecording: () => void;
}

const VoiceInput: React.FC<VoiceInputProps> = ({
  isRecording,
  onTranscription,
  onToggleRecording
}) => {
  const recognitionRef = useRef<SpeechRecognitionService | null>(null);
  const [interimText, setInterimText] = React.useState('');

  useEffect(() => {
    try {
      recognitionRef.current = new SpeechRecognitionService();
    } catch (error) {
      console.error('Speech recognition initialization failed:', error);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.start(
        (text, isFinal) => {
          if (isFinal) {
            setInterimText('');
            onTranscription(text, true);
          } else {
            setInterimText(text);
          }
        },
        (error) => {
          console.error('Speech recognition error:', error);
          onToggleRecording();
        }
      );
    } else {
      recognitionRef.current.stop();
      setInterimText('');
    }
  }, [isRecording, onTranscription, onToggleRecording]);

  return (
    <div className="voice-input">
      <button
        className={`record-button ${isRecording ? 'recording' : ''}`}
        onClick={onToggleRecording}
      >
        {isRecording ? '🔴 録音停止' : '🎤 録音開始'}
      </button>
      
      {interimText && (
        <div className="interim-text">
          <span className="label">認識中:</span> {interimText}
        </div>
      )}
    </div>
  );
};

export default VoiceInput;