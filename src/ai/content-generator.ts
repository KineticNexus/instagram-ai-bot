import { Logger } from '../core/logger';
import { Config } from '../core/config';
import { OpenAIClient } from '../api/openai';
import { ImageProcessor } from '../utils/image-processing';
import { Repository } from '../database/repository';

interface ContentPlan {
  caption: string;
  hashtags: string[];
  imagePrompt?: string;
  schedule: Date;
  type: 'image' | 'carousel' | 'reel' | 'story';
}

interface GeneratedContent {
  caption: string;
  hashtags: string[];
  mediaUrls: string[];
  schedule: Date;
  type: 'image' | 'carousel' | 'reel' | 'story';
}

export class ContentGenerator {
  constructor(
    private openai: OpenAIClient,
    private logger: Logger,
    private config: Config,
    private imageProcessor: ImageProcessor,
    private repository: Repository
  ) {}

  /**
   * Generate content based on strategy and analytics
   */
  async generateContent(): Promise<GeneratedContent> {
    try {
      // Get content plan
      const plan = await this.createContentPlan();
      
      // Generate media content
      const mediaUrls = await this.generateMedia(plan);
      
      // Store content in repository
      const content: GeneratedContent = {
        caption: plan.caption,
        hashtags: plan.hashtags,
        mediaUrls,
        schedule: plan.schedule,
        type: plan.type
      };
      
      await this.repository.saveContent(content);
      
      this.logger.info('Content generated successfully', {
        type: content.type,
        schedule: content.schedule
      });
      
      return content;
    } catch (error) {
      this.logger.error('Error generating content', { error });
      throw error;
    }
  }

  /**
   * Create a content plan based on strategy and analytics
   */
  private async createContentPlan(): Promise<ContentPlan> {
    const prompt = await this.buildContentPlanPrompt();
    const response = await this.openai.complete(prompt);
    return this.parseContentPlan(response);
  }

  /**
   * Build prompt for content plan generation
   */
  private async buildContentPlanPrompt(): Promise<string> {
    const recentContent = await this.repository.getRecentContent(10);
    const analytics = await this.repository.getContentAnalytics();
    
    return `Please create an engaging Instagram content plan based on the following data:

Recent Content:
${JSON.stringify(recentContent, null, 2)}

Content Performance:
${JSON.stringify(analytics, null, 2)}

Account Niche: ${this.config.get('content.niche')}
Target Audience: ${this.config.get('content.targetAudience')}
Brand Voice: ${this.config.get('content.brandVoice')}

Create a content plan that:
1. Is unique from recent content
2. Aligns with high-performing content patterns
3. Matches brand voice and style
4. Includes relevant hashtags
5. Follows platform best practices

Provide your response in the following format:
{
  "caption": "engaging caption text",
  "hashtags": ["hashtag1", "hashtag2", ...],
  "imagePrompt": "detailed image generation prompt",
  "schedule": "ISO date string",
  "type": "image|carousel|reel|story"
}`;
  }

  /**
   * Parse AI response into content plan
   */
  private parseContentPlan(response: string): ContentPlan {
    try {
      const plan = JSON.parse(response);
      plan.schedule = new Date(plan.schedule);
      return plan;
    } catch (error) {
      this.logger.error('Error parsing content plan', { error, response });
      throw new Error('Failed to parse content plan');
    }
  }

  /**
   * Generate media content based on plan
   */
  private async generateMedia(plan: ContentPlan): Promise<string[]> {
    if (!plan.imagePrompt) {
      throw new Error('Image prompt is required');
    }

    try {
      switch (plan.type) {
        case 'image':
          return [await this.generateSingleImage(plan.imagePrompt)];
          
        case 'carousel':
          return await this.generateCarouselImages(plan.imagePrompt);
          
        case 'reel':
          return [await this.generateVideo(plan.imagePrompt)];
          
        case 'story':
          return [await this.generateStoryImage(plan.imagePrompt)];
          
        default:
          throw new Error(`Unsupported content type: ${plan.type}`);
      }
    } catch (error) {
      this.logger.error('Error generating media', { error, type: plan.type });
      throw error;
    }
  }

  /**
   * Generate a single image
   */
  private async generateSingleImage(prompt: string): Promise<string> {
    const image = await this.openai.generateImage(prompt);
    const processed = await this.imageProcessor.optimizeForInstagram(image);
    return await this.imageProcessor.saveImage(processed);
  }

  /**
   * Generate multiple images for a carousel
   */
  private async generateCarouselImages(basePrompt: string): Promise<string[]> {
    const count = Math.min(10, this.config.get('content.carouselImageCount'));
    const promises = Array(count).fill(0).map((_, i) => {
      const prompt = `${basePrompt} (Part ${i + 1} of ${count})`;
      return this.generateSingleImage(prompt);
    });
    
    return await Promise.all(promises);
  }

  /**
   * Generate a video
   */
  private async generateVideo(prompt: string): Promise<string> {
    throw new Error('Video generation not yet implemented');
  }

  /**
   * Generate a story image
   */
  private async generateStoryImage(prompt: string): Promise<string> {
    const image = await this.openai.generateImage(prompt);
    const processed = await this.imageProcessor.optimizeForInstagramStory(image);
    return await this.imageProcessor.saveImage(processed);
  }
}