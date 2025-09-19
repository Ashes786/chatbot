import { AudioEventHandlers } from '@/types/conversation';

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private animationId: number | null = null;
  private eventHandlers: AudioEventHandlers = {};
  private isListening = false;
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.initializeAudioContext();
    this.initializeSpeechSynthesis();
  }

  private async initializeAudioContext() {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContext();
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }

  private initializeSpeechSynthesis() {
    this.synthesis = window.speechSynthesis;
    this.logAvailableVoices();
  }

  async initialize(): Promise<void> {
    try {
      if (!this.audioContext) {
        await this.initializeAudioContext();
      }

      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        }
      });

      // Set up audio analysis
      if (this.audioContext && this.mediaStream) {
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 2.0;

        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.minDecibels = -90;
        this.analyser.maxDecibels = -10;
        this.analyser.smoothingTimeConstant = 0.8;

        source.connect(gainNode);
        gainNode.connect(this.analyser);
      }

      // Initialize speech recognition
      this.initializeSpeechRecognition();
    } catch (error) {
      console.error('Failed to initialize audio processor:', error);
      throw error;
    }
  }

  private initializeSpeechRecognition() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'ur-PK';

        this.recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            this.eventHandlers.onSpeechResult?.(finalTranscript);
          }
        };

        this.recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          this.eventHandlers.onError?.(event.error);
          
          // Auto-restart on no-speech error
          if (event.error === 'no-speech' && this.isListening) {
            setTimeout(() => {
              if (this.isListening) {
                try {
                  this.recognition.start();
                } catch (restartError) {
                  console.error('Failed to restart recognition:', restartError);
                }
              }
            }, 1000);
          }
        };

        this.recognition.onend = () => {
          if (this.isListening) {
            try {
              this.recognition.start();
            } catch (restartError) {
              console.error('Failed to restart recognition:', restartError);
            }
          }
        };
      }
    }
  }

  setEventHandlers(handlers: AudioEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  async startListening(language: string = 'en-US'): Promise<void> {
    if (!this.recognition) {
      throw new Error('Speech recognition not available');
    }

    try {
      this.isListening = true;
      this.recognition.lang = language;
      this.recognition.start();
      this.startAudioMonitoring();
    } catch (error) {
      console.error('Failed to start listening:', error);
      throw error;
    }
  }

  stopListening(): void {
    this.isListening = false;
    if (this.recognition) {
      this.recognition.stop();
    }
    this.stopAudioMonitoring();
  }

  private startAudioMonitoring(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const speechThreshold = 0.02;

    const monitor = () => {
      if (!this.analyser || !this.isListening) return;

      this.analyser.getByteFrequencyData(dataArray);
      
      const sum = dataArray.reduce((a, b) => a + b, 0);
      const average = sum / bufferLength;
      const normalizedLevel = average / 255;
      
      // Apply logarithmic scaling for better sensitivity
      const sensitiveLevel = normalizedLevel > 0 ? Math.log(normalizedLevel + 1) / Math.log(2) : 0;
      
      this.eventHandlers.onAudioLevel?.(sensitiveLevel);

      this.animationId = requestAnimationFrame(monitor);
    };

    monitor();
  }

  private stopAudioMonitoring(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.eventHandlers.onAudioLevel?.(0);
  }

  async speakUrdu(text: string): Promise<void> {
    if (!this.synthesis) {
      console.error('Speech synthesis not available');
      return;
    }

    try {
      // Stop any current speech
      this.stopSpeaking();

      // Create utterance
      this.currentUtterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance.lang = 'en-US'; // Use English language
      this.currentUtterance.rate = 1.0;
      this.currentUtterance.pitch = 1.0;
      this.currentUtterance.volume = 1.0;

      // Find English voice (prefer US English)
      const englishVoice = this.synthesis.getVoices().find(voice => 
        voice.lang.includes('en-US') || voice.lang.includes('en-GB')
      );

      if (englishVoice) {
        this.currentUtterance.voice = englishVoice;
        console.log('Using English voice:', englishVoice.name);
      } else {
        console.log('No English voice found, using default voice');
      }

      // Speak the text
      this.synthesis.speak(this.currentUtterance);

      // Return promise that resolves when speech is complete
      return new Promise((resolve, reject) => {
        this.currentUtterance!.onend = () => {
          resolve();
        };

        this.currentUtterance!.onerror = (error) => {
          console.error('Speech synthesis error:', error);
          reject(error);
        };
      });
    } catch (error) {
      console.error('Failed to speak text:', error);
      throw error;
    }
  }

  stopSpeaking(): void {
    if (this.synthesis && this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    this.currentUtterance = null;
  }

  logAvailableVoices(): void {
    if (this.synthesis) {
      const voices = this.synthesis.getVoices();
      console.log('Available voices:', voices.map(voice => 
        `${voice.name} (${voice.lang})`
      ));
      
      const englishVoices = voices.filter(voice => 
        voice.lang.includes('en') || voice.name.includes('English')
      );
      
      if (englishVoices.length > 0) {
        console.log('English voices available:', englishVoices);
      } else {
        console.log('No English voices found, will use default voice');
      }
    }
  }

  cleanup(): void {
    this.stopListening();
    this.stopSpeaking();
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.recognition = null;
  }
}

export default AudioProcessor;