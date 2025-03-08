import { Logger } from '../core/logger';
import { Config } from '../core/config';
import { OpenAIClient } from '../api/openai';
import { AnthropicClient } from '../api/anthropic';
import { AnalyticsService } from '../services/analytics';
import { CompetitorAnalyzer } from './competitor-analyzer';

interface Decision {
  action: string;
  confidence: number;
  reasoning: string;
  parameters?: Record<string, any>;
}

export class DecisionEngine {
  constructor(
    private openai: OpenAIClient,
    private anthropic: AnthropicClient,
    private logger: Logger,
    private config: Config,
    private analytics: AnalyticsService,
    private competitorAnalyzer: CompetitorAnalyzer
  ) {}

  /**
   * Make a decision about what action to take next
   */
  async decideNextAction(): Promise<Decision> {
    try {
      // Get analytics data
      const analyticsData = await this.analytics.getRecentMetrics();
      
      // Get competitor analysis
      const competitorInsights = await this.competitorAnalyzer.getLatestInsights();
      
      // Combine data for AI analysis
      const context = {
        analytics: analyticsData,
        competitor_insights: competitorInsights,
        current_time: new Date().toISOString(),
        platform_limits: this.config.get('instagram.limits'),
        recent_actions: await this.analytics.getRecentActions()
      };

      // Get decision from primary AI (OpenAI)
      const primaryDecision = await this.getPrimaryDecision(context);
      
      // Get verification from secondary AI (Anthropic)
      const verifiedDecision = await this.verifyDecision(primaryDecision, context);
      
      this.logger.info('Decision made', { decision: verifiedDecision });
      return verifiedDecision;
    } catch (error) {
      this.logger.error('Error in decision making', { error });
      throw error;
    }
  }

  /**
   * Get initial decision from primary AI
   */
  private async getPrimaryDecision(context: any): Promise<Decision> {
    const prompt = this.buildDecisionPrompt(context);
    const response = await this.openai.complete(prompt);
    return this.parseDecision(response);
  }

  /**
   * Verify decision with secondary AI
   */
  private async verifyDecision(decision: Decision, context: any): Promise<Decision> {
    const verificationPrompt = this.buildVerificationPrompt(decision, context);
    const verification = await this.anthropic.complete(verificationPrompt);
    
    if (this.isDecisionVerified(verification)) {
      return decision;
    }
    
    // If not verified, get alternative decision
    return this.getAlternativeDecision(context);
  }

  /**
   * Build prompt for decision making
   */
  private buildDecisionPrompt(context: any): string {
    return `Given the following context about an Instagram account:
    
Analytics:
${JSON.stringify(context.analytics, null, 2)}

Competitor Insights:
${JSON.stringify(context.competitor_insights, null, 2)}

Recent Actions:
${JSON.stringify(context.recent_actions, null, 2)}

Platform Limits:
${JSON.stringify(context.platform_limits, null, 2)}

Current Time: ${context.current_time}

Please analyze this data and recommend the next action to take.
Consider engagement rates, optimal posting times, content performance,
competitor activities, and platform limits.

Provide your response in the following format:
{
  "action": "action_name",
  "confidence": 0.0-1.0,
  "reasoning": "detailed explanation",
  "parameters": {
    // action specific parameters
  }
}`;
  }

  /**
   * Build prompt for decision verification
   */
  private buildVerificationPrompt(decision: Decision, context: any): string {
    return `Please verify the following decision for an Instagram automation system:

Decision:
${JSON.stringify(decision, null, 2)}

Context:
${JSON.stringify(context, null, 2)}

Is this decision:
1. Safe and within platform limits?
2. Likely to be effective based on the data?
3. Well-timed considering recent actions?
4. Aligned with overall strategy?

Please provide a yes/no response with explanation.`;
  }

  /**
   * Parse AI response into decision object
   */
  private parseDecision(response: string): Decision {
    try {
      return JSON.parse(response);
    } catch (error) {
      this.logger.error('Error parsing decision', { error, response });
      throw new Error('Failed to parse AI decision');
    }
  }

  /**
   * Check if decision is verified
   */
  private isDecisionVerified(verification: string): boolean {
    return verification.toLowerCase().includes('yes') &&
           !verification.toLowerCase().includes('no');
  }

  /**
   * Get alternative decision if primary is not verified
   */
  private async getAlternativeDecision(context: any): Promise<Decision> {
    const prompt = this.buildDecisionPrompt(context) + '\n\nPlease provide an alternative, more conservative decision.';
    const response = await this.anthropic.complete(prompt);
    return this.parseDecision(response);
  }
}