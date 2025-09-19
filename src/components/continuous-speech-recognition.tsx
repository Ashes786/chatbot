'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mic, Square, Volume2, VolumeX, Settings, AlertCircle, CheckCircle } from 'lucide-react'

interface SpeechRecognitionOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
  maxAlternatives?: number
  sensitivity?: 'low' | 'medium' | 'high'
}

interface SpeechRecognitionEvent {
  transcript: string
  isFinal: boolean
  confidence: number
}

interface ContinuousSpeechRecognitionProps {
  onResult?: (event: SpeechRecognitionEvent) => void
  onError?: (error: string) => void
  onStart?: () => void
  onStop?: () => void
  onAudioLevelChange?: (level: number) => void
  options?: SpeechRecognitionOptions
  className?: string
}

export function ContinuousSpeechRecognition({
  onResult,
  onError,
  onStart,
  onStop,
  onAudioLevelChange,
  options = {},
  className = ""
}: ContinuousSpeechRecognitionProps) {
  const [isListening, setIsListening] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)
  const [status, setStatus] = useState<'idle' | 'initializing' | 'listening' | 'error'>('idle')
  const [currentLanguage, setCurrentLanguage] = useState('en-US')
  const [sensitivity, setSensitivity] = useState<'low' | 'medium' | 'high'>('high')
  
  const recognitionRef = useRef<any>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const isInitializedRef = useRef(false)

  const defaultOptions: SpeechRecognitionOptions = {
    language: 'en-US',
    continuous: true,
    interimResults: true,
    maxAlternatives: 1,
    sensitivity: 'high',
    ...options
  }

  // Supported languages with their display names
  const supportedLanguages = [
    { code: 'en-US', name: 'English (US)', nativeName: 'English' },
    { code: 'ur-PK', name: 'Urdu (Pakistan)', nativeName: 'اردو' },
    { code: 'ur-IN', name: 'Urdu (India)', nativeName: 'اردو' },
    { code: 'hi-IN', name: 'Hindi (India)', nativeName: 'हिन्दी' },
    { code: 'ar-SA', name: 'Arabic (Saudi Arabia)', nativeName: 'العربية' },
  ]

  const initializeAudioContext = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext
        audioContextRef.current = new AudioContext()
        
        if (!mediaStreamRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: false, // Disabled for better sensitivity
              noiseSuppression: false, // Disabled for better sensitivity  
              autoGainControl: true, // Enabled to amplify quiet speech
              sampleRate: 44100, // Higher sample rate for better quality
              channelCount: 1,
              // Add constraints for better sensitivity
              latency: 0,
              deviceId: 'default'
            } 
          })
          mediaStreamRef.current = stream
        }
        
        const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current)
        
        // Add gain node for amplification
        const gainNode = audioContextRef.current.createGain()
        gainNode.gain.value = 2.0 // Amplify the audio signal
        
        analyserRef.current = audioContextRef.current.createAnalyser()
        analyserRef.current.fftSize = 512 // Larger FFT size for better frequency analysis
        analyserRef.current.minDecibels = -90 // More sensitive to quiet sounds
        analyserRef.current.maxDecibels = -10
        analyserRef.current.smoothingTimeConstant = 0.8
        
        source.connect(gainNode)
        gainNode.connect(analyserRef.current)
        
        startAudioMonitoring()
      }
    } catch (err) {
      console.error('Failed to initialize audio context:', err)
    }
  }, [])

  const startAudioMonitoring = () => {
    if (!analyserRef.current) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    const speechThreshold = 0.02 // Lower threshold for more sensitive detection
    let speechStartTime = 0
    let isCurrentlyDetectingSpeech = false

    const monitor = () => {
      if (!analyserRef.current) return

      analyserRef.current.getByteFrequencyData(dataArray)
      
      // Calculate average audio level with more sensitive calculation
      const sum = dataArray.reduce((a, b) => a + b, 0)
      const average = sum / bufferLength
      const normalizedLevel = isMuted ? 0 : average / 255
      
      // Apply logarithmic scaling for better sensitivity to quiet sounds
      const sensitiveLevel = normalizedLevel > 0 ? Math.log(normalizedLevel + 1) / Math.log(2) : 0
      
      setAudioLevel(sensitiveLevel)
      onAudioLevelChange?.(sensitiveLevel)

      // Enhanced speech detection with hysteresis
      const currentTime = Date.now()
      
      if (sensitiveLevel > speechThreshold) {
        if (!isCurrentlyDetectingSpeech) {
          speechStartTime = currentTime
          isCurrentlyDetectingSpeech = true
        }
      } else {
        if (isCurrentlyDetectingSpeech && (currentTime - speechStartTime) > 500) {
          // Speech detected for at least 500ms
          isCurrentlyDetectingSpeech = false
        }
      }

      animationRef.current = requestAnimationFrame(monitor)
    }

    monitor()
  }

  const initializeSpeechRecognition = useCallback(async () => {
    if (isInitializedRef.current) return

    try {
      setStatus('initializing')
      
      if (typeof window === 'undefined') {
        throw new Error('Speech recognition not available in server environment')
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      
      if (!SpeechRecognition) {
        throw new Error('Speech recognition not supported in this browser')
      }

      await initializeAudioContext()

      recognitionRef.current = new SpeechRecognition()
      
      recognitionRef.current.continuous = defaultOptions.continuous
      recognitionRef.current.interimResults = defaultOptions.interimResults
      recognitionRef.current.lang = defaultOptions.language
      recognitionRef.current.maxAlternatives = defaultOptions.maxAlternatives

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          const confidence = event.results[i][0].confidence

          if (event.results[i].isFinal) {
            finalTranscript += transcript
            onResult?.({
              transcript,
              isFinal: true,
              confidence
            })
          } else {
            interimTranscript += transcript
            onResult?.({
              transcript,
              isFinal: false,
              confidence
            })
          }
        }

        setTranscript(prev => prev + finalTranscript)
        setInterimTranscript(interimTranscript)
      }

      recognitionRef.current.onerror = (event: any) => {
        const errorMessage = `Speech recognition error: ${event.error}`
        setError(errorMessage)
        setStatus('error')
        onError?.(errorMessage)
        
        if (event.error === 'no-speech' && isListening) {
          // Restart recognition on no-speech error if we're supposed to be listening
          setTimeout(() => {
            if (isListening && recognitionRef.current) {
              try {
                recognitionRef.current.start()
              } catch (restartError) {
                console.error('Failed to restart recognition:', restartError)
              }
            }
          }, 1000)
        }
      }

      recognitionRef.current.onend = () => {
        if (isListening && recognitionRef.current) {
          try {
            recognitionRef.current.start()
          } catch (restartError) {
            console.error('Failed to restart recognition:', restartError)
            setIsListening(false)
            setStatus('idle')
            onStop?.()
          }
        }
      }

      recognitionRef.current.onstart = () => {
        setStatus('listening')
        onStart?.()
      }

      isInitializedRef.current = true
      setStatus('idle')
      
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to initialize speech recognition'
      setError(errorMessage)
      setStatus('error')
      onError?.(errorMessage)
    }
  }, [defaultOptions, onResult, onError, onStart, onStop, onAudioLevelChange, isListening, initializeAudioContext])

  const startListening = async () => {
    try {
      if (!isInitializedRef.current) {
        await initializeSpeechRecognition()
      }

      if (!recognitionRef.current) {
        throw new Error('Speech recognition not initialized')
      }

      setIsListening(true)
      setError('')
      
      recognitionRef.current.start()
      
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to start speech recognition'
      setError(errorMessage)
      setStatus('error')
      onError?.(errorMessage)
      setIsListening(false)
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
    setInterimTranscript('')
    onStop?.()
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const changeLanguage = (language: string) => {
    setCurrentLanguage(language)
    if (recognitionRef.current) {
      recognitionRef.current.lang = language
    }
  }

  const changeSensitivity = (newSensitivity: 'low' | 'medium' | 'high') => {
    setSensitivity(newSensitivity)
    // Update audio processing based on sensitivity
    if (analyserRef.current) {
      switch (newSensitivity) {
        case 'low':
          analyserRef.current.minDecibels = -70
          break
        case 'medium':
          analyserRef.current.minDecibels = -80
          break
        case 'high':
          analyserRef.current.minDecibels = -90
          break
      }
    }
  }

  const clearTranscript = () => {
    setTranscript('')
    setInterimTranscript('')
  }

  const cleanup = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    analyserRef.current = null
    isInitializedRef.current = false
  }

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Continuous Speech Recognition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Display */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              status === 'error' ? 'bg-red-500' :
              status === 'listening' ? 'bg-green-500' :
              status === 'initializing' ? 'bg-yellow-500' :
              'bg-gray-500'
            }`} />
            <span className="text-sm font-medium">
              Status: {status === 'idle' ? 'Ready' : 
                     status === 'initializing' ? 'Initializing...' :
                     status === 'listening' ? 'Listening' :
                     status === 'error' ? 'Error' : status}
            </span>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={isListening ? stopListening : startListening}
              disabled={status === 'initializing'}
              className="flex items-center gap-2"
            >
              {isListening ? (
                <>
                  <Square className="w-4 h-4" />
                  Stop Listening
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  Start Listening
                </>
              )}
            </Button>

            <Button
              onClick={toggleMute}
              disabled={!isListening}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4" />
                  Unmute
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  Mute
                </>
              )}
            </Button>

            <Button
              onClick={clearTranscript}
              variant="outline"
              className="flex items-center gap-2"
            >
              Clear
            </Button>
          </div>

          {/* Language and Sensitivity Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Language Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Language:</label>
              <select
                value={currentLanguage}
                onChange={(e) => changeLanguage(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                disabled={isListening}
              >
                {supportedLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>

            {/* Sensitivity Control */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sensitivity:</label>
              <select
                value={sensitivity}
                onChange={(e) => changeSensitivity(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                disabled={isListening}
              >
                <option value="low">Low (less sensitive to background noise)</option>
                <option value="medium">Medium (balanced sensitivity)</option>
                <option value="high">High (very sensitive to quiet speech)</option>
              </select>
            </div>
          </div>

          {/* Audio Level Indicator */}
          {status === 'listening' && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Audio Level:</div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-100 ${
                    isMuted ? 'bg-gray-400' : 'bg-blue-500'
                  }`}
                  style={{ width: `${audioLevel * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-500">
                {isMuted ? '🔇 Microphone muted' : '🎤 Listening...'}
              </div>
            </div>
          )}

          {/* Transcript Display */}
          {(transcript || interimTranscript) && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Transcript:</div>
              <div className="bg-gray-50 border border-gray-200 rounded p-3 min-h-[100px] max-h-48 overflow-y-auto">
                {transcript && (
                  <div className="text-gray-800 mb-2">
                    {transcript}
                  </div>
                )}
                {interimTranscript && (
                  <div className="text-gray-500 italic">
                    {interimTranscript}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}