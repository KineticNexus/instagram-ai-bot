import { Logger } from './logger';
import { Config } from './config';
import { Repository } from '../database/repository';
import { DecisionEngine } from '../ai/decision-engine';

export interface ScheduledTask {
  id: string;
  type: string;
  schedule: Date;
  data?: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

export class Scheduler {
  private tasks: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private logger: Logger,
    private config: Config,
    private repository: Repository,
    private decisionEngine: DecisionEngine
  ) {}

  /**
   * Initialize scheduler
   */
  async initialize(): Promise<void> {
    try {
      // Load pending tasks from repository
      const pendingTasks = await this.repository.getPendingTasks();
      
      // Schedule each task
      for (const task of pendingTasks) {
        await this.scheduleTask(task);
      }
      
      this.logger.info('Scheduler initialized', {
        taskCount: pendingTasks.length
      });
    } catch (error) {
      this.logger.error('Failed to initialize scheduler', { error });
      throw error;
    }
  }

  /**
   * Schedule a new task
   */
  async scheduleTask(task: ScheduledTask): Promise<void> {
    try {
      const now = new Date();
      const delay = task.schedule.getTime() - now.getTime();
      
      if (delay < 0) {
        this.logger.warn('Task scheduled in the past', { task });
        return;
      }
      
      const timeout = setTimeout(async () => {
        await this.executeTask(task);
      }, delay);
      
      this.tasks.set(task.id, timeout);
      
      this.logger.info('Task scheduled', {
        taskId: task.id,
        type: task.type,
        schedule: task.schedule
      });
    } catch (error) {
      this.logger.error('Failed to schedule task', { error, task });
      throw error;
    }
  }

  /**
   * Execute a scheduled task
   */
  private async executeTask(task: ScheduledTask): Promise<void> {
    try {
      this.logger.info('Executing task', { taskId: task.id });
      
      // Update task status
      task.status = 'running';
      await this.repository.updateTask(task);
      
      // Execute task based on type
      switch (task.type) {
        case 'post-content':
          await this.executePostContent(task);
          break;
          
        case 'analyze-competitors':
          await this.executeCompetitorAnalysis(task);
          break;
          
        case 'engage-followers':
          await this.executeFollowerEngagement(task);
          break;
          
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }
      
      // Update task status
      task.status = 'completed';
      await this.repository.updateTask(task);
      
      this.logger.info('Task completed successfully', { taskId: task.id });
    } catch (error) {
      this.logger.error('Task execution failed', { error, task });
      
      // Update task status
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      await this.repository.updateTask(task);
    } finally {
      // Clean up task
      this.tasks.delete(task.id);
    }
  }

  /**
   * Execute post content task
   */
  private async executePostContent(task: ScheduledTask): Promise<void> {
    // Get decision from AI
    const decision = await this.decisionEngine.decideNextAction();
    
    if (decision.action !== 'post_content') {
      this.logger.info('AI decided not to post content', { decision });
      return;
    }
    
    // Execute the post content task
    // Implementation will be added when content posting is implemented
  }

  /**
   * Execute competitor analysis task
   */
  private async executeCompetitorAnalysis(task: ScheduledTask): Promise<void> {
    // Get decision from AI
    const decision = await this.decisionEngine.decideNextAction();
    
    if (decision.action !== 'analyze_competitors') {
      this.logger.info('AI decided not to analyze competitors', { decision });
      return;
    }
    
    // Execute the competitor analysis task
    // Implementation will be added when competitor analysis is implemented
  }

  /**
   * Execute follower engagement task
   */
  private async executeFollowerEngagement(task: ScheduledTask): Promise<void> {
    // Get decision from AI
    const decision = await this.decisionEngine.decideNextAction();
    
    if (decision.action !== 'engage_followers') {
      this.logger.info('AI decided not to engage followers', { decision });
      return;
    }
    
    // Execute the follower engagement task
    // Implementation will be added when follower engagement is implemented
  }

  /**
   * Cancel a scheduled task
   */
  async cancelTask(taskId: string): Promise<void> {
    const timeout = this.tasks.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this.tasks.delete(taskId);
      
      // Update task in repository
      const task = await this.repository.getTask(taskId);
      if (task) {
        task.status = 'failed';
        task.error = 'Task cancelled';
        await this.repository.updateTask(task);
      }
      
      this.logger.info('Task cancelled', { taskId });
    }
  }

  /**
   * Get all scheduled tasks
   */
  async getTasks(): Promise<ScheduledTask[]> {
    return await this.repository.getAllTasks();
  }

  /**
   * Clean up scheduler
   */
  async cleanup(): Promise<void> {
    // Cancel all scheduled tasks
    for (const [taskId, timeout] of this.tasks) {
      clearTimeout(timeout);
      this.tasks.delete(taskId);
    }
    
    this.logger.info('Scheduler cleaned up');
  }
}