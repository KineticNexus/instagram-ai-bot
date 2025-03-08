import { Logger } from '../core/logger';
import { Database } from '../core/database';

interface Metrics {
  posts: {
    total: number;
    lastWeek: number;
    engagement: number;
  };
  followers: {
    total: number;
    growth: number;
    gained: number;
    lost: number;
  };
  engagement: {
    likes: {
      received: number;
      given: number;
    };
    comments: {
      received: number;
      given: number;
    };
  };
}

interface Action {
  id: string;
  type: 'post' | 'like' | 'comment' | 'follow' | 'unfollow';
  target: string;
  timestamp: Date;
  status: 'success' | 'failed';
  details?: any;
}

export class AnalyticsService {
  constructor(
    private logger: Logger,
    private database: Database
  ) {}

  /**
   * Record an action
   */
  async recordAction(action: Omit<Action, 'id'>): Promise<Action> {
    try {
      const id = this.generateId();
      const fullAction: Action = {
        id,
        ...action,
        timestamp: new Date()
      };

      await this.database.insert('actions', fullAction);
      return fullAction;
    } catch (error) {
      this.logger.error('Failed to record action', { error });
      throw error;
    }
  }

  /**
   * Get recent actions
   */
  async getRecentActions(limit: number = 50): Promise<Action[]> {
    try {
      const actions = await this.database.get<Action>('actions');

      if (!actions || !Array.isArray(actions)) {
        return [];
      }

      // Sort actions by timestamp (newest first) and limit
      return actions
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error) {
      this.logger.error('Failed to get recent actions', { error });
      return [];
    }
  }

  /**
   * Get recent metrics
   */
  async getRecentMetrics(): Promise<Metrics> {
    try {
      const storedMetrics = await this.database.get<Metrics>('metrics', 'current');

      if (!storedMetrics) {
        return this.getDefaultMetrics();
      }

      return storedMetrics;
    } catch (error) {
      this.logger.error('Failed to get recent metrics', { error });
      return this.getDefaultMetrics();
    }
  }

  /**
   * Update metrics
   */
  async updateMetrics(updates: Partial<Metrics>): Promise<Metrics> {
    try {
      const currentMetrics = await this.getRecentMetrics();
      const updatedMetrics = this.mergeMetrics(currentMetrics, updates);

      await this.database.update('metrics', 'current', updatedMetrics);
      return updatedMetrics;
    } catch (error) {
      this.logger.error('Failed to update metrics', { error });
      throw error;
    }
  }

  /**
   * Get metrics for specific period
   */
  async getMetricsForPeriod(startDate: Date, endDate: Date): Promise<any> {
    try {
      const actions = await this.database.get<Action>('actions');

      if (!actions || !Array.isArray(actions)) {
        return this.getDefaultMetrics();
      }

      // Filter actions within the specified period
      const filteredActions = actions.filter(action => {
        const actionDate = new Date(action.timestamp);
        return actionDate >= startDate && actionDate <= endDate;
      });

      // Calculate metrics
      const periodMetrics = {
        posts: {
          total: filteredActions.filter(action => action.type === 'post').length,
          engagement: 0 // Calculate based on likes and comments
        },
        followers: {
          gained: filteredActions.filter(action => action.type === 'follow').length,
          lost: filteredActions.filter(action => action.type === 'unfollow').length
        },
        engagement: {
          likes: {
            given: filteredActions.filter(action => action.type === 'like').length,
            received: 0 // Need to be retrieved from Instagram API
          },
          comments: {
            given: filteredActions.filter(action => action.type === 'comment').length,
            received: 0 // Need to be retrieved from Instagram API
          }
        }
      };

      return periodMetrics;
    } catch (error) {
      this.logger.error('Failed to get metrics for period', { error });
      return this.getDefaultMetrics();
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }

  /**
   * Get default metrics
   */
  private getDefaultMetrics(): Metrics {
    return {
      posts: {
        total: 0,
        lastWeek: 0,
        engagement: 0
      },
      followers: {
        total: 0,
        growth: 0,
        gained: 0,
        lost: 0
      },
      engagement: {
        likes: {
          received: 0,
          given: 0
        },
        comments: {
          received: 0,
          given: 0
        }
      }
    };
  }

  /**
   * Merge metrics
   */
  private mergeMetrics(current: Metrics, updates: Partial<Metrics>): Metrics {
    return {
      posts: {
        ...current.posts,
        ...(updates.posts || {})
      },
      followers: {
        ...current.followers,
        ...(updates.followers || {})
      },
      engagement: {
        likes: {
          ...current.engagement.likes,
          ...(updates.engagement?.likes || {})
        },
        comments: {
          ...current.engagement.comments,
          ...(updates.engagement?.comments || {})
        }
      }
    };
  }
}