import { Logger } from '../core/logger';
import { Config } from '../core/config';
import { OpenAIClient } from '../api/openai';
import { BraveSearchClient } from '../api/brave';
import { InstagramAutomation } from '../automation/instagram';

interface CompetitorProfile {
  username: string;
  fullName: string;
  bio: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  engagementRate: number;
  topHashtags: string[];
  postFrequency: number;
  bestPerformingContent: any[];
}

interface ContentAnalysis {
  type: string;
  caption: string;
  hashtags: string[];
  likes: number;
  comments: number;
  engagement: number;
  postedAt: Date;
  mediaUrls: string[];
  insights: string[];
}

interface CompetitorInsights {
  profile: CompetitorProfile;
  contentAnalysis: ContentAnalysis[];
  recommendations: string[];
  trends: {
    hashtags: string[];
    topics: string[];
    styles: string[];
    timing: { [key: string]: number };
  };
}

interface Post {
  id: string;
  type: string;
  caption: string;
  hashtags: string[];
  likeCount: number;
  commentCount: number;
  timestamp: string;
  url: string;
  mediaUrls: string[];
}

export class CompetitorAnalyzer {
  constructor(
    private logger: Logger,
    private config: Config,
    private openai: OpenAIClient,
    private braveSearch: BraveSearchClient,
    private instagram: InstagramAutomation
  ) {}

  /**
   * Analyze competitors
   */
  async analyzeCompetitors(competitors: string[]): Promise<CompetitorInsights[]> {
    try {
      const insights: CompetitorInsights[] = [];

      for (const username of competitors) {
        this.logger.info('Analyzing competitor', { username });

        // Get profile data
        const profile = await this.analyzeProfile(username);

        // Get recent posts
        const posts = await this.instagram.getRecentPosts(username, 20);

        // Analyze content
        const contentAnalysis = await this.analyzeContent(posts);

        // Generate recommendations
        const recommendations = await this.generateRecommendations(profile, contentAnalysis);

        // Identify trends
        const trends = await this.identifyTrends(contentAnalysis);

        insights.push({
          profile,
          contentAnalysis,
          recommendations,
          trends
        });
      }

      return insights;
    } catch (error) {
      this.logger.error('Failed to analyze competitors', { error });
      throw new Error('Failed to analyze competitors');
    }
  }

  /**
   * Analyze competitor profile
   */
  private async analyzeProfile(username: string): Promise<CompetitorProfile> {
    try {
      // Get profile data from Instagram
      const profileData = await this.instagram.getProfile(username);

      // Calculate engagement rate
      const engagementRate = await this.calculateEngagementRate(username);

      // Get top hashtags
      const topHashtags = await this.getTopHashtags(username);

      // Calculate post frequency
      const postFrequency = await this.calculatePostFrequency(username);

      // Get best performing content
      const bestPerformingContent = await this.getBestPerformingContent(username);

      return {
        username: profileData.username,
        fullName: profileData.fullName,
        bio: profileData.bio,
        followerCount: profileData.followerCount,
        followingCount: profileData.followingCount,
        postCount: profileData.postCount,
        engagementRate,
        topHashtags,
        postFrequency,
        bestPerformingContent
      };
    } catch (error) {
      this.logger.error('Failed to analyze profile', { error });
      throw new Error('Failed to analyze profile');
    }
  }

  /**
   * Calculate engagement rate
   */
  private async calculateEngagementRate(username: string): Promise<number> {
    try {
      const posts = await this.instagram.getRecentPosts(username, 10);
      
      const totalEngagement = posts.reduce((sum, post) => {
        return sum + post.likeCount + post.commentCount;
      }, 0);

      const profile = await this.instagram.getProfile(username);
      const followerCount = profile.followerCount || 1; // Avoid division by zero

      return (totalEngagement / (posts.length * followerCount)) * 100;
    } catch (error) {
      this.logger.error('Failed to calculate engagement rate', { error });
      return 0;
    }
  }

  /**
   * Get top hashtags
   */
  private async getTopHashtags(username: string): Promise<string[]> {
    try {
      const posts = await this.instagram.getRecentPosts(username, 50);
      
      const hashtagCounts = new Map<string, number>();
      
      posts.forEach(post => {
        post.hashtags.forEach(hashtag => {
          hashtagCounts.set(hashtag, (hashtagCounts.get(hashtag) || 0) + 1);
        });
      });

      return Array.from(hashtagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([hashtag]) => hashtag);
    } catch (error) {
      this.logger.error('Failed to get top hashtags', { error });
      return [];
    }
  }

  /**
   * Calculate post frequency
   */
  private async calculatePostFrequency(username: string): Promise<number> {
    try {
      const posts = await this.instagram.getRecentPosts(username, 20);
      
      if (posts.length < 2) {
        return 0;
      }

      const timestamps = posts.map(post => new Date(post.timestamp).getTime());
      const timeDiffs: number[] = [];

      for (let i = 1; i < timestamps.length; i++) {
        timeDiffs.push(timestamps[i - 1] - timestamps[i]);
      }

      const averageTimeDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
      return Math.round(averageTimeDiff / (1000 * 60 * 60 * 24)); // Convert to days
    } catch (error) {
      this.logger.error('Failed to calculate post frequency', { error });
      return 0;
    }
  }

  /**
   * Get best performing content
   */
  private async getBestPerformingContent(username: string): Promise<any[]> {
    try {
      const posts = await this.instagram.getRecentPosts(username, 50);
      
      return posts
        .sort((a, b) => (b.likeCount + b.commentCount) - (a.likeCount + a.commentCount))
        .slice(0, 5);
    } catch (error) {
      this.logger.error('Failed to get best performing content', { error });
      return [];
    }
  }

  /**
   * Analyze content
   */
  private async analyzeContent(posts: Post[]): Promise<ContentAnalysis[]> {
    try {
      const analyses: ContentAnalysis[] = [];

      for (const post of posts) {
        // Analyze images, handling possible urls
        const urls = Array.isArray(post.mediaUrls) ? post.mediaUrls : [post.url].filter(Boolean);
        
        const imageAnalysesPromises = urls.map(url => 
          this.openai.analyzeImage({ imageUrl: url }).catch(() => 'Image analysis failed')
        );
        
        const imageAnalyses = await Promise.all(imageAnalysesPromises);

        // Generate insights
        const insights = await this.generateContentInsights(post, imageAnalyses);

        analyses.push({
          type: post.type,
          caption: post.caption,
          hashtags: post.hashtags,
          likes: post.likeCount,
          comments: post.commentCount,
          engagement: post.likeCount + post.commentCount,
          postedAt: new Date(post.timestamp),
          mediaUrls: urls,
          insights
        });
      }

      return analyses;
    } catch (error) {
      this.logger.error('Failed to analyze content', { error });
      throw new Error('Failed to analyze content');
    }
  }

  /**
   * Generate content insights
   */
  private async generateContentInsights(post: any, imageAnalyses: string[]): Promise<string[]> {
    try {
      const prompt = `Analyze this Instagram post and provide key insights:
        
        Post Type: ${post.type}
        Caption: ${post.caption}
        Hashtags: ${post.hashtags.join(', ')}
        Engagement: ${post.likeCount} likes, ${post.commentCount} comments
        
        Image Analyses:
        ${imageAnalyses.join('\n')}
        
        Provide insights about:
        1. Content quality and style
        2. Caption effectiveness
        3. Hashtag strategy
        4. Timing and engagement
        5. Areas for improvement`;

      const response = await this.openai.complete({ prompt });
      return response.split('\n').filter(Boolean);
    } catch (error) {
      this.logger.error('Failed to generate content insights', { error });
      return ['Could not generate insights due to error'];
    }
  }

  /**
   * Generate recommendations
   */
  private async generateRecommendations(profile: CompetitorProfile, analyses: ContentAnalysis[]): Promise<string[]> {
    try {
      // Simplify analyses to avoid token limits
      const simplifiedAnalyses = analyses.map(a => ({
        type: a.type,
        engagement: a.engagement,
        hashtags: a.hashtags.slice(0, 5),
        postedAt: a.postedAt.toISOString(),
        keyInsights: a.insights.slice(0, 3)
      }));

      const prompt = `Based on this competitor analysis, generate strategic recommendations:
        
        Profile:
        - Username: ${profile.username}
        - Followers: ${profile.followerCount}
        - Engagement Rate: ${profile.engagementRate.toFixed(2)}%
        - Post Frequency: Every ${profile.postFrequency} days
        - Top Hashtags: ${profile.topHashtags.join(', ')}
        
        Content Analysis Summary:
        ${JSON.stringify(simplifiedAnalyses.slice(0, 5))}
        
        Consider:
        1. Content strategy improvements
        2. Engagement optimization
        3. Hashtag strategy
        4. Posting schedule
        5. Growth opportunities
        
        Provide specific, actionable recommendations.`;

      const response = await this.openai.complete({ prompt });
      return response.split('\n').filter(Boolean);
    } catch (error) {
      this.logger.error('Failed to generate recommendations', { error });
      return ['Could not generate recommendations due to error'];
    }
  }

  /**
   * Identify trends
   */
  private async identifyTrends(analyses: ContentAnalysis[]): Promise<any> {
    try {
      // Collect hashtags
      const hashtags = new Map<string, number>();
      analyses.forEach(analysis => {
        analysis.hashtags.forEach(hashtag => {
          hashtags.set(hashtag, (hashtags.get(hashtag) || 0) + 1);
        });
      });

      // Analyze topics and styles
      const topics = new Set<string>();
      const styles = new Set<string>();
      analyses.forEach(analysis => {
        analysis.insights.forEach(insight => {
          if (insight.toLowerCase().includes('topic:')) {
            topics.add(insight.split(':')[1]?.trim() || '');
          }
          if (insight.toLowerCase().includes('style:')) {
            styles.add(insight.split(':')[1]?.trim() || '');
          }
        });
      });

      // Analyze posting times
      const timing: { [key: string]: number } = {};
      analyses.forEach(analysis => {
        const hour = analysis.postedAt.getHours();
        timing[hour] = (timing[hour] || 0) + 1;
      });

      return {
        hashtags: Array.from(hashtags.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([hashtag]) => hashtag),
        topics: Array.from(topics).filter(Boolean),
        styles: Array.from(styles).filter(Boolean),
        timing
      };
    } catch (error) {
      this.logger.error('Failed to identify trends', { error });
      return {
        hashtags: [],
        topics: [],
        styles: [],
        timing: {}
      };
    }
  }
}