export type ConversationState = 'idle' | 'listening' | 'processing' | 'responding';

export type VoiceState = 'idle' | 'listening' | 'speaking';

export interface AudioEventHandlers {
  onAudioLevel?: (level: number) => void;
  onSpeechResult?: (transcript: string) => void;
  onSpeechEnd?: () => void;
  onError?: (error: string) => void;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}