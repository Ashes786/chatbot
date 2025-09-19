'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Volume2, Command, AlertCircle, CheckCircle, Home, Settings, HelpCircle } from 'lucide-react'

interface SpeechCommand {
  command: string
  description: string
  action: () => void
  category: 'navigation' | 'control' | 'system' | 'custom'
}

interface SpeechCommandsProps {
  onCommand?: (command: string, action: () => void) => void
  onNavigate?: (path: string) => void
  className?: string
}

export function SpeechCommands({ onCommand, onNavigate, className = "" }: SpeechCommandsProps) {
  const [lastCommand, setLastCommand] = useState<string>('')
  const [isListening, setIsListening] = useState(false)
  const [recognizedCommands, setRecognizedCommands] = useState<string[]>([])
  const [error, setError] = useState('')

  const commands: SpeechCommand[] = [
    // Navigation commands - English
    {
      command: 'go home',
      description: 'Navigate to home page',
      action: () => onNavigate?.('/'),
      category: 'navigation'
    },
    {
      command: 'home',
      description: 'Navigate to home page',
      action: () => onNavigate?.('/'),
      category: 'navigation'
    },
    {
      command: 'open settings',
      description: 'Open settings page',
      action: () => onNavigate?.('/settings'),
      category: 'navigation'
    },
    {
      command: 'settings',
      description: 'Open settings page',
      action: () => onNavigate?.('/settings'),
      category: 'navigation'
    },
    {
      command: 'help',
      description: 'Show help information',
      action: () => onNavigate?.('/help'),
      category: 'navigation'
    },
    {
      command: 'show help',
      description: 'Show help information',
      action: () => onNavigate?.('/help'),
      category: 'navigation'
    },

    // Navigation commands - Urdu
    {
      command: 'گھر جاؤ',
      description: 'ہوم پیج پر جائیں',
      action: () => onNavigate?.('/'),
      category: 'navigation'
    },
    {
      command: 'گھر',
      description: 'ہوم پیج پر جائیں',
      action: () => onNavigate?.('/'),
      category: 'navigation'
    },
    {
      command: 'سیٹنگز کھولو',
      description: 'سیٹنگز پیج کھولیں',
      action: () => onNavigate?.('/settings'),
      category: 'navigation'
    },
    {
      command: 'سیٹنگز',
      description: 'سیٹنگز پیج کھولیں',
      action: () => onNavigate?.('/settings'),
      category: 'navigation'
    },
    {
      command: 'مدد',
      description: 'مدد کی معلومات دکھائیں',
      action: () => onNavigate?.('/help'),
      category: 'navigation'
    },
    {
      command: 'مدد کرو',
      description: 'مدد کی معلومات دکھائیں',
      action: () => onNavigate?.('/help'),
      category: 'navigation'
    },

    // Control commands - English
    {
      command: 'start listening',
      description: 'Start speech recognition',
      action: () => setIsListening(true),
      category: 'control'
    },
    {
      command: 'stop listening',
      description: 'Stop speech recognition',
      action: () => setIsListening(false),
      category: 'control'
    },
    {
      command: 'clear',
      description: 'Clear transcript',
      action: () => setRecognizedCommands([]),
      category: 'control'
    },
    {
      command: 'clear transcript',
      description: 'Clear transcript',
      action: () => setRecognizedCommands([]),
      category: 'control'
    },

    // Control commands - Urdu
    {
      command: 'سننا شروع کرو',
      description: 'اسپیچ ریکگنیشن شروع کریں',
      action: () => setIsListening(true),
      category: 'control'
    },
    {
      command: 'سننا بند کرو',
      description: 'اسپیچ ریکگنیشن بند کریں',
      action: () => setIsListening(false),
      category: 'control'
    },
    {
      command: 'صاف کرو',
      description: 'ٹرانسکرپٹ صاف کریں',
      action: () => setRecognizedCommands([]),
      category: 'control'
    },
    {
      command: 'ٹرانسکرپٹ صاف کرو',
      description: 'ٹرانسکرپٹ صاف کریں',
      action: () => setRecognizedCommands([]),
      category: 'control'
    },

    // System commands - English
    {
      command: 'what can I say',
      description: 'Show available commands',
      action: () => {
        setRecognizedCommands(prev => [...prev, 'Showing available commands...'])
      },
      category: 'system'
    },
    {
      command: 'show commands',
      description: 'Show available commands',
      action: () => {
        setRecognizedCommands(prev => [...prev, 'Showing available commands...'])
      },
      category: 'system'
    },
    {
      command: 'repeat last command',
      description: 'Repeat the last executed command',
      action: () => {
        if (lastCommand) {
          const command = commands.find(cmd => 
            cmd.command.toLowerCase() === lastCommand.toLowerCase()
          )
          if (command) {
            command.action()
            setRecognizedCommands(prev => [...prev, `Repeating: ${lastCommand}`])
          }
        }
      },
      category: 'system'
    },

    // System commands - Urdu
    {
      command: 'میں کیا کہہ سکتا ہوں',
      description: 'دستیاب کمانڈز دکھائیں',
      action: () => {
        setRecognizedCommands(prev => [...prev, 'دستیاب کمانڈز دکھا رہے ہیں...'])
      },
      category: 'system'
    },
    {
      command: 'کمانڈز دکھاؤ',
      description: 'دستیاب کمانڈز دکھائیں',
      action: () => {
        setRecognizedCommands(prev => [...prev, 'دستیاب کمانڈز دکھا رہے ہیں...'])
      },
      category: 'system'
    },
    {
      command: 'پچھلا کمانڈ دہرائیں',
      description: 'آخری اجرا شدہ کمانڈ دہرائیں',
      action: () => {
        if (lastCommand) {
          const command = commands.find(cmd => 
            cmd.command.toLowerCase() === lastCommand.toLowerCase()
          )
          if (command) {
            command.action()
            setRecognizedCommands(prev => [...prev, `دہرا رہے ہیں: ${lastCommand}`])
          }
        }
      },
      category: 'system'
    }
  ]

  const handleSpeechResult = (event: { transcript: string; isFinal: boolean }) => {
    if (!event.isFinal) return

    const transcript = event.transcript.toLowerCase().trim()
    setRecognizedCommands(prev => [...prev, `Heard: "${event.transcript}"`])

    // Find matching command
    const matchedCommand = commands.find(cmd => 
      transcript.includes(cmd.command.toLowerCase())
    )

    if (matchedCommand) {
      setLastCommand(matchedCommand.command)
      setRecognizedCommands(prev => [...prev, `✓ Executed: ${matchedCommand.command}`])
      onCommand?.(matchedCommand.command, matchedCommand.action)
      matchedCommand.action()
    } else {
      setRecognizedCommands(prev => [...prev, `❓ No command found for: "${event.transcript}"`])
    }
  }

  const handleSpeechError = (error: string) => {
    setError(error)
    setRecognizedCommands(prev => [...prev, `❌ Error: ${error}`])
  }

  const handleSpeechStart = () => {
    setIsListening(true)
    setError('')
    setRecognizedCommands(prev => [...prev, '🎤 Started listening...'])
  }

  const handleSpeechStop = () => {
    setIsListening(false)
    setRecognizedCommands(prev => [...prev, '⏹️ Stopped listening'])
  }

  const handleAudioLevelChange = (level: number) => {
    // Audio level monitoring for visual feedback
  }

  const getCommandsByCategory = (category: string) => {
    return commands.filter(cmd => cmd.category === category)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'navigation':
        return <Home className="w-4 h-4" />
      case 'control':
        return <Command className="w-4 h-4" />
      case 'system':
        return <Settings className="w-4 h-4" />
      default:
        return <HelpCircle className="w-4 h-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'navigation':
        return 'bg-blue-100 text-blue-800'
      case 'control':
        return 'bg-green-100 text-green-800'
      case 'system':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Command className="w-5 h-5" />
            Voice Commands
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              isListening ? 'bg-green-500' : 'bg-gray-500'
            }`} />
            <span className="text-sm font-medium">
              {isListening ? 'Listening for commands...' : 'Voice ready'}
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

          {/* Command History */}
          {recognizedCommands.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Command History:</div>
              <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-32 overflow-y-auto space-y-1">
                {recognizedCommands.map((cmd, index) => (
                  <div key={index} className="text-sm font-mono text-gray-600">
                    {cmd}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Commands */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Available Commands:</div>
            
            {(['navigation', 'control', 'system'] as const).map(category => (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(category)}
                  <span className="text-sm font-medium capitalize">{category}</span>
                  <Badge className={getCategoryColor(category)}>
                    {getCommandsByCategory(category).length}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                  {getCommandsByCategory(category).map((cmd, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded p-2">
                      <div className="text-sm font-medium text-gray-800">
                        "{cmd.command}"
                      </div>
                      <div className="text-xs text-gray-500">
                        {cmd.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <div className="text-sm font-medium text-blue-800 mb-2">Tips:</div>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Speak clearly and naturally</li>
              <li>• Commands are not case-sensitive</li>
              <li>• You can say part of a command (e.g., "home" for "go home")</li>
              <li>• Say "what can I say" to see all available commands</li>
              <li>• Urdu commands are now supported (اردو کمانڈز سپورٹڈ ہیں)</li>
              <li>• Use language selector to switch between English and Urdu</li>
              <li>• Adjust sensitivity for better recognition of quiet speech</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}