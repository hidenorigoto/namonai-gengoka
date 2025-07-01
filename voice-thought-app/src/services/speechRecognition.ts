export class SpeechRecognitionService {
  private recognition: any;
  private isListening: boolean = false;
  
  constructor() {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Speech recognition not supported');
    }
    
    this.recognition = new SpeechRecognition();
    this.setupRecognition();
  }
  
  private setupRecognition(): void {
    this.recognition.lang = 'ja-JP';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
  }
  
  start(
    onResult: (text: string, isFinal: boolean) => void,
    onError: (error: any) => void
  ): void {
    if (this.isListening) return;
    
    this.recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      onResult(text, result.isFinal);
    };
    
    this.recognition.onerror = onError;
    
    this.recognition.onend = () => {
      this.isListening = false;
    };
    
    try {
      this.recognition.start();
      this.isListening = true;
    } catch (error) {
      onError(error);
    }
  }
  
  stop(): void {
    if (!this.isListening) return;
    
    try {
      this.recognition.stop();
      this.isListening = false;
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  }
  
  isActive(): boolean {
    return this.isListening;
  }
}