'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mic, Square, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

export function SimpleSpeechTest() {
  const [isListening, setIsListening] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('idle')
  const [audioLevel, setAudioLevel] = useState(0)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)

  const addDebug = (message: string) => {
    console.log(message)
    setDebugInfo(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testMicrophone = async () => {
    try {
      addDebug('Testing microphone access...')
      setError('')
      setStatus('testing')

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser')
      }

      addDebug('getUserMedia is available')

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 16000,
          channelCount: 1
        } 
      })

      addDebug('Microphone access granted')
      mediaStreamRef.current = stream

      // Set up audio context for monitoring
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      audioContextRef.current = new AudioContext()
      
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)

      addDebug('Audio context set up successfully')
      setStatus('ready')
      
      // Start monitoring audio levels
      startAudioMonitoring()

    } catch (err: any) {
      const errorMessage = err.message || err.toString()
      addDebug(`Microphone test failed: ${errorMessage}`)
      setError(errorMessage)
      setStatus('error')
    }
  }

  const startAudioMonitoring = () => {
    if (!analyserRef.current) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const monitor = () => {
      if (!analyserRef.current) return

      analyserRef.current.getByteFrequencyData(dataArray)
      
      // Calculate average audio level
      const sum = dataArray.reduce((a, b) => a + b, 0)
      const average = sum / bufferLength
      const normalizedLevel = average / 255
      
      setAudioLevel(normalizedLevel)

      // Speech detection logic
      if (normalizedLevel > 0.05) { // Threshold for speech detection
        if (!isRecording) {
          setIsRecording(true)
          addDebug('Speech detected - recording started')
        }
      } else {
        if (isRecording) {
          setIsRecording(false)
          addDebug('Silence detected - recording stopped')
          // Here you would process the recorded audio
        }
      }

      animationRef.current = requestAnimationFrame(monitor)
    }

    monitor()
  }

  const startListening = async () => {
    try {
      addDebug('Starting speech recognition test...')
      setIsListening(true)
      setError('')
      setTranscript('')

      // Test Web Speech API first
      if (typeof window !== 'undefined') {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        
        if (SpeechRecognition) {
          addDebug('Web Speech API available - testing...')
          
          const recognition = new SpeechRecognition()
          recognition.continuous = false
          recognition.interimResults = true
          recognition.lang = 'en-US'

          recognition.onresult = (event) => {
            let finalTranscript = ''
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript
              if (event.results[i].isFinal) {
                finalTranscript += transcript
              }
            }
            
            if (finalTranscript) {
              setTranscript(finalTranscript)
              addDebug(`Speech recognized: "${finalTranscript}"`)
              setIsListening(false)
            }
          }

          recognition.onerror = (event) => {
            addDebug(`Web Speech error: ${event.error}`)
            setError(`Web Speech error: ${event.error}`)
            setIsListening(false)
          }

          recognition.onend = () => {
            addDebug('Web Speech recognition ended')
            setIsListening(false)
          }

          try {
            recognition.start()
            addDebug('Web Speech recognition started')
          } catch (startError) {
            addDebug(`Web Speech start error: ${startError}`)
            throw new Error('Failed to start Web Speech recognition')
          }
        } else {
          throw new Error('Web Speech API not supported')
        }
      }

    } catch (err: any) {
      const errorMessage = err.message || err.toString()
      addDebug(`Speech recognition failed: ${errorMessage}`)
      setError(errorMessage)
      setIsListening(false)
    }
  }

  const stopListening = () => {
    setIsListening(false)
    setIsRecording(false)
    addDebug('Speech recognition stopped manually')
  }

  const reset = () => {
    setIsListening(false)
    setIsRecording(false)
    setTranscript('')
    setError('')
    setStatus('idle')
    setAudioLevel(0)
    setDebugInfo([])
    
    // Clean up audio resources
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
    
    addDebug('System reset')
  }

  useEffect(() => {
    return () => {
      reset()
    }
  }, [])

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Simple Speech Recognition Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Display */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              status === 'error' ? 'bg-red-500' :
              status === 'ready' ? 'bg-green-500' :
              status === 'testing' ? 'bg-yellow-500' :
              'bg-gray-500'
            }`} />
            <span className="text-sm font-medium">
              Status: {status === 'idle' ? 'Not Tested' : 
                     status === 'testing' ? 'Testing...' :
                     status === 'ready' ? 'Ready' :
                     status === 'error' ? 'Error' : status}
            </span>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Error: {error}</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2">
            <Button
              onClick={testMicrophone}
              disabled={status === 'testing' || status === 'ready'}
              className="flex items-center gap-2"
            >
              {status === 'testing' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              Test Microphone
            </Button>

            <Button
              onClick={startListening}
              disabled={status !== 'ready' || isListening}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isListening ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              {isListening ? 'Listening...' : 'Start Speech Test'}
            </Button>

            <Button
              onClick={stopListening}
              disabled={!isListening}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              Stop
            </Button>

            <Button
              onClick={reset}
              variant="outline"
              className="flex items-center gap-2"
            >
              Reset
            </Button>
          </div>

          {/* Audio Level Indicator */}
          {status === 'ready' && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Audio Level:</div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-blue-500 h-4 rounded-full transition-all duration-100"
                  style={{ width: `${audioLevel * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-500">
                {isRecording ? '🔴 Recording speech...' : '🎤 Speak into microphone'}
              </div>
            </div>
          )}

          {/* Transcript Display */}
          {transcript && (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Recognized Speech:</span>
              </div>
              <div className="text-green-800 font-mono text-sm">
                "{transcript}"
              </div>
            </div>
          )}

          {/* Debug Info */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Debug Log:</div>
            <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-32 overflow-y-auto">
              {debugInfo.length > 0 ? (
                debugInfo.map((info, index) => (
                  <div key={index} className="text-xs font-mono text-gray-600 mb-1">
                    {info}
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-400 italic">No debug information yet</div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <div className="text-sm font-medium text-blue-800 mb-2">Instructions:</div>
            <ol className="text-blue-700 text-sm space-y-1">
              <li>1. Click "Test Microphone" to check microphone access</li>
              <li>2. Wait for status to show "Ready"</li>
              <li>3. Click "Start Speech Test" and speak clearly</li>
              <li>4. Watch the audio level indicator while speaking</li>
              <li>5. Check if your speech is recognized in the transcript</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}