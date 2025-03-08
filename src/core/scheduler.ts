import { CronJob } from 'cron';
import { Logger } from './logger';
import { Config } from './config';
import { Repository } from '../database/repository';
import { DecisionEngine } from '../ai/decision-engine';

interface ScheduledTask {
  id: string;
  cronPattern: string;
  taskType: string;
  parameters: any;
  active: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export class Scheduler {
  private logger: Logger;
  private config: Config;
  private repository: Repository;
  private decisionEngine: DecisionEngine;
  private jobs: Map<string, CronJob> = new Map();
  
  constructor(
    logger: Logger,
    config: Config,
    repository: Repository,
    decisionEngine: DecisionEngine
  ) {
    this.logger = logger;
    this.config = config;
    this.repository = repository;
    this.decisionEngine = decisionEngine;
  }
  
  async initialize(): Promise<void> {
    try {
      // Load scheduled tasks from database
      const tasks = await this.repository.scheduledTasks.findAll({ active: true });
      
      // Schedule each task
      for (const task of tasks) {
        await this.scheduleTask(task);
      }
      
      // Generate a dynamic schedule based on AI recommendations
      if (this.config.get('scheduler.enabled', true)) {
        await this.generateDynamicSchedule();
      }
      
      this.logger.info('Scheduler initialized with all tasks');
    } catch (error) {
      this.logger.error('Failed to initialize scheduler', { error });
      throw error;
    }
  }
  
  async scheduleTask(task: ScheduledTask): Promise<void> {
    try {
      // Create cron job
      const job = new CronJob(
        task.cronPattern,
        async () => {
          try {
            this.logger.info(`Executing scheduled task: ${task.id} (${task.taskType})`);
            
            // Update task last run time
            await this.repository.scheduledTasks.update(
              { id: task.id },
              { lastRun: new Date() }
            );
            
            // Execute task based on type
            await this.executeTask(task);
            
            // Update task next run time
            const nextRun = job.nextDate().toDate();
            await this.repository.scheduledTasks.update(
              { id: task.id },
              { nextRun }
            );
          } catch (error) {
            this.logger.error(`Failed to execute task ${task.id}`, { error });
          }
        },
        null, // onComplete
        true, // start
        this.config.get('scheduler.timezone', 'America/New_York') // timeZone
      );
      
      // Store job reference
      this.jobs.set(task.id, job);
      
      // Calculate and store next run time
      const nextRun = job.nextDate().toDate();
      await this.repository.scheduledTasks.update(
        { id: task.id },
        { nextRun }
      );
      
      this.logger.info(`Scheduled task ${task.id} (${task.taskType}) - Next run: ${nextRun}`);
    } catch (error) {
      this.logger.error(`Failed to schedule task ${task.id}`, { error });
      throw error;
    }
  }
  
  async executeTask(task: ScheduledTask): Promise<void> {
    // Execute based on task type
    switch (task.taskType) {
      case 'post_content':
        await this.executePostContentTask(task.parameters);
        break;
      case 'engage_users':
        await this.executeEngageUsersTask(task.parameters);
        break;
      case 'analyze_competitors':
        await this.executeAnalyzeCompetitorsTask(task.parameters);
        break;
      case 'update_analytics':
        await this.executeUpdateAnalyticsTask(task.parameters);
        break;
      case 'refresh_strategy':
        await this.executeRefreshStrategyTask(task.parameters);
        break;
      default:
        this.logger.warn(`Unknown task type: ${task.taskType}`);
    }
  }
  
  private async executePostContentTask(parameters: any): Promise<void> {
    // Implementation for posting content
    this.logger.info('Executing post content task', { parameters });
    // The actual implementation would:
    // 1. Load or generate content
    // 2. Post to Instagram using the automation module
    // 3. Record metrics
  }
  
  private async executeEngageUsersTask(parameters: any): Promise<void> {
    // Implementation for engaging with users
    this.logger.info('Executing engage users task', { parameters });
    // The actual implementation would:
    // 1. Find users to engage with based on strategy
    // 2. Like, comment, or follow based on parameters
    // 3. Record engagement metrics
  }
  
  private async executeAnalyzeCompetitorsTask(parameters: any): Promise<void> {
    // Implementation for analyzing competitors
    this.logger.info('Executing analyze competitors task', { parameters });
    // The actual implementation would:
    // 1. Analyze competitor accounts
    // 2. Extract insights
    // 3. Update competitor data in database
  }
  
  private async executeUpdateAnalyticsTask(parameters: any): Promise<void> {
    // Implementation for updating analytics
    this.logger.info('Executing update analytics task', { parameters });
    // The actual implementation would:
    // 1. Collect latest metrics from Instagram
    // 2. Update analytics database
    // 3. Generate reports if needed
  }
  
  private async executeRefreshStrategyTask(parameters: any): Promise<void> {
    // Implementation for refreshing strategy
    this.logger.info('Executing refresh strategy task', { parameters });
    // The actual implementation would:
    // 1. Use the decision engine to generate a new strategy
    // 2. Update the strategy in the database
    // 3. Update scheduled tasks based on new strategy
  }
  
  private async generateDynamicSchedule(): Promise<void> {
    try {
      this.logger.info('Generating dynamic schedule');
      
      // Generate action plan using decision engine
      const actionPlan = await this.decisionEngine.generateActionPlan();
      
      // Convert action plan to scheduled tasks
      const tasks = this.convertActionPlanToTasks(actionPlan);
      
      // Create and schedule each task
      for (const task of tasks) {
        // Store task in database
        const savedTask = await this.repository.scheduledTasks.create(task);
        
        // Schedule task
        await this.scheduleTask(savedTask);
      }
      
      this.logger.info('Dynamic schedule generated successfully');
    } catch (error) {
      this.logger.error('Failed to generate dynamic schedule', { error });
    }
  }
  
  private convertActionPlanToTasks(actionPlan: any): ScheduledTask[] {
    // Convert action plan to scheduled tasks
    const tasks: ScheduledTask[] = [];
    
    // Example implementation - in a real application, this would parse
    // the structure of the actionPlan and create appropriate tasks
    
    // Create content posting tasks
    if (actionPlan.postingSchedule && Array.isArray(actionPlan.postingSchedule)) {
      actionPlan.postingSchedule.forEach((post: any, index: number) => {
        // Convert day and time to cron pattern
        const cronPattern = this.daytimeToCron(post.day, post.time);
        
        tasks.push({
          id: `post_${index}_${Date.now()}`,
          cronPattern,
          taskType: 'post_content',
          parameters: post,
          active: true
        });
      });
    }
    
    // Create engagement tasks
    if (actionPlan.engagementTargets && Array.isArray(actionPlan.engagementTargets)) {
      // Schedule engagement tasks at different times throughout the day
      const hours = [9, 12, 15, 18, 21];
      
      actionPlan.engagementTargets.forEach((target: any, index: number) => {
        // Distribute tasks across different hours
        const hour = hours[index % hours.length];
        
        tasks.push({
          id: `engagement_${index}_${Date.now()}`,
          cronPattern: `0 ${hour} * * *`, // Run at specified hour every day
          taskType: 'engage_users',
          parameters: target,
          active: true
        });
      });
    }
    
    // Add analytics task (daily at midnight)
    tasks.push({
      id: `analytics_${Date.now()}`,
      cronPattern: '0 0 * * *', // Midnight every day
      taskType: 'update_analytics',
      parameters: {},
      active: true
    });
    
    // Add competitor analysis task (weekly on Sunday)
    tasks.push({
      id: `competitor_analysis_${Date.now()}`,
      cronPattern: '0 1 * * 0', // 1 AM on Sunday
      taskType: 'analyze_competitors',
      parameters: {
        depth: 'full'
      },
      active: true
    });
    
    // Add strategy refresh task (weekly on Monday)
    tasks.push({
      id: `strategy_refresh_${Date.now()}`,
      cronPattern: '0 2 * * 1', // 2 AM on Monday
      taskType: 'refresh_strategy',
      parameters: {},
      active: true
    });
    
    return tasks;
  }
  
  private daytimeToCron(day: string, time: string): string {
    // Convert day and time to cron pattern
    const dayMap: Record<string, number> = {
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
      'Sunday': 0
    };
    
    const dayNumber = dayMap[day];
    
    if (dayNumber === undefined) {
      throw new Error(`Invalid day: ${day}`);
    }
    
    // Parse time (expected format HH:MM)
    const [hour, minute] = time.split(':').map(Number);
    
    if (isNaN(hour) || isNaN(minute)) {
      throw new Error(`Invalid time format: ${time}`);
    }
    
    // Return cron pattern: minute hour * * day-of-week
    return `${minute} ${hour} * * ${dayNumber}`;
  }
  
  async rescheduleTask(taskId: string, newCronPattern: string): Promise<void> {
    try {
      // Get existing job
      const job = this.jobs.get(taskId);
      if (job) {
        // Stop existing job
        job.stop();
      }
      
      // Update task in database
      await this.repository.scheduledTasks.update(
        { id: taskId },
        { cronPattern: newCronPattern }
      );
      
      // Get updated task
      const task = await this.repository.scheduledTasks.findOne({ id: taskId });
      
      // Schedule updated task
      await this.scheduleTask(task);
      
      this.logger.info(`Rescheduled task ${taskId} with pattern ${newCronPattern}`);
    } catch (error) {
      this.logger.error(`Failed to reschedule task ${taskId}`, { error });
      throw error;
    }
  }
  
  async removeTask(taskId: string): Promise<void> {
    try {
      // Get existing job
      const job = this.jobs.get(taskId);
      if (job) {
        // Stop existing job
        job.stop();
        
        // Remove job reference
        this.jobs.delete(taskId);
      }
      
      // Update task in database (mark as inactive)
      await this.repository.scheduledTasks.update(
        { id: taskId },
        { active: false }
      );
      
      this.logger.info(`Removed scheduled task: ${taskId}`);
    } catch (error) {
      this.logger.error(`Failed to remove task ${taskId}`, { error });
      throw error;
    }
  }
}