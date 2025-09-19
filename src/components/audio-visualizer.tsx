'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface AudioVisualizerProps {
  isListening: boolean
  isSpeaking: boolean
  audioLevel?: number
  className?: string
}

export function AudioVisualizer({ isListening, isSpeaking, audioLevel = 0, className }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    const drawVisualization = () => {
      ctx.clearRect(0, 0, width, height)

      if (isListening || isSpeaking) {
        // Create animated bars
        const barCount = 20
        const barWidth = width / barCount
        const spacing = barWidth * 0.2
        const actualBarWidth = barWidth - spacing

        for (let i = 0; i < barCount; i++) {
          // Use audio level if available, otherwise use random animation
          let barHeight
          if (audioLevel > 0) {
            // Use actual audio level with some smoothing
            const baseHeight = isSpeaking ? height * 0.8 : height * 0.6
            const smoothing = Math.sin(Date.now() * 0.01 + i * 0.3) * 0.2 + 0.8
            barHeight = baseHeight * audioLevel * smoothing
          } else {
            // Fallback to random animation
            const baseHeight = isSpeaking ? height * 0.6 : height * 0.3
            const randomFactor = Math.sin(Date.now() * 0.005 + i * 0.5) * 0.5 + 0.5
            barHeight = baseHeight * randomFactor
          }

          // Ensure minimum height for visual appeal
          barHeight = Math.max(barHeight, 5)

          const x = i * barWidth + spacing / 2
          const y = (height - barHeight) / 2

          // Create gradient
          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight)
          
          if (isSpeaking) {
            gradient.addColorStop(0, '#10b981') // Green
            gradient.addColorStop(1, '#059669') // Dark green
          } else {
            gradient.addColorStop(0, '#ef4444') // Red
            gradient.addColorStop(1, '#dc2626') // Dark red
          }

          ctx.fillStyle = gradient
          ctx.fillRect(x, y, actualBarWidth, barHeight)

          // Add rounded corners
          ctx.beginPath()
          ctx.roundRect(x, y, actualBarWidth, barHeight, 4)
          ctx.fill()
        }
      } else {
        // Draw idle state - small pulsing dots
        const dotCount = 5
        const dotSpacing = width / (dotCount + 1)
        const baseRadius = 3
        const pulseFactor = Math.sin(Date.now() * 0.003) * 0.5 + 0.5
        const radius = baseRadius + pulseFactor * 2

        ctx.fillStyle = '#6b7280' // Gray

        for (let i = 0; i < dotCount; i++) {
          const x = dotSpacing * (i + 1)
          const y = height / 2

          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Continue animation
      animationRef.current = requestAnimationFrame(drawVisualization)
    }

    // Start animation
    animationRef.current = requestAnimationFrame(drawVisualization)

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isListening, isSpeaking, audioLevel])

  return (
    <div className={cn("relative", className)}>
      <canvas
        ref={canvasRef}
        width={200}
        height={60}
        className="w-full h-full"
      />
    </div>
  )
}