import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '../core/logger';

export class AnthropicClient {
  private client: Anthropic;

  constructor(
    private logger: Logger,
    apiKey: string
  ) {
    this.client = new Anthropic({
      apiKey: apiKey
    });
  }

  /**
   * Generate text completion
   */
  async complete(prompt: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const completion = response.content[0]?.text;
      if (!completion) {
        throw new Error('No completion generated');
      }

      return completion;
    } catch (error) {
      this.logger.error('Text generation failed', { error });
      throw new Error(`Failed to generate text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}