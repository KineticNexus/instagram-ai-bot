import OpenAI from 'openai';
import { Logger } from '../core/logger';
import { Config } from '../core/config';

interface CompletionOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

interface ImageGenerationOptions {
  prompt: string;
  n?: number;
  size?: '256x256' | '512x512' | '1024x1024';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
}

interface ImageAnalysisOptions {
  imageUrl: string;
  prompt?: string;
  maxTokens?: number;
}

interface ContentVariationOptions {
  content: string;
  n?: number;
  temperature?: number;
}

interface ContentImprovementOptions {
  content: string;
  feedback: string;
  temperature?: number;
}

export class OpenAIClient {
  private client: OpenAI;

  constructor(
    private logger: Logger,
    private config: Config
  ) {
    this.client = new OpenAI({
      apiKey: this.config.get('openai.apiKey')
    });
  }

  /**
   * Generate text completion
   */
  async complete(options: CompletionOptions): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model || 'gpt-4',
        messages: [{ role: 'user', content: options.prompt }],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7
      });

      const completion = response.choices[0]?.message?.content;
      if (!completion) {
        throw new Error('No completion generated');
      }

      return completion;
    } catch (error) {
      this.logger.error('Failed to generate completion', { error });
      throw error;
    }
  }

  /**
   * Generate image from text prompt
   */
  async generateImage(options: ImageGenerationOptions): Promise<string[]> {
    try {
      const response = await this.client.images.generate({
        prompt: options.prompt,
        n: options.n || 1,
        size: options.size || '1024x1024',
        quality: options.quality || 'standard',
        style: options.style || 'vivid'
      });

      const imageUrls = response.data.map(image => image.url).filter((url): url is string => url !== null);
      if (imageUrls.length === 0) {
        throw new Error('No images generated');
      }

      return imageUrls;
    } catch (error) {
      this.logger.error('Failed to generate image', { error });
      throw error;
    }
  }

  /**
   * Analyze image content and style
   */
  async analyzeImage(options: ImageAnalysisOptions): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: options.prompt || 'Analyze this image in detail.' },
              { type: 'image_url', image_url: { url: options.imageUrl } }
            ]
          }
        ],
        max_tokens: options.maxTokens || 500
      });

      const analysis = response.choices[0]?.message?.content;
      if (!analysis) {
        throw new Error('No analysis generated');
      }

      return analysis;
    } catch (error) {
      this.logger.error('Failed to analyze image', { error });
      throw error;
    }
  }

  /**
   * Generate content variations
   */
  async generateContentVariations(options: ContentVariationOptions): Promise<string[]> {
    try {
      const variations: string[] = [];
      const n = options.n || 3;

      for (let i = 0; i < n; i++) {
        const response = await this.client.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'user',
              content: `Generate a unique variation of the following content, maintaining the same meaning but with different wording and style:\n\n${options.content}`
            }
          ],
          temperature: options.temperature || 0.8
        });

        const variation = response.choices[0]?.message?.content;
        if (variation) {
          variations.push(variation);
        }
      }

      if (variations.length === 0) {
        throw new Error('No variations generated');
      }

      return variations;
    } catch (error) {
      this.logger.error('Failed to generate content variations', { error });
      throw error;
    }
  }

  /**
   * Improve content based on feedback
   */
  async improveContent(options: ContentImprovementOptions): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: `Here is some content:\n\n${options.content}\n\nImprove this content based on the following feedback:\n${options.feedback}`
          }
        ],
        temperature: options.temperature || 0.7
      });

      const improvedContent = response.choices[0]?.message?.content;
      if (!improvedContent) {
        throw new Error('No improved content generated');
      }

      return improvedContent;
    } catch (error) {
      this.logger.error('Failed to improve content', { error });
      throw error;
    }
  }
}