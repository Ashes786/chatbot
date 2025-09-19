import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Initialize ZAI
    const zai = await ZAI.create()

    // Create conversation context
    const context = conversationHistory 
      ? conversationHistory.map((msg: any) => 
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n')
      : ''

    const systemPrompt = `You are a helpful English AI assistant. You are having a conversation with a user who speaks English. 
Respond naturally in English, be friendly and helpful. Keep your responses conversational and not too long.

${context ? `Recent conversation:\n${context}` : ''}

User: ${message}
Assistant:`

    // Get response from LLM
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful English AI assistant. Respond naturally in English. Be conversational, friendly, and helpful. Keep responses concise but meaningful.'
        },
        {
          role: 'user',
          content: systemPrompt
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    })

    const response = completion.choices[0]?.message?.content || 
      'Sorry, I\'m having trouble responding right now. Could you please try again?'

    return NextResponse.json({ 
      response: response.trim(),
      success: true 
    })

  } catch (error) {
    console.error('Chat API Error:', error)
    return NextResponse.json({ 
      error: 'Failed to process your message',
      success: false 
    }, { status: 500 })
  }
}