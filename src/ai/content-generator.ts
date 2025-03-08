import { Logger } from '../core/logger';
import { Config } from '../core/config';
import { OpenAIClient } from '../api/openai';
import { AnthropicClient } from '../api/anthropic';
import { BraveSearchClient } from '../api/brave';
import { ImageProcessor } from '../utils/image-processing';

interface ContentRequest {
  type: 'image' | 'carousel' | 'story';
  topic: string;
  style?: string;
  mood?: string;
  hashtags?: string[];
  references?: string[];
}

interface ContentResult {
  mediaUrls: string[];
  caption: string;
  hashtags: string[];
  suggestedTime?: Date;
}

export class ContentGenerator {
  constructor(
    private logger: Logger,
    private config: Config,
    private openai: OpenAIClient,
    private anthropic: AnthropicClient,
    private braveSearch: BraveSearchClient,
    private imageProcessor: ImageProcessor
  ) {}

  /**
   * Generate content based on request
   */
  async generateContent(request: ContentRequest): Promise<ContentResult> {
    try {
      // Generate image prompts
      const imagePrompts = await this.generateImagePrompts(request);

      // Generate images
      const rawImages = await this.generateImages(imagePrompts);

      // Process images
      const processedImages = await this.processImages(rawImages, request.type);

      // Generate caption
      const caption = await this.generateCaption(request, processedImages);

      // Generate or validate hashtags
      const hashtags = await this.generateHashtags(request, caption);

      // Determine optimal posting time
      const suggestedTime = await this.determineSuggestedTime(request);

      return {
        mediaUrls: processedImages,
        caption,
        hashtags,
        suggestedTime
      };
    } catch (error) {
      this.logger.error('Failed to generate content', { error });
      throw error;
    }
  }

  /**
   * Generate image prompts based on request
   */
  private async generateImagePrompts(request: ContentRequest): Promise<string[]> {
    try {
      const prompt = `Generate creative and detailed image prompts for Instagram ${request.type} content about ${request.topic}.
        Style: ${request.style || 'modern and professional'}
        Mood: ${request.mood || 'positive and engaging'}
        
        Consider:
        1. Visual appeal and composition
        2. Instagram aesthetic trends
        3. Brand consistency
        4. Target audience preferences
        
        Generate 3 different prompts.`;

      const response = await this.openai.complete({ prompt });
      return response.split('\n').filter(Boolean);
    } catch (error) {
      this.logger.error('Failed to generate image prompts', { error });
      throw error;
    }
  }

  /**
   * Generate images from prompts
   */
  private async generateImages(prompts: string[]): Promise<string[]> {
    try {
      const images: string[] = [];

      for (const prompt of prompts) {
        const imageUrls = await this.openai.generateImage({
          prompt,
          n: 1,
          size: '1024x1024',
          quality: 'hd',
          style: 'vivid'
        });

        images.push(...imageUrls);
      }

      return images;
    } catch (error) {
      this.logger.error('Failed to generate images', { error });
      throw error;
    }
  }

  /**
   * Process images based on content type
   */
  private async processImages(images: string[], type: string): Promise<string[]> {
    try {
      const processedImages: string[] = [];

      for (const imageUrl of images) {
        let processedUrl: string;

        switch (type) {
          case 'image':
            processedUrl = await this.imageProcessor.optimizeForInstagram(imageUrl);
            break;
          case 'carousel':
            processedUrl = await this.imageProcessor.optimizeForInstagram(imageUrl);
            break;
          case 'story':
            processedUrl = await this.imageProcessor.optimizeForInstagramStory(imageUrl);
            break;
          default:
            throw new Error(`Invalid content type: ${type}`);
        }

        processedImages.push(processedUrl);
      }

      return processedImages;
    } catch (error) {
      this.logger.error('Failed to process images', { error });
      throw error;
    }
  }

  /**
   * Generate caption for content
   */
  private async generateCaption(request: ContentRequest, images: string[]): Promise<string> {
    try {
      // Analyze images
      const imageAnalyses = await Promise.all(
        images.map(imageUrl => this.openai.analyzeImage({ imageUrl }))
      );

      const prompt = `Generate an engaging Instagram caption for content about ${request.topic}.
        
        Image Descriptions:
        ${imageAnalyses.join('\n')}
        
        Style: ${request.style || 'modern and professional'}
        Mood: ${request.mood || 'positive and engaging'}
        
        Consider:
        1. Target audience engagement
        2. Brand voice consistency
        3. Call to action
        4. Emoji usage
        5. Length (optimal for Instagram)
        
        References:
        ${request.references ? request.references.join('\n') : 'None provided'}`;

      const caption = await this.openai.complete({ prompt });
      return caption;
    } catch (error) {
      this.logger.error('Failed to generate caption', { error });
      throw error;
    }
  }

  /**
   * Generate or validate hashtags
   */
  private async generateHashtags(request: ContentRequest, caption: string): Promise<string[]> {
    try {
      if (request.hashtags && request.hashtags.length > 0) {
        // Validate provided hashtags
        return this.validateHashtags(request.hashtags);
      }

      const prompt = `Generate relevant Instagram hashtags for content about ${request.topic}.
        
        Caption:
        ${caption}
        
        Consider:
        1. Mix of popular and niche hashtags
        2. Relevance to content and topic
        3. Target audience reach
        4. Instagram's hashtag limits
        5. Trending hashtags in the niche
        
        Generate 15-20 hashtags.`;

      const response = await this.openai.complete({ prompt });
      const hashtags = response.match(/#[\w\d]+/g) || [];
      return this.validateHashtags(hashtags);
    } catch (error) {
      this.logger.error('Failed to generate hashtags', { error });
      throw error;
    }
  }

  /**
   * Validate hashtags
   */
  private async validateHashtags(hashtags: string[]): Promise<string[]> {
    try {
      const validatedHashtags: string[] = [];

      for (const hashtag of hashtags) {
        // Check if hashtag is banned or flagged
        const searchResults = await this.braveSearch.search(`instagram ${hashtag} banned OR flagged`);
        const isFlagged = searchResults.some(result =>
          result.title.toLowerCase().includes('banned') ||
          result.description.toLowerCase().includes('banned')
        );

        if (!isFlagged) {
          validatedHashtags.push(hashtag);
        }
      }

      return validatedHashtags;
    } catch (error) {
      this.logger.error('Failed to validate hashtags', { error });
      throw error;
    }
  }

  /**
   * Determine suggested posting time
   */
  private async determineSuggestedTime(request: ContentRequest): Promise<Date> {
    try {
      const now = new Date();
      const optimalHours = this.config.get('instagram.optimalPostingHours') as number[];
      
      // Find next optimal hour
      const currentHour = now.getHours();
      const nextOptimalHour = optimalHours.find(hour => hour > currentHour) || optimalHours[0];
      
      const suggestedTime = new Date(now);
      suggestedTime.setHours(nextOptimalHour, 0, 0, 0);
      
      // If the time is in the past, add a day
      if (suggestedTime < now) {
        suggestedTime.setDate(suggestedTime.getDate() + 1);
      }
      
      return suggestedTime;
    } catch (error) {
      this.logger.error('Failed to determine suggested time', { error });
      throw error;
    }
  }
}