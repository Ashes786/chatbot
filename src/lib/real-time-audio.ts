export interface AudioChunk {
  data: ArrayBuffer
  timestamp: number
  isFinal?: boolean
}

export interface SpeechRecognitionResult {
  transcript: string
  isFinal: boolean
  confidence: number
}

export interface VoiceAssistantMessage {
  type: 'audio' | 'text' | 'control'
  content: string | AudioChunk
  metadata?: {
    language?: string
    confidence?: number
    timestamp?: number
  }
}

export class RealTimeAudioProcessor {
  private ws: WebSocket | null = null
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private processor: ScriptProcessorNode | null = null
  private isRecording = false
  private audioBuffer: Float32Array[] = []
  private onSpeechResult: (result: SpeechRecognitionResult) => void
  private onAudioData: (audioData: AudioChunk) => void
  private onError: (error: string) => void
  private processingInterval: NodeJS.Timeout | null = null

  constructor(
    onSpeechResult: (result: SpeechRecognitionResult) => void,
    onAudioData: (audioData: AudioChunk) => void,
    onError: (error: string) => void
  ) {
    this.onSpeechResult = onSpeechResult
    this.onAudioData = onAudioData
    this.onError = onError
  }

  async initialize(): Promise<void> {
    try {
      // Initialize AudioContext
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000 // Optimal for speech recognition
        }
      })

      // Create audio processor
      const source = this.audioContext.createMediaStreamSource(this.mediaStream)
      this.processor = this.audioContext.createScriptProcessor(1024, 1, 1)
      
      this.processor.onaudioprocess = (event) => {
        if (!this.isRecording) return
        
        const inputData = event.inputBuffer.getChannelData(0)
        const audioData = new Float32Array(inputData)
        
        // Store audio data for processing
        this.audioBuffer.push(audioData)
        
        // Convert to 16-bit PCM
        const pcmData = new Int16Array(audioData.length)
        for (let i = 0; i < audioData.length; i++) {
          pcmData[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768))
        }
        
        // Send audio chunk for processing
        this.onAudioData({
          data: pcmData.buffer,
          timestamp: Date.now()
        })
      }

      source.connect(this.processor)
      this.processor.connect(this.audioContext.destination)

      console.log('Real-time audio processor initialized')
    } catch (error) {
      this.onError(`Failed to initialize audio processor: ${error}`)
      throw error
    }
  }

  startRecording(): void {
    if (!this.audioContext || !this.processor) {
      this.onError('Audio processor not initialized')
      return
    }

    this.isRecording = true
    this.audioBuffer = []
    
    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }

    // Start processing audio chunks for speech recognition
    this.startSpeechProcessing()

    console.log('Real-time recording started')
  }

  private startSpeechProcessing(): void {
    // Process audio every 2 seconds for speech recognition
    this.processingInterval = setInterval(async () => {
      if (this.audioBuffer.length > 0 && this.isRecording) {
        await this.processAudioForSpeech()
      }
    }, 2000)
  }

  private async processAudioForSpeech(): Promise<void> {
    try {
      if (this.audioBuffer.length === 0) return

      // Combine audio buffer into a single buffer
      const totalLength = this.audioBuffer.reduce((acc, chunk) => acc + chunk.length, 0)
      const combinedBuffer = new Float32Array(totalLength)
      
      let offset = 0
      for (const chunk of this.audioBuffer) {
        combinedBuffer.set(chunk, offset)
        offset += chunk.length
      }

      // Convert to 16-bit PCM
      const pcmData = new Int16Array(combinedBuffer.length)
      for (let i = 0; i < combinedBuffer.length; i++) {
        pcmData[i] = Math.max(-32768, Math.min(32767, combinedBuffer[i] * 32768))
      }

      // Create WAV file
      const wavBuffer = this.createWavFile(pcmData.buffer, 16000)
      
      // Send to speech-to-text API
      const transcription = await this.sendToSpeechToTextAPI(wavBuffer)
      
      if (transcription) {
        this.onSpeechResult({
          transcript: transcription,
          isFinal: true,
          confidence: 0.9
        })
      }

      // Clear the buffer after processing
      this.audioBuffer = []

    } catch (error) {
      console.error('Error processing audio for speech:', error)
      this.onError(`Speech processing error: ${error}`)
    }
  }

  private createWavFile(audioBuffer: ArrayBuffer, sampleRate: number): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + audioBuffer.byteLength)
    const view = new DataView(buffer)

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + audioBuffer.byteLength, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, audioBuffer.byteLength, true)

    // Copy audio data
    const audioView = new Uint8Array(audioBuffer)
    for (let i = 0; i < audioView.length; i++) {
      view.setUint8(44 + i, audioView[i])
    }

    return buffer
  }

  private async sendToSpeechToTextAPI(audioBuffer: ArrayBuffer): Promise<string | null> {
    try {
      const blob = new Blob([audioBuffer], { type: 'audio/wav' })
      const formData = new FormData()
      formData.append('audio', blob, 'recording.wav')
      formData.append('urduType', 'roman')

      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        return result.text
      } else {
        throw new Error(result.error || 'Speech recognition failed')
      }

    } catch (error) {
      console.error('Speech-to-text API error:', error)
      return null
    }
  }

  stopRecording(): void {
    this.isRecording = false
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
    
    console.log('Real-time recording stopped')
  }

  async cleanup(): Promise<void> {
    this.isRecording = false
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
    
    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }
    
    if (this.audioContext) {
      await this.audioContext.close()
      this.audioContext = null
    }
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    console.log('Real-time audio processor cleaned up')
  }
}

// Real-time speech recognizer using actual API
export class RealTimeSpeechRecognizer {
  private isListening = false
  private onResult: (result: SpeechRecognitionResult) => void
  private onError: (error: string) => void
  private audioProcessor: RealTimeAudioProcessor | null = null

  constructor(
    onResult: (result: SpeechRecognitionResult) => void,
    onError: (error: string) => void
  ) {
    this.onResult = onResult
    this.onError = onError
  }

  async initialize(): Promise<void> {
    try {
      this.audioProcessor = new RealTimeAudioProcessor(
        (result: SpeechRecognitionResult) => {
          this.onResult(result)
        },
        (audioData: AudioChunk) => {
          // Handle audio data if needed
        },
        (error: string) => {
          this.onError(error)
        }
      )

      await this.audioProcessor.initialize()
      console.log('Real-time speech recognizer initialized')
    } catch (error) {
      this.onError(`Failed to initialize speech recognizer: ${error}`)
      throw error
    }
  }

  start(): void {
    if (!this.audioProcessor) {
      this.onError('Speech recognizer not initialized')
      return
    }

    this.isListening = true
    this.audioProcessor.startRecording()
    console.log('Real-time speech recognition started')
  }

  stop(): void {
    this.isListening = false
    if (this.audioProcessor) {
      this.audioProcessor.stopRecording()
    }
    console.log('Real-time speech recognition stopped')
  }

  async cleanup(): Promise<void> {
    this.isListening = false
    if (this.audioProcessor) {
      await this.audioProcessor.cleanup()
      this.audioProcessor = null
    }
    console.log('Real-time speech recognizer cleaned up')
  }
}

// Real TTS using actual API
export class RealTTS {
  private isPlaying = false
  private audioContext: AudioContext | null = null
  private onPlaybackComplete: () => void

  constructor(onPlaybackComplete: () => void) {
    this.onPlaybackComplete = onPlaybackComplete
  }

  async speak(text: string): Promise<void> {
    if (this.isPlaying) {
      // Stop current playback
      this.stop()
    }

    this.isPlaying = true
    console.log(`TTS speaking: "${text}"`)

    try {
      // Get audio from TTS API
      const audioData = await this.getTTSAudio(text)
      
      if (audioData) {
        await this.playAudio(audioData)
      } else {
        throw new Error('Failed to get TTS audio')
      }

    } catch (error) {
      console.error('TTS error:', error)
      this.isPlaying = false
      this.onPlaybackComplete()
    }
  }

  private async getTTSAudio(text: string): Promise<ArrayBuffer | null> {
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          urduType: 'roman'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success && result.audioBase64) {
        // Convert base64 to ArrayBuffer
        const binaryString = atob(result.audioBase64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        return bytes.buffer
      } else {
        throw new Error(result.error || 'TTS generation failed')
      }

    } catch (error) {
      console.error('TTS API error:', error)
      return null
    }
  }

  private async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Initialize audio context
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        
        // Decode audio data
        this.audioContext.decodeAudioData(audioBuffer, (buffer) => {
          // Create audio source
          const source = this.audioContext!.createBufferSource()
          source.buffer = buffer
          source.connect(this.audioContext!.destination)
          
          // Handle playback completion
          source.onended = () => {
            this.isPlaying = false
            this.onPlaybackComplete()
            console.log('TTS playback completed')
            resolve()
          }
          
          // Start playback
          source.start(0)
          
        }, (error) => {
          console.error('Audio decoding error:', error)
          reject(error)
        })
        
      } catch (error) {
        console.error('Audio playback error:', error)
        reject(error)
      }
    })
  }

  stop(): void {
    this.isPlaying = false
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    console.log('TTS stopped')
  }
}

// Keep the simulated versions for fallback
export class SimulatedSpeechRecognizer {
  private isListening = false
  private onResult: (result: SpeechRecognitionResult) => void
  private onError: (error: string) => void
  private recognitionTimer: NodeJS.Timeout | null = null

  constructor(
    onResult: (result: SpeechRecognitionResult) => void,
    onError: (error: string) => void
  ) {
    this.onResult = onResult
    this.onError = onError
  }

  start(): void {
    this.isListening = true
    console.log('Speech recognition started')
    
    // Simulate partial results
    let transcript = ''
    const phrases = [
      'Aap',
      'Aap kaise',
      'Aap kaise hain?',
      'Aap kaise hain? Main',
      'Aap kaise hain? Main theek',
      'Aap kaise hain? Main theek hoon.'
    ]
    
    let index = 0
    this.recognitionTimer = setInterval(() => {
      if (index < phrases.length && this.isListening) {
        transcript = phrases[index]
        this.onResult({
          transcript,
          isFinal: index === phrases.length - 1,
          confidence: 0.9
        })
        index++
      } else {
        this.stop()
      }
    }, 1000)
  }

  stop(): void {
    this.isListening = false
    if (this.recognitionTimer) {
      clearInterval(this.recognitionTimer)
      this.recognitionTimer = null
    }
    console.log('Speech recognition stopped')
  }
}

// Simulated TTS for demo purposes
export class SimulatedTTS {
  private isPlaying = false
  private audioContext: AudioContext | null = null
  private onPlaybackComplete: () => void

  constructor(onPlaybackComplete: () => void) {
    this.onPlaybackComplete = onPlaybackComplete
  }

  async speak(text: string): Promise<void> {
    if (this.isPlaying) {
      // Stop current playback
      this.stop()
    }

    this.isPlaying = true
    console.log(`TTS speaking: "${text}"`)

    try {
      // Initialize audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Create a simple tone to simulate speech
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)
      
      // Simulate speech with varying frequencies
      oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime)
      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime)
      
      // Create speech-like pattern
      const duration = Math.min(text.length * 0.1, 3) // Duration based on text length
      const now = this.audioContext.currentTime
      
      for (let i = 0; i < text.length; i++) {
        const time = now + (i * duration / text.length)
        const frequency = 150 + Math.sin(i * 0.5) * 100
        oscillator.frequency.setValueAtTime(frequency, time)
      }
      
      oscillator.start(now)
      oscillator.stop(now + duration)
      
      oscillator.onended = () => {
        this.isPlaying = false
        this.onPlaybackComplete()
        console.log('TTS playback completed')
      }
      
    } catch (error) {
      console.error('TTS error:', error)
      this.isPlaying = false
      this.onPlaybackComplete()
    }
  }

  stop(): void {
    this.isPlaying = false
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    console.log('TTS stopped')
  }
}