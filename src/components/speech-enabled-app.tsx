'use client'

import { useState, useEffect } from 'react'
import { ContinuousSpeechRecognition } from './continuous-speech-recognition'
import { SpeechCommands } from './speech-commands'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Mic, Command, Home, Settings, FileText, MessageSquare, Activity } from 'lucide-react'

interface SpeechEnabledAppProps {
  className?: string
}

export function SpeechEnabledApp({ className = "" }: SpeechEnabledAppProps) {
  const [currentPath, setCurrentPath] = useState('/')
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [lastCommand, setLastCommand] = useState('')
  const [appState, setAppState] = useState({
    theme: 'light',
    notifications: true,
    autoStart: false
  })

  const handleSpeechResult = (event: { transcript: string; isFinal: boolean }) => {
    if (event.isFinal) {
      setTranscript(prev => prev + event.transcript + ' ')
    }
  }

  const handleCommand = (command: string, action: () => void) => {
    setLastCommand(command)
    action()
  }

  const handleNavigate = (path: string) => {
    setCurrentPath(path)
    // In a real app, you would use router.push(path)
  }

  const handleSpeechStart = () => {
    setIsListening(true)
  }

  const handleSpeechStop = () => {
    setIsListening(false)
  }

  const handleAudioLevelChange = (level: number) => {
    // Audio level monitoring for visual feedback
  }

  const clearTranscript = () => {
    setTranscript('')
  }

  const copyTranscript = () => {
    if (transcript) {
      navigator.clipboard.writeText(transcript)
    }
  }

  const exportTranscript = () => {
    if (transcript) {
      const blob = new Blob([transcript], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transcript-${new Date().toISOString().split('T')[0]}.txt`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const renderCurrentPage = () => {
    switch (currentPath) {
      case '/':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Welcome to Speech-Enabled App</h2>
              <p className="text-gray-600">Use voice commands to navigate and control the application</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="w-5 h-5" />
                    Speech Recognition
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    Continuous speech recognition with real-time transcription
                  </p>
                  <Badge variant={isListening ? "default" : "secondary"}>
                    {isListening ? "Active" : "Inactive"}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Command className="w-5 h-5" />
                    Voice Commands
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    Control the app with natural voice commands
                  </p>
                  <Badge variant="outline">Multiple commands</Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Real-time Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    Live audio monitoring and visual feedback
                  </p>
                  <Badge variant="outline">Live monitoring</Badge>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      
      case '/settings':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Settings</h2>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Speech Recognition Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Auto-start speech recognition</span>
                    <Button
                      variant={appState.autoStart ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAppState(prev => ({ ...prev, autoStart: !prev.autoStart }))}
                    >
                      {appState.autoStart ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Theme</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAppState(prev => ({ 
                        ...prev, 
                        theme: prev.theme === 'light' ? 'dark' : 'light' 
                      }))}
                    >
                      {appState.theme === 'light' ? "Light" : "Dark"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      
      case '/help':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Help & Documentation</h2>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Getting Started</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p>1. Click "Start Listening" to begin speech recognition</p>
                    <p>2. Speak naturally into your microphone</p>
                    <p>3. Use voice commands to navigate and control the app</p>
                    <p>4. View your transcript in real-time</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Common Commands</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>"go home" - Navigate to home</div>
                    <div>"settings" - Open settings</div>
                    <div>"help" - Show this help</div>
                    <div>"clear" - Clear transcript</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      
      default:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
            <p className="text-gray-600">Say "go home" to return to the main page</p>
          </div>
        )
    }
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 ${className}`}>
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Speech-Enabled Application</h1>
          <p className="text-gray-600">Control with your voice • Navigate naturally • Real-time transcription</p>
          <p className="text-gray-500 text-sm mt-1">وائس سے کنٹرول کریں • فطری طور پر نیویگیٹ کریں • ریئل ٹائم ٹرانسکرپشن</p>
          
          {/* Current Path Indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge variant="outline" className="flex items-center gap-1">
              <Home className="w-3 h-3" />
              {currentPath === '/' ? 'Home' : currentPath.substring(1)}
            </Badge>
            {isListening && (
              <Badge variant="default" className="flex items-center gap-1">
                <Mic className="w-3 h-3" />
                Listening
              </Badge>
            )}
            {lastCommand && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Command className="w-3 h-3" />
                {lastCommand}
              </Badge>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Speech Recognition */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="main" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="main">Main App</TabsTrigger>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="commands">Commands</TabsTrigger>
              </TabsList>
              
              <TabsContent value="main" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    {renderCurrentPage()}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="transcript" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Live Transcript
                      </span>
                      <div className="flex gap-2">
                        <Button
                          onClick={copyTranscript}
                          disabled={!transcript}
                          variant="outline"
                          size="sm"
                        >
                          Copy
                        </Button>
                        <Button
                          onClick={exportTranscript}
                          disabled={!transcript}
                          variant="outline"
                          size="sm"
                        >
                          Export
                        </Button>
                        <Button
                          onClick={clearTranscript}
                          disabled={!transcript}
                          variant="outline"
                          size="sm"
                        >
                          Clear
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 border border-gray-200 rounded p-4 min-h-[200px] max-h-96 overflow-y-auto">
                      {transcript ? (
                        <div className="text-gray-800 whitespace-pre-wrap">
                          {transcript}
                        </div>
                      ) : (
                        <div className="text-gray-400 italic text-center">
                          Start speaking to see transcript...
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="commands" className="mt-4">
                <SpeechCommands
                  onCommand={handleCommand}
                  onNavigate={handleNavigate}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel - Speech Controls */}
          <div className="space-y-4">
            <ContinuousSpeechRecognition
              onResult={handleSpeechResult}
              onStart={handleSpeechStart}
              onStop={handleSpeechStop}
              onAudioLevelChange={handleAudioLevelChange}
              options={{
                language: 'ur-PK', // Default to Urdu
                continuous: true,
                interimResults: true,
                sensitivity: 'high' // High sensitivity for quiet speech
              }}
            />

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={() => handleNavigate('/')}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
                <Button
                  onClick={() => handleNavigate('/settings')}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
                <Button
                  onClick={clearTranscript}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  disabled={!transcript}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Clear Transcript
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-4 border-t">
          <p>Speech-Enabled Application • Use voice commands or click to navigate</p>
          <p className="mt-1">Try saying "go home", "settings", or "help" to get started</p>
          <p className="mt-1">وائس انیبلڈ ایپلیکیشن • وائس کمانڈز استعمال کریں یا کلک کریں</p>
          <p className="mt-1">"گھر جاؤ"، "سیٹنگز"، یا "مدد" کہہ کر شروع کریں</p>
        </div>
      </div>
    </div>
  )
}