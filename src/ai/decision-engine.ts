import { Logger } from '../core/logger';
import { Config } from '../core/config';
import { OpenAIClient } from '../api/openai';
import { AnthropicClient } from '../api/anthropic';
import { BraveSearchClient } from '../api/brave';
import { AnalyticsService } from '../services/analytics';

interface Decision {
  action: 'post' | 'like' | 'comment' | 'follow' | 'unfollow';
  target?: string;
  content?: string;
  reason: string;
  confidence: number;
}

interface ActionHistory {
  action: string;
  target: string;
  timestamp: Date;
  success: boolean;
}

export class DecisionEngine {
  private actionHistory: ActionHistory[] = [];

  constructor(
    private logger: Logger,
    private config: Config,
    private openai: OpenAIClient,
    private anthropic: AnthropicClient,
    private braveSearch: BraveSearchClient,
    private analytics: AnalyticsService
  ) {}

  /**
   * Make a decision about the next action to take
   */
  async decideNextAction(): Promise<Decision> {
    try {
      // Get recent metrics and actions
      const recentMetrics = await this.analytics.getRecentMetrics();
      const recentActions = await this.analytics.getRecentActions();

      // Analyze current state and history
      const stateAnalysis = await this.analyzeCurrentState(recentMetrics, recentActions);

      // Generate decision options
      const options = await this.generateDecisionOptions(stateAnalysis);

      // Evaluate options and select best one
      const decision = await this.evaluateOptions(options);

      this.logger.info('Decision made', { decision });
      return decision;
    } catch (error) {
      this.logger.error('Failed to make decision', { error });
      throw error;
    }
  }

  /**
   * Analyze current state and history
   */
  private async analyzeCurrentState(metrics: any, actions: any[]): Promise<string> {
    try {
      const prompt = `Analyze the current state of the Instagram bot based on these metrics and recent actions:
        Metrics: ${JSON.stringify(metrics)}
        Recent Actions: ${JSON.stringify(actions)}
        
        Consider:
        1. Performance trends
        2. Action distribution
        3. Success rates
        4. Engagement patterns
        5. Time patterns
        
        Provide a concise analysis.`;

      const analysis = await this.openai.complete({ prompt });
      return analysis;
    } catch (error) {
      this.logger.error('Failed to analyze current state', { error });
      throw error;
    }
  }

  /**
   * Generate possible decision options
   */
  private async generateDecisionOptions(stateAnalysis: string): Promise<Decision[]> {
    try {
      const prompt = `Based on this analysis of the current state:
        ${stateAnalysis}
        
        Generate 3-5 possible actions the bot could take next. Consider:
        1. Time of day and optimal posting times
        2. Recent engagement patterns
        3. Content performance history
        4. Target audience behavior
        
        For each option, provide:
        - Action type (post/like/comment/follow/unfollow)
        - Target (if applicable)
        - Content (if applicable)
        - Reasoning
        - Confidence score (0-1)`;

      const response = await this.openai.complete({ prompt });
      return JSON.parse(response) as Decision[];
    } catch (error) {
      this.logger.error('Failed to generate decision options', { error });
      throw error;
    }
  }

  /**
   * Evaluate options and select the best one
   */
  private async evaluateOptions(options: Decision[]): Promise<Decision> {
    try {
      // Sort by confidence
      const sortedOptions = [...options].sort((a, b) => b.confidence - a.confidence);

      // Get top option
      const bestOption = sortedOptions[0];

      // Validate decision
      const isValid = await this.validateDecision(bestOption);
      if (!isValid) {
        throw new Error('Best option failed validation');
      }

      return bestOption;
    } catch (error) {
      this.logger.error('Failed to evaluate options', { error });
      throw error;
    }
  }

  /**
   * Validate a decision
   */
  private async validateDecision(decision: Decision): Promise<boolean> {
    try {
      // Check if similar action was taken recently
      const recentSimilarAction = this.actionHistory.find(action => 
        action.action === decision.action &&
        action.target === decision.target &&
        action.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
      );

      if (recentSimilarAction) {
        return false;
      }

      // Validate based on action type
      switch (decision.action) {
        case 'post':
          return await this.validatePostDecision(decision);
        case 'like':
        case 'comment':
          return await this.validateEngagementDecision(decision);
        case 'follow':
        case 'unfollow':
          return await this.validateFollowDecision(decision);
        default:
          return false;
      }
    } catch (error) {
      this.logger.error('Failed to validate decision', { error });
      return false;
    }
  }

  /**
   * Validate a post decision
   */
  private async validatePostDecision(decision: Decision): Promise<boolean> {
    if (!decision.content) {
      return false;
    }

    try {
      // Check content quality
      const contentAnalysis = await this.openai.analyzeImage({
        imageUrl: decision.content,
        prompt: 'Analyze this content for quality and appropriateness for Instagram.'
      });

      // Check optimal posting time
      const currentHour = new Date().getHours();
      const optimalHours = this.config.get('instagram.optimalPostingHours') as number[];
      const isOptimalTime = optimalHours.includes(currentHour);

      return contentAnalysis.includes('high quality') && isOptimalTime;
    } catch (error) {
      this.logger.error('Failed to validate post decision', { error });
      return false;
    }
  }

  /**
   * Validate an engagement decision
   */
  private async validateEngagementDecision(decision: Decision): Promise<boolean> {
    if (!decision.target) {
      return false;
    }

    try {
      // Check if target content is appropriate
      const searchResults = await this.braveSearch.search(decision.target);
      const hasSensitiveContent = searchResults.some(result => 
        result.title.toLowerCase().includes('sensitive') ||
        result.description.toLowerCase().includes('sensitive')
      );

      return !hasSensitiveContent;
    } catch (error) {
      this.logger.error('Failed to validate engagement decision', { error });
      return false;
    }
  }

  /**
   * Validate a follow/unfollow decision
   */
  private async validateFollowDecision(decision: Decision): Promise<boolean> {
    if (!decision.target) {
      return false;
    }

    try {
      // Check daily follow/unfollow limits
      const todayActions = this.actionHistory.filter(action => 
        (action.action === 'follow' || action.action === 'unfollow') &&
        action.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );

      const dailyLimit = this.config.get('instagram.limits.dailyFollows');
      if (todayActions.length >= dailyLimit) {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to validate follow decision', { error });
      return false;
    }
  }

  /**
   * Record an action in history
   */
  recordAction(action: string, target: string, success: boolean): void {
    this.actionHistory.push({
      action,
      target,
      timestamp: new Date(),
      success
    });

    // Trim history to last 1000 actions
    if (this.actionHistory.length > 1000) {
      this.actionHistory = this.actionHistory.slice(-1000);
    }
  }
}