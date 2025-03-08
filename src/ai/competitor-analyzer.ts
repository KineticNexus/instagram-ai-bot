import { Logger } from '../core/logger';
import { Config } from '../core/config';
import { InstagramAutomation } from '../automation/instagram';
import { BraveSearchClient } from '../api/brave';
import { Repository } from '../database/repository';
import { OpenAIClient } from '../api/openai';

interface CompetitorInsight {
  username: string;
  postFrequency: number;
  avgLikes: number;
  avgComments: number;
  topHashtags: string[];
  contentTypes: {
    images: number;
    carousels: number;
    reels: number;
    stories: number;
  };
  postingTimes: {
    hour: number;
    count: number;
  }[];
  engagement: {
    rate: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
}

interface CompetitorAnalysis {
  insights: CompetitorInsight[];
  recommendations: {
    hashtags: string[];
    postingTimes: number[];
    contentTypes: string[];
    engagementStrategies: string[];
  };
  timestamp: Date;
}

export class CompetitorAnalyzer {
  constructor(
    private logger: Logger,
    private config: Config,
    private instagram: InstagramAutomation,
    private braveSearch: BraveSearchClient,
    private repository: Repository,
    private openai: OpenAIClient
  ) {}

  /**
   * Get latest competitor insights
   */
  async getLatestInsights(): Promise<CompetitorAnalysis> {
    try {
      const competitors = this.config.get('competitors');
      const insights: CompetitorInsight[] = [];
      
      for (const competitor of competitors) {
        const insight = await this.analyzeCompetitor(competitor);
        insights.push(insight);
      }
      
      const analysis = await this.generateAnalysis(insights);
      await this.repository.saveCompetitorAnalysis(analysis);
      
      return analysis;
    } catch (error) {
      this.logger.error('Error getting competitor insights', { error });
      throw error;
    }
  }

  /**
   * Analyze a single competitor
   */
  private async analyzeCompetitor(username: string): Promise<CompetitorInsight> {
    try {
      // Get competitor profile and recent posts
      const profile = await this.instagram.getProfile(username);
      const posts = await this.instagram.getRecentPosts(username, 50);
      
      // Calculate metrics
      const postFrequency = this.calculatePostFrequency(posts);
      const avgLikes = this.calculateAverageLikes(posts);
      const avgComments = this.calculateAverageComments(posts);
      const topHashtags = this.extractTopHashtags(posts);
      const contentTypes = this.analyzeContentTypes(posts);
      const postingTimes = this.analyzePostingTimes(posts);
      const engagement = this.calculateEngagement(posts, profile.followerCount);
      
      return {
        username,
        postFrequency,
        avgLikes,
        avgComments,
        topHashtags,
        contentTypes,
        postingTimes,
        engagement
      };
    } catch (error) {
      this.logger.error('Error analyzing competitor', { error, username });
      throw error;
    }
  }

  /**
   * Calculate post frequency (posts per day)
   */
  private calculatePostFrequency(posts: any[]): number {
    if (posts.length < 2) return 0;
    
    const firstPost = new Date(posts[posts.length - 1].timestamp);
    const lastPost = new Date(posts[0].timestamp);
    const daysDiff = (lastPost.getTime() - firstPost.getTime()) / (1000 * 60 * 60 * 24);
    
    return posts.length / daysDiff;
  }

  /**
   * Calculate average likes per post
   */
  private calculateAverageLikes(posts: any[]): number {
    if (posts.length === 0) return 0;
    const totalLikes = posts.reduce((sum, post) => sum + post.likeCount, 0);
    return totalLikes / posts.length;
  }

  /**
   * Calculate average comments per post
   */
  private calculateAverageComments(posts: any[]): number {
    if (posts.length === 0) return 0;
    const totalComments = posts.reduce((sum, post) => sum + post.commentCount, 0);
    return totalComments / posts.length;
  }

  /**
   * Extract most used hashtags
   */
  private extractTopHashtags(posts: any[]): string[] {
    const hashtagCounts = new Map<string, number>();
    
    posts.forEach(post => {
      post.hashtags.forEach((tag: string) => {
        hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1);
      });
    });
    
    return Array.from(hashtagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  }

  /**
   * Analyze content type distribution
   */
  private analyzeContentTypes(posts: any[]): CompetitorInsight['contentTypes'] {
    return posts.reduce((acc, post) => ({
      images: acc.images + (post.type === 'image' ? 1 : 0),
      carousels: acc.carousels + (post.type === 'carousel' ? 1 : 0),
      reels: acc.reels + (post.type === 'reel' ? 1 : 0),
      stories: acc.stories + (post.type === 'story' ? 1 : 0)
    }), {
      images: 0,
      carousels: 0,
      reels: 0,
      stories: 0
    });
  }

  /**
   * Analyze posting time patterns
   */
  private analyzePostingTimes(posts: any[]): CompetitorInsight['postingTimes'] {
    const hourCounts = new Map<number, number>();
    
    posts.forEach(post => {
      const hour = new Date(post.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });
    
    return Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate engagement rate and trend
   */
  private calculateEngagement(posts: any[], followerCount: number): CompetitorInsight['engagement'] {
    if (posts.length === 0 || !followerCount) {
      return { rate: 0, trend: 'stable' };
    }
    
    const rates = posts.map(post => 
      (post.likeCount + post.commentCount) / followerCount * 100
    );
    
    const rate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    
    // Calculate trend
    const recentRates = rates.slice(0, Math.floor(rates.length / 2));
    const olderRates = rates.slice(Math.floor(rates.length / 2));
    const recentAvg = recentRates.reduce((sum, rate) => sum + rate, 0) / recentRates.length;
    const olderAvg = olderRates.reduce((sum, rate) => sum + rate, 0) / olderRates.length;
    
    let trend: 'increasing' | 'decreasing' | 'stable';
    const difference = recentAvg - olderAvg;
    
    if (difference > 0.5) {
      trend = 'increasing';
    } else if (difference < -0.5) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }
    
    return { rate, trend };
  }

  /**
   * Generate analysis and recommendations
   */
  private async generateAnalysis(insights: CompetitorInsight[]): Promise<CompetitorAnalysis> {
    const prompt = this.buildAnalysisPrompt(insights);
    const response = await this.openai.complete(prompt);
    const recommendations = this.parseRecommendations(response);
    
    return {
      insights,
      recommendations,
      timestamp: new Date()
    };
  }

  /**
   * Build prompt for analysis generation
   */
  private buildAnalysisPrompt(insights: CompetitorInsight[]): string {
    return `Analyze the following competitor data and provide strategic recommendations:

Competitor Insights:
${JSON.stringify(insights, null, 2)}

Please provide recommendations in the following format:
{
  "hashtags": ["recommended", "hashtags", "to", "use"],
  "postingTimes": [best posting hours in 24h format],
  "contentTypes": ["recommended", "content", "types"],
  "engagementStrategies": ["strategy1", "strategy2", ...]
}

Consider:
1. Most effective hashtags across competitors
2. Optimal posting times based on engagement
3. Most successful content types
4. Engagement patterns and trends
5. Growth strategies that are working for competitors`;
  }

  /**
   * Parse AI recommendations
   */
  private parseRecommendations(response: string): CompetitorAnalysis['recommendations'] {
    try {
      return JSON.parse(response);
    } catch (error) {
      this.logger.error('Error parsing recommendations', { error, response });
      throw new Error('Failed to parse competitor analysis recommendations');
    }
  }
}