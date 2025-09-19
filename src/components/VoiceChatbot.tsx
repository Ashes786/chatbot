'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import AudioProcessor from '@/services/AudioProcessor';
import LanguageModel from '@/services/LanguageModel';
import { ConversationState, VoiceState } from '@/types/conversation';

const VoiceChatbot: React.FC = () => {
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [isActive, setIsActive] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);

  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const languageModelRef = useRef<LanguageModel | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize services
  useEffect(() => {
    audioProcessorRef.current = new AudioProcessor();
    languageModelRef.current = new LanguageModel();

    return () => {
      if (audioProcessorRef.current) {
        audioProcessorRef.current.cleanup();
      }
    };
  }, []);

  // Handle speech recognition results
  const handleSpeechResult = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;

    setConversationState('processing');
    setVoiceState('idle');

    try {
      // Process through language model
      const response = await languageModelRef.current?.processUrduText(transcript);
      
      if (response) {
        setConversationState('responding');
        
        // Convert to speech
        await audioProcessorRef.current?.speakUrdu(response);
        
        // Return to listening state
        setConversationState('listening');
        setVoiceState('listening');
      }
    } catch (err) {
      console.error('Error processing speech:', err);
      setError('Failed to process speech. Please try again.');
      setTimeout(() => setError(null), 3000);
      setConversationState('listening');
      setVoiceState('listening');
    }
  }, []);

  // Handle end of user speech
  const handleSpeechEnd = useCallback(() => {
    if (audioProcessorRef.current) {
      audioProcessorRef.current.stopListening();
    }
  }, []);

  // Handle speech errors
  const handleSpeechError = useCallback((error: string) => {
    console.error('Speech error:', error);
    setError(`Speech recognition error: ${error}`);
    setTimeout(() => setError(null), 3000);
  }, []);

  // Toggle conversation active state
  const toggleConversation = async () => {
    if (!isActive) {
      // Start conversation
      try {
        setError(null);
        await audioProcessorRef.current?.initialize();
        
        // Set up event listeners
        audioProcessorRef.current?.setEventHandlers({
          onSpeechResult: handleSpeechResult,
          onSpeechEnd: handleSpeechEnd,
          onError: handleSpeechError
        });

        await audioProcessorRef.current?.startListening('en-US');
        
        setIsActive(true);
        setConversationState('listening');
        setVoiceState('listening');
      } catch (err) {
        console.error('Failed to start conversation:', err);
        setError('Failed to access microphone. Please check permissions.');
      }
    } else {
      // Stop conversation
      audioProcessorRef.current?.stopListening();
      audioProcessorRef.current?.stopSpeaking();
      
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      setIsActive(false);
      setConversationState('idle');
      setVoiceState('idle');
    }
  };

  // Interrupt bot speech when user starts talking
  useEffect(() => {
    if (voiceState === 'speaking' && conversationState === 'responding') {
      audioProcessorRef.current?.stopSpeaking();
      setConversationState('listening');
    }
  }, [voiceState, conversationState]);

  // Get status text
  const getStatusText = () => {
    switch (conversationState) {
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      case 'responding':
        return 'Responding...';
      default:
        return 'Tap to start';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="text-center">
        {/* Simple Title */}
        <h1 className="text-2xl font-bold text-white mb-8">
          English Voice Assistant
        </h1>
        
        {/* Main Mic Button */}
        <div className="relative">
          <button
            onClick={toggleConversation}
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
              isActive
                ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse'
                : 'bg-blue-500 hover:bg-blue-600 hover:scale-105'
            }`}
            disabled={conversationState === 'processing'}
          >
            {isActive ? (
              <MicOff className="w-16 h-16 text-white" />
            ) : (
              <Mic className="w-16 h-16 text-white" />
            )}
          </button>
          
          {/* Status Text */}
          <div className="mt-6">
            <p className={`text-lg font-medium ${
              isActive ? 'text-green-400' : 'text-gray-300'
            }`}>
              {getStatusText()}
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-500/20 border border-red-500/50 rounded-lg p-3 max-w-sm mx-auto">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Simple Instructions */}
        <div className="mt-8 text-gray-400 text-sm max-w-md mx-auto">
          <p>Tap the microphone and speak in English</p>
          <p className="mt-1">I'll listen and respond naturally</p>
        </div>
      </div>
    </div>
  );
};

export default VoiceChatbot;