'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Mic, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SpeechErrorHandlerProps {
  error: string | null
  onRetry: () => void
  onSwitchToCustom: () => void
  useWebSpeechAPI: boolean
}

export function SpeechErrorHandler({ 
  error, 
  onRetry, 
  onSwitchToCustom, 
  useWebSpeechAPI 
}: SpeechErrorHandlerProps) {
  const [showDetailedHelp, setShowDetailedHelp] = useState(false)
  const [errorType, setErrorType] = useState<string>('')

  useEffect(() => {
    if (error) {
      // Categorize the error type
      if (error.includes('no-speech')) {
        setErrorType('no-speech')
      } else if (error.includes('permission') || error.includes('not-allowed')) {
        setErrorType('permission')
      } else if (error.includes('microphone') || error.includes('audio-capture')) {
        setErrorType('microphone')
      } else if (error.includes('network')) {
        setErrorType('network')
      } else {
        setErrorType('general')
      }
    }
  }, [error])

  if (!error) return null

  const getErrorTitle = () => {
    switch (errorType) {
      case 'no-speech':
        return 'Speech Not Detected'
      case 'permission':
        return 'Microphone Access Required'
      case 'microphone':
        return 'Microphone Issue'
      case 'network':
        return 'Network Connection Problem'
      default:
        return 'Speech Recognition Error'
    }
  }

  const getErrorMessage = () => {
    switch (errorType) {
      case 'no-speech':
        return 'The system couldn\'t detect your speech. Please speak clearly and ensure your microphone is working properly.'
      case 'permission':
        return 'Please allow microphone access to use speech recognition. Click the microphone icon in your browser\'s address bar.'
      case 'microphone':
        return 'There\'s an issue with your microphone. Please check your connection and try a different microphone if available.'
      case 'network':
        return 'Speech recognition requires an internet connection. Please check your network and try again.'
      default:
        return 'An error occurred during speech recognition. Please try again.'
    }
  }

  const getTroubleshootingSteps = () => {
    switch (errorType) {
      case 'no-speech':
        return [
          'Speak clearly and loudly enough',
          'Ensure your microphone is not muted',
          'Check microphone volume levels',
          'Try speaking closer to the microphone',
          'Minimize background noise'
        ]
      case 'permission':
        return [
          'Click the microphone icon in your browser\'s address bar',
          'Select "Allow" when prompted for microphone access',
          'Refresh the page if permission was previously denied',
          'Check browser settings for microphone permissions',
          'Try incognito mode if permissions are blocked'
        ]
      case 'microphone':
        return [
          'Check if your microphone is properly connected',
          'Try a different microphone or audio input device',
          'Check system sound settings',
          'Ensure no other app is using the microphone',
          'Restart your browser or computer'
        ]
      case 'network':
        return [
          'Check your internet connection',
          'Try refreshing the page',
          'Disable VPN or proxy if enabled',
          'Check firewall settings',
          'Try a different network'
        ]
      default:
        return [
          'Refresh the page and try again',
          'Check browser console for detailed errors',
          'Try switching to Custom Audio mode',
          'Ensure you\'re using a supported browser',
          'Contact support if the issue persists'
        ]
    }
  }

  return (
    <div className="w-full max-w-sm mb-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-red-800 font-medium text-sm mb-1">
              {getErrorTitle()}
            </h3>
            <p className="text-red-700 text-sm mb-3">
              {getErrorMessage()}
            </p>
            
            <div className="flex gap-2 mb-3">
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="text-xs h-8 border-red-300 text-red-700 hover:bg-red-50"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Try Again
              </Button>
              
              {useWebSpeechAPI && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onSwitchToCustom}
                  className="text-xs h-8 border-red-300 text-red-700 hover:bg-red-50"
                >
                  <Settings className="w-3 h-3 mr-1" />
                  Use Enhanced Speech
                </Button>
              )}
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDetailedHelp(!showDetailedHelp)}
                className="text-xs h-8 border-red-300 text-red-700 hover:bg-red-50"
              >
                <Mic className="w-3 h-3 mr-1" />
                Help
              </Button>
            </div>
            
            {showDetailedHelp && (
              <div className="bg-red-100 rounded p-3">
                <h4 className="text-red-800 font-medium text-xs mb-2">
                  Troubleshooting Steps:
                </h4>
                <ul className="text-red-700 text-xs space-y-1">
                  {getTroubleshootingSteps().map((step, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-500">•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}