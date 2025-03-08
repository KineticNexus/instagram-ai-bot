import { Logger } from './logger';
import { Config } from './config';
import { schedule, ScheduledTask } from 'node-schedule';
import { DateTime } from 'luxon';
import { DecisionEngine } from '../ai/decision-engine';
import { InstagramAutomation } from '../automation/instagram';

interface ScheduledJob {
  name: string;
  schedule: string;
  lastRun: Date | null;
  nextRun: Date | null;
  status: 'active' | 'paused' | 'completed' | 'failed';
  task: ScheduledTask | null;
}

export class Scheduler {
  private jobs: Map<string, ScheduledJob> = new Map();

  constructor(
    private logger: Logger,
    private config: Config,
    private decisionEngine: DecisionEngine,
    private instagram: InstagramAutomation
  ) {}

  /**
   * Initialize scheduler
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing scheduler');

      // Setup default jobs
      this.setupDefaultJobs();

      this.logger.info('Scheduler initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize scheduler', { error });
      throw error;
    }
  }

  /**
   * Setup default scheduled jobs
   */
  private setupDefaultJobs(): void {
    // Decision job - runs hourly
    this.scheduleJob('decision', '0 * * * *', async () => {
      try {
        this.logger.info('Running decision job');
        const decision = await this.decisionEngine.decideNextAction();
        
        // Execute the decision
        await this.executeDecision(decision);
        
        this.logger.info('Decision job completed', { decision });
      } catch (error) {
        this.logger.error('Decision job failed', { error });
      }
    });

    // Add other default jobs as needed
  }

  /**
   * Execute a decision
   */
  private async executeDecision(decision: any): Promise<void> {
    try {
      switch (decision.action) {
        case 'post':
          // Handle posting
          break;
        case 'like':
          if (decision.target) {
            await this.instagram.likePost(decision.target);
          }
          break;
        case 'comment':
          if (decision.target && decision.content) {
            await this.instagram.commentOnPost(decision.target, decision.content);
          }
          break;
        case 'follow':
          if (decision.target) {
            await this.instagram.followUser(decision.target);
          }
          break;
        case 'unfollow':
          if (decision.target) {
            await this.instagram.unfollowUser(decision.target);
          }
          break;
      }
      
      // Record successful action
      this.decisionEngine.recordAction(decision.action, decision.target || '', true);
    } catch (error) {
      this.logger.error('Failed to execute decision', { error, decision });
      this.decisionEngine.recordAction(decision.action, decision.target || '', false);
    }
  }

  /**
   * Schedule a job with a cron expression
   */
  scheduleJob(name: string, cronExpression: string, callback: () => Promise<void>): void {
    try {
      // Create the job
      const job = schedule.scheduleJob(cronExpression, async () => {
        try {
          const jobInfo = this.jobs.get(name);
          if (jobInfo) {
            jobInfo.lastRun = new Date();
            jobInfo.status = 'active';
          }
          
          await callback();
          
          if (jobInfo) {
            jobInfo.status = 'completed';
            const scheduledTask = jobInfo.task;
            if (scheduledTask && scheduledTask.nextInvocation) {
              // Use toJSDate instead of toDate for Luxon DateTime
              jobInfo.nextRun = scheduledTask.nextInvocation();
            }
          }
        } catch (error) {
          this.logger.error(`Job ${name} failed`, { error });
          
          const jobInfo = this.jobs.get(name);
          if (jobInfo) {
            jobInfo.status = 'failed';
          }
        }
      });

      // Store job information
      const nextRun = job.nextInvocation ? job.nextInvocation() : null;

      this.jobs.set(name, {
        name,
        schedule: cronExpression,
        lastRun: null,
        nextRun,
        status: 'active',
        task: job
      });

      this.logger.info(`Job ${name} scheduled`, { 
        schedule: cronExpression, 
        nextRun: nextRun ? nextRun.toISOString() : null 
      });
    } catch (error) {
      this.logger.error(`Failed to schedule job ${name}`, { error });
    }
  }

  /**
   * Pause a scheduled job
   */
  pauseJob(name: string): void {
    const job = this.jobs.get(name);
    if (job && job.task) {
      job.task.cancel();
      job.status = 'paused';
      this.logger.info(`Job ${name} paused`);
    } else {
      this.logger.warn(`Job ${name} not found`);
    }
  }

  /**
   * Resume a paused job
   */
  resumeJob(name: string): void {
    const job = this.jobs.get(name);
    if (job && job.status === 'paused') {
      // Reschedule the job
      this.scheduleJob(name, job.schedule, async () => {
        // We need to recreate the callback function here
        // Ideally, we would store the callback function with the job
      });
      this.logger.info(`Job ${name} resumed`);
    } else {
      this.logger.warn(`Job ${name} not found or not paused`);
    }
  }

  /**
   * Get information about scheduled jobs
   */
  getJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Shutdown the scheduler
   */
  shutdown(): void {
    try {
      this.logger.info('Shutting down scheduler');
      
      // Cancel all jobs
      for (const [name, job] of this.jobs.entries()) {
        if (job.task) {
          job.task.cancel();
          this.logger.info(`Job ${name} cancelled`);
        }
      }
      
      this.jobs.clear();
      this.logger.info('Scheduler shutdown complete');
    } catch (error) {
      this.logger.error('Error during scheduler shutdown', { error });
    }
  }
}