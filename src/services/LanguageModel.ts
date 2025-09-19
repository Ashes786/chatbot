import { Message } from '@/types/conversation';

export class LanguageModel {
  private conversationHistory: Message[] = [];

  async processUrduText(userInput: string): Promise<string> {
    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userInput,
        timestamp: new Date()
      });

      // Get response from API
      const response = await this.callChatAPI(userInput);
      
      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: response,
        timestamp: new Date()
      });

      return response;
    } catch (error) {
      console.error('Error processing Urdu text:', error);
      return this.generateFallbackResponse(userInput);
    }
  }

  private async callChatAPI(message: string): Promise<string> {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationHistory: this.conversationHistory.slice(-6) // Send last 3 exchanges
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'API returned error');
      }

      return data.response;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  private generateFallbackResponse(input: string): string {
    const lowerInput = input.toLowerCase();

    // Common greetings
    if (this.containsAny(lowerInput, ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'])) {
      const greetings = [
        'Hello! How can I help you today?',
        'Hi there! What can I do for you?',
        'Hey! Nice to meet you. How are you?'
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    // Name/identity questions
    if (this.containsAny(lowerInput, ['name', 'who are you', 'what are you'])) {
      return 'I\'m an AI assistant. I\'m here to help you with questions and have conversations. What would you like to talk about?';
    }

    // How are you
    if (this.containsAny(lowerInput, ['how are you', 'how are you doing', 'how do you do'])) {
      const responses = [
        'I\'m doing great, thanks for asking! How about you?',
        'I\'m functioning perfectly! How are you feeling today?',
        'I\'m good! I hope you\'re having a great day too.'
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Thank you
    if (this.containsAny(lowerInput, ['thank you', 'thanks', 'appreciate it'])) {
      const responses = [
        'You\'re welcome! Is there anything else I can help with?',
        'No problem at all! Happy to help.',
        'My pleasure! Let me know if you need anything else.'
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Goodbye
    if (this.containsAny(lowerInput, ['goodbye', 'bye', 'see you', 'take care'])) {
      const responses = [
        'Goodbye! It was nice talking with you.',
        'See you later! Have a great day!',
        'Take care! Feel free to come back anytime.'
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Default response
    return 'That\'s interesting! Tell me more about that.';
  }

  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  getConversationHistory(): Message[] {
    return [...this.conversationHistory];
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }
}

export default LanguageModel;