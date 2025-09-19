'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Bug, 
  Mic, 
  Volume2, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  Info,
  Settings
} from 'lucide-react'

interface SpeechDebuggerProps {
  onDebugInfo: (info: string) => void
}

export function SpeechDebugger({ onDebugInfo }: SpeechDebuggerProps) {
  const [browserInfo, setBrowserInfo] = useState<any>({})
  const [microphoneStatus, setMicrophoneStatus] = useState<string>('unknown')
  const [webSpeechStatus, setWebSpeechStatus] = useState<string>('unknown')
  const [audioContextStatus, setAudioContextStatus] = useState<string>('unknown')
  const [detailedErrors, setDetailedErrors] = useState<string[]>([])
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    collectBrowserInfo()
    checkWebSpeechSupport()
    checkAudioContextSupport()
  }, [])

  const collectBrowserInfo = () => {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      languages: navigator.languages,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory || 'unknown'
    }
    
    setBrowserInfo(info)
    onDebugInfo(`Browser: ${info.userAgent.split(' ')[0]} on ${info.platform}`)
  }

  const checkWebSpeechSupport = () => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const SpeechSynthesis = window.speechSynthesis
      
      if (SpeechRecognition && SpeechSynthesis) {
        setWebSpeechStatus('supported')
        onDebugInfo('Web Speech API: Supported')
      } else {
        setWebSpeechStatus('not-supported')
        onDebugInfo('Web Speech API: Not supported')
      }
    }
  }

  const checkAudioContextSupport = () => {
    if (typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      
      if (AudioContext) {
        setAudioContextStatus('supported')
        onDebugInfo('AudioContext: Supported')
      } else {
        setAudioContextStatus('not-supported')
        onDebugInfo('AudioContext: Not supported')
      }
    }
  }

  const testMicrophoneAccess = async () => {
    setIsTesting(true)
    setDetailedErrors([])
    
    try {
      onDebugInfo('Testing microphone access...')
      
      // Test 1: Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported')
      }
      
      onDebugInfo('getUserMedia: Available')
      
      // Test 2: Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      setMicrophoneStatus('granted')
      onDebugInfo('Microphone permission: Granted')
      
      // Test 3: Check audio tracks
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length > 0) {
        const track = audioTracks[0]
        onDebugInfo(`Audio track: ${track.label || 'Unnamed microphone'}`)
        onDebugInfo(`Audio track enabled: ${track.enabled}`)
        onDebugInfo(`Audio track state: ${track.readyState}`)
        
        // Test 4: Check audio levels
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        
        source.connect(analyser)
        
        // Check for audio data
        let hasAudioData = false
        const checkAudio = () => {
          analyser.getByteFrequencyData(dataArray)
          const sum = dataArray.reduce((a, b) => a + b, 0)
          const average = sum / dataArray.length
          
          if (average > 10) { // Threshold for detecting audio
            hasAudioData = true
            onDebugInfo(`Audio level detected: ${average.toFixed(2)}`)
          }
        }
        
        // Check audio levels for 3 seconds
        for (let i = 0; i < 30; i++) {
          checkAudio()
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        if (!hasAudioData) {
          onDebugInfo('Warning: No audio levels detected - try speaking into microphone')
        }
        
        // Cleanup
        source.disconnect()
        await audioContext.close()
      }
      
      // Cleanup
      stream.getTracks().forEach(track => track.stop())
      
    } catch (error: any) {
      setMicrophoneStatus('denied')
      const errorMsg = error.message || error.toString()
      setDetailedErrors(prev => [...prev, errorMsg])
      onDebugInfo(`Microphone test failed: ${errorMsg}`)
    } finally {
      setIsTesting(false)
    }
  }

  const testWebSpeechAPI = async () => {
    setIsTesting(true)
    setDetailedErrors([])
    
    try {
      onDebugInfo('Testing Web Speech API...')
      
      if (typeof window === 'undefined') {
        throw new Error('Window not available')
      }
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      
      if (!SpeechRecognition) {
        throw new Error('Web Speech API not supported')
      }
      
      onDebugInfo('SpeechRecognition constructor available')
      
      // Test creating recognition instance
      const recognition = new SpeechRecognition()
      
      onDebugInfo('SpeechRecognition instance created successfully')
      
      // Test configuration
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'
      
      onDebugInfo('SpeechRecognition configured')
      
      // Test starting recognition (will likely fail due to no speech, but tests the API)
      const startTime = Date.now()
      
      recognition.onstart = () => {
        onDebugInfo('Speech recognition started')
      }
      
      recognition.onend = () => {
        const duration = Date.now() - startTime
        onDebugInfo(`Speech recognition ended after ${duration}ms`)
      }
      
      recognition.onerror = (event) => {
        onDebugInfo(`Speech recognition error: ${event.error}`)
        setDetailedErrors(prev => [...prev, `Web Speech Error: ${event.error}`])
      }
      
      try {
        recognition.start()
        onDebugInfo('Speech recognition start() called')
        
        // Stop after 2 seconds to test the lifecycle
        setTimeout(() => {
          try {
            recognition.stop()
            onDebugInfo('Speech recognition stop() called')
          } catch (stopError) {
            onDebugInfo(`Stop error: ${stopError}`)
          }
        }, 2000)
        
      } catch (startError) {
        onDebugInfo(`Start error: ${startError}`)
        setDetailedErrors(prev => [...prev, `Start Error: ${startError}`])
      }
      
    } catch (error: any) {
      const errorMsg = error.message || error.toString()
      setDetailedErrors(prev => [...prev, errorMsg])
      onDebugInfo(`Web Speech API test failed: ${errorMsg}`)
    } finally {
      setTimeout(() => setIsTesting(false), 3000)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'supported':
      case 'granted':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'not-supported':
      case 'denied':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'supported':
      case 'granted':
        return <CheckCircle className="w-4 h-4" />
      case 'not-supported':
      case 'denied':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Info className="w-4 h-4" />
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          Speech Recognition Debugger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Browser Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Browser Information</h4>
            <div className="text-xs space-y-1">
              <div>Platform: {browserInfo.platform}</div>
              <div>Language: {browserInfo.language}</div>
              <div>Online: {browserInfo.onLine ? 'Yes' : 'No'}</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-sm">API Support</h4>
            <div className="space-y-2">
              <Badge variant="outline" className={getStatusColor(webSpeechStatus)}>
                {getStatusIcon(webSpeechStatus)}
                <span className="ml-1">Web Speech: {webSpeechStatus}</span>
              </Badge>
              <Badge variant="outline" className={getStatusColor(audioContextStatus)}>
                {getStatusIcon(audioContextStatus)}
                <span className="ml-1">AudioContext: {audioContextStatus}</span>
              </Badge>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={testMicrophoneAccess}
            disabled={isTesting}
            className="flex items-center gap-2"
          >
            {isTesting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
            Test Microphone
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={testWebSpeechAPI}
            disabled={isTesting}
            className="flex items-center gap-2"
          >
            {isTesting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            Test Web Speech
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDetailedErrors([])
              onDebugInfo('Debug log cleared')
            }}
          >
            <Settings className="w-4 h-4" />
            Clear
          </Button>
        </div>

        {/* Microphone Status */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Microphone Status</h4>
          <Badge variant="outline" className={getStatusColor(microphoneStatus)}>
            {getStatusIcon(microphoneStatus)}
            <span className="ml-1">Microphone: {microphoneStatus}</span>
          </Badge>
        </div>

        {/* Detailed Errors */}
        {detailedErrors.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Detailed Errors</h4>
            <div className="bg-red-50 border border-red-200 rounded p-3 max-h-32 overflow-y-auto">
              {detailedErrors.map((error, index) => (
                <div key={index} className="text-red-700 text-xs font-mono mb-1">
                  {error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <h4 className="font-medium text-sm text-blue-800 mb-2">Quick Tips</h4>
          <ul className="text-blue-700 text-xs space-y-1">
            <li>• Use Chrome or Edge for best Web Speech API support</li>
            <li>• Ensure microphone is not muted in system settings</li>
            <li>• Check browser address bar for microphone permission icon</li>
            <li>• Try incognito mode if permissions are blocked</li>
            <li>• Use "Custom Audio" mode if Web Speech API fails</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}