'use client'

import { useEffect, useRef, useState } from 'react'
import { EnhancedSpeechRecognition, EnhancedSpeechRecognitionResult } from '@/lib/enhanced-speech-recognition'

interface EnhancedSpeechProcessorProps {
  onTranscript: (transcript: string, isFinal: boolean) => void
  onError: (error: string) => void
  isListening: boolean
  urduType: 'roman' | 'pure'
  onAudioLevel?: (level: number) => void
}

export function EnhancedSpeechProcessor({ 
  onTranscript, 
  onError, 
  isListening, 
  urduType,
  onAudioLevel
}: EnhancedSpeechProcessorProps) {
  const recognitionRef = useRef<EnhancedSpeechRecognition | null>(null)
  const [isSupported, setIsSupported] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [status, setStatus] = useState<'idle' | 'initializing' | 'ready' | 'listening' | 'recording' | 'error'>('idle')

  useEffect(() => {
    // Check if required APIs are supported
    if (typeof window !== 'undefined') {
      const hasAudioContext = !!(window.AudioContext || (window as any).webkitAudioContext)
      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
      
      setIsSupported(hasAudioContext && hasMediaDevices)
      
      if (!hasAudioContext || !hasMediaDevices) {
        onError('Browser does not support required audio APIs. Please use Chrome, Edge, or Safari.')
        return
      }
    }
  }, [])

  useEffect(() => {
    const initializeRecognition = async () => {
      if (!isSupported || isInitialized || isInitializing) return

      setIsInitializing(true)
      setStatus('initializing')

      try {
        recognitionRef.current = new EnhancedSpeechRecognition(
          (result: EnhancedSpeechRecognitionResult) => {
            if (result.isFinal) {
              onTranscript(result.transcript, true)
            } else {
              // For interim results, we can show some indication
              onTranscript(result.transcript || 'Listening...', false)
            }
          },
          (error: string) => {
            onError(`Enhanced speech recognition error: ${error}`)
            setStatus('error')
          },
          (level: number) => {
            setAudioLevel(level)
            if (onAudioLevel) {
              onAudioLevel(level)
            }
          },
          {
            language: urduType === 'roman' ? 'en-US' : 'ur-PK',
            continuous: false,
            interimResults: true,
            maxAlternatives: 1,
            silenceThreshold: 0.02, // Adjust based on testing
            minSpeechDuration: 800, // Minimum speech duration in ms
            maxSpeechDuration: 15000 // Maximum speech duration in ms
          }
        )

        await recognitionRef.current.initialize()
        setIsInitialized(true)
        setStatus('ready')
        
      } catch (error) {
        console.error('Failed to initialize enhanced speech recognition:', error)
        onError(`Failed to initialize enhanced speech recognition: ${error}`)
        setStatus('error')
      } finally {
        setIsInitializing(false)
      }
    }

    initializeRecognition()

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.cleanup()
      }
    }
  }, [isSupported, urduType, onTranscript, onError, onAudioLevel])

  useEffect(() => {
    if (!isInitialized || !recognitionRef.current) return

    if (isListening) {
      try {
        recognitionRef.current.start()
        setStatus('listening')
      } catch (error) {
        console.error('Failed to start enhanced speech recognition:', error)
        onError(`Failed to start enhanced speech recognition: ${error}`)
        setStatus('error')
      }
    } else {
      recognitionRef.current.stop()
      setStatus('ready')
    }
  }, [isListening, isInitialized, onError])

  // Update status based on recognition state
  useEffect(() => {
    if (recognitionRef.current) {
      const updateStatus = () => {
        if (recognitionRef.current?.isCurrentlyRecording()) {
          setStatus('recording')
        } else if (recognitionRef.current?.isCurrentlyListening()) {
          setStatus('listening')
        } else if (isInitialized) {
          setStatus('ready')
        }
      }

      // Update status every 100ms
      const interval = setInterval(updateStatus, 100)
      return () => clearInterval(interval)
    }
  }, [isInitialized])

  // Expose audio level for parent components
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).enhancedSpeechProcessor = {
        audioLevel,
        status,
        isRecording: status === 'recording',
        isListening: status === 'listening' || status === 'recording'
      }
    }
  }, [audioLevel, status])

  if (!isSupported) {
    return (
      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
        Enhanced speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.
      </div>
    )
  }

  if (isInitializing) {
    return (
      <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
        Initializing enhanced speech recognition...
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
        Enhanced speech recognition encountered an error. Please try refreshing the page.
      </div>
    )
  }

  // This component doesn't render anything visible when working normally
  return null
}