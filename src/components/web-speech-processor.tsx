'use client'

import { useEffect, useRef, useState } from 'react'

interface WebSpeechProcessorProps {
  onTranscript: (transcript: string, isFinal: boolean) => void
  onError: (error: string) => void
  isListening: boolean
  urduType: 'roman' | 'pure'
}

export function WebSpeechProcessor({ 
  onTranscript, 
  onError, 
  isListening, 
  urduType 
}: WebSpeechProcessorProps) {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthesisRef = useRef<SpeechSynthesis | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const retryCountRef = useRef(0)
  const maxRetries = 3

  // Request microphone permission
  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      setIsInitializing(true)
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Stop the stream immediately after getting permission
      stream.getTracks().forEach(track => track.stop())
      
      setHasPermission(true)
      return true
    } catch (error) {
      console.error('Microphone permission error:', error)
      setHasPermission(false)
      onError('Microphone permission denied. Please allow microphone access and try again.')
      return false
    } finally {
      setIsInitializing(false)
    }
  }

  useEffect(() => {
    // Check if Web Speech API is supported
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const SpeechSynthesis = window.speechSynthesis
      
      setIsSupported(!!SpeechRecognition && !!SpeechSynthesis)
      
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        
        // Configure recognition for better Urdu speech detection
        recognitionRef.current.continuous = false // Change to false for better reliability
        recognitionRef.current.interimResults = true
        recognitionRef.current.maxAlternatives = 1
        
        // Set language based on urduType
        if (urduType === 'roman') {
          // For Roman Urdu, use English-US as it's more likely to recognize Romanized Urdu
          recognitionRef.current.lang = 'en-US'
        } else {
          // For pure Urdu, use Pakistan Urdu
          recognitionRef.current.lang = 'ur-PK'
        }
        
        recognitionRef.current.onresult = (event) => {
          let finalTranscript = ''
          let interimTranscript = ''
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimTranscript += transcript
            }
          }
          
          if (finalTranscript) {
            onTranscript(finalTranscript, true)
            // Reset retry count on successful recognition
            retryCountRef.current = 0
          } else if (interimTranscript) {
            onTranscript(interimTranscript, false)
          }
        }
        
        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error, event)
          
          // Handle specific errors
          switch (event.error) {
            case 'no-speech':
              // Don't show error for no-speech, just restart silently
              if (isListening && retryCountRef.current < maxRetries) {
                retryCountRef.current++
                setTimeout(() => {
                  if (isListening && recognitionRef.current) {
                    try {
                      recognitionRef.current.start()
                    } catch (error) {
                      console.error('Failed to restart recognition:', error)
                    }
                  }
                }, 1000) // Wait 1 second before retrying
              } else if (retryCountRef.current >= maxRetries) {
                onError('No speech detected. Please speak clearly and ensure your microphone is working.')
                retryCountRef.current = 0
              }
              break
              
            case 'audio-capture':
              onError('Microphone error. Please check your microphone connection and try again.')
              break
              
            case 'not-allowed':
              onError('Microphone access denied. Please allow microphone access and try again.')
              break
              
            case 'network':
              onError('Network error. Please check your internet connection.')
              break
              
            default:
              onError(`Speech recognition error: ${event.error}`)
          }
        }
        
        recognitionRef.current.onend = () => {
          if (isListening && hasPermission) {
            // Restart if we're still supposed to be listening
            setTimeout(() => {
              if (isListening && recognitionRef.current) {
                try {
                  recognitionRef.current.start()
                } catch (error) {
                  console.error('Failed to restart recognition:', error)
                }
              }
            }, 100) // Small delay before restarting
          }
        }
        
        recognitionRef.current.onstart = () => {
          console.log('Speech recognition started')
          retryCountRef.current = 0
        }
      }
      
      if (SpeechSynthesis) {
        synthesisRef.current = SpeechSynthesis
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel()
      }
    }
  }, [urduType])

  useEffect(() => {
    const initializeAndStart = async () => {
      if (isListening && recognitionRef.current && isSupported) {
        // Request permission if not already granted
        if (!hasPermission) {
          const permissionGranted = await requestMicrophonePermission()
          if (!permissionGranted) {
            return
          }
        }
        
        try {
          recognitionRef.current.stop() // Stop any existing recognition
          setTimeout(() => {
            if (isListening && recognitionRef.current) {
              recognitionRef.current.start()
            }
          }, 100)
        } catch (error) {
          console.error('Failed to start speech recognition:', error)
          onError('Failed to start speech recognition. Please refresh the page and try again.')
        }
      } else if (!isListening && recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
    
    initializeAndStart()
  }, [isListening, isSupported, hasPermission])

  const speak = async (text: string): Promise<void> => {
    if (!synthesisRef.current || !isSupported) {
      throw new Error('Speech synthesis not supported')
    }

    return new Promise((resolve, reject) => {
      try {
        // Cancel any ongoing speech
        synthesisRef.current.cancel()
        
        const utterance = new SpeechSynthesisUtterance(text)
        
        // Set language based on urduType
        if (urduType === 'roman') {
          utterance.lang = 'en-US'
        } else {
          utterance.lang = 'ur-PK'
        }
        
        // Configure speech parameters for better Urdu pronunciation
        utterance.rate = 0.9 // Slightly slower for better clarity
        utterance.pitch = 1.0
        utterance.volume = 1.0
        
        // Try to find a suitable voice
        const voices = synthesisRef.current.getVoices()
        const urduVoice = voices.find(voice => 
          voice.lang.includes('ur') || voice.lang.includes('hi')
        )
        
        if (urduVoice) {
          utterance.voice = urduVoice
        }
        
        utterance.onend = () => {
          resolve()
        }
        
        utterance.onerror = (event) => {
          reject(new Error(`Speech synthesis error: ${event.error}`))
        }
        
        synthesisRef.current.speak(utterance)
      } catch (error) {
        reject(error)
      }
    })
  }

  const stop = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    if (synthesisRef.current) {
      synthesisRef.current.cancel()
    }
  }

  // Expose speak and stop functions to parent
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).webSpeechProcessor = {
        speak,
        stop
      }
    }
  }, [urduType])

  if (!isSupported) {
    return (
      <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
        Web Speech API not supported in this browser. Please use Chrome, Edge, or Safari for best results.
      </div>
    )
  }

  if (isInitializing) {
    return (
      <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
        Initializing microphone...
      </div>
    )
  }

  if (!hasPermission) {
    return (
      <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
        Microphone access required. Please allow microphone access to use speech recognition.
      </div>
    )
  }

  return null // This component doesn't render anything visible
}

// Add TypeScript declarations for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any
    SpeechRecognition: any
    webSpeechProcessor?: {
      speak: (text: string) => Promise<void>
      stop: () => void
    }
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: (event: any) => void
  onerror: (event: any) => void
  onend: (event: any) => void
}

interface SpeechSynthesisUtterance extends EventTarget {
  text: string
  lang: string
  rate: number
  pitch: number
  volume: number
  onend: (event: any) => void
  onerror: (event: any) => void
}