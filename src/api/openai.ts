import OpenAI from 'openai';
import { Logger } from '../core/logger';

export class OpenAIClient {
  private client: OpenAI;

  constructor(
    private logger: Logger,
    apiKey: string
  ) {
    this.client = new OpenAI({
      apiKey: apiKey
    });
  }

  /**
   * Generate text completion
   */
  async complete(prompt: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const completion = response.choices[0]?.message?.content;
      if (!completion) {
        throw new Error('No completion generated');
      }

      return completion;
    } catch (error) {
      this.logger.error('Text generation failed', { error });
      throw new Error(`Failed to generate text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate image from text prompt
   */
  async generateImage(prompt: string): Promise<string[]> {
    try {
      const response = await this.client.images.generate({
        prompt: prompt,
        n: 1,
        size: '1024x1024'
      });

      const urls = response.data.map(item => item.url || '').filter(url => url);
      
      if (urls.length === 0) {
        throw new Error('No images generated');
      }

      return urls;
    } catch (error) {
      this.logger.error('Image generation failed', { error });
      throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze image content
   */
  async analyzeImage(imageUrl: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this image and describe its content, style, and potential engagement factors.' },
              { type: 'image_url', image_url: imageUrl }
            ]
          }
        ],
        max_tokens: 500
      });

      const analysis = response.choices[0]?.message?.content;
      if (!analysis) {
        throw new Error('No analysis generated');
      }

      return analysis;
    } catch (error) {
      this.logger.error('Image analysis failed', { error });
      throw new Error(`Failed to analyze image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate content variations
   */
  async generateContentVariations(content: string, count: number = 3): Promise<string[]> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: `Generate ${count} unique variations of the following content, maintaining the same message but with different wording and style:\n\n${content}`
          }
        ],
        temperature: 0.8,
        max_tokens: 2000,
        n: count
      });

      const variations = response.choices.map(choice => choice.message?.content || '').filter(Boolean);
      
      if (variations.length === 0) {
        throw new Error('No variations generated');
      }

      return variations;
    } catch (error) {
      this.logger.error('Content variation generation failed', { error });
      throw new Error(`Failed to generate content variations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Improve content based on feedback
   */
  async improveContent(content: string, feedback: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: `Improve the following content based on this feedback:\n\nContent:\n${content}\n\nFeedback:\n${feedback}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const improvedContent = response.choices[0]?.message?.content;
      if (!improvedContent) {
        throw new Error('No improved content generated');
      }

      return improvedContent;
    } catch (error) {
      this.logger.error('Content improvement failed', { error });
      throw new Error(`Failed to improve content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}