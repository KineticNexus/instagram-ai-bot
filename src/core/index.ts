import { logger } from './logger';
import { config } from './config';
import { Browser, chromium } from 'playwright';
import { InstagramAutomation } from '../automation/instagram';
import { ProxyManager } from '../automation/proxies';
import { OpenAIClient } from '../api/openai';
import { AnthropicClient } from '../api/anthropic';
import { BraveSearchClient } from '../api/brave';
import { DecisionEngine } from '../ai/decision-engine';
import { ContentGenerator } from '../ai/content-generator';
import { CompetitorAnalyzer } from '../ai/competitor-analyzer';
import { AnalyticsService } from '../services/analytics';
import { ImageProcessor } from '../utils/image-processing';
import { Repository } from '../database/repository';
import { Scheduler } from './scheduler';
import { connectDatabase } from '../database/connection';

/**
 * Main application class
 */
class Application {
  private browser: Browser | null = null;
  private instagram: InstagramAutomation | null = null;
  private scheduler: Scheduler | null = null;
  private isRunning = false;

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing application', { version: config.get('app.version') });

      // Connect to database
      await connectDatabase();
      logger.info('Connected to database');

      // Initialize browser
      this.browser = await chromium.launch({
        headless: true,
        args: ['--disable-dev-shm-usage']
      });
      logger.info('Browser initialized');

      // Create repository
      const repository = new Repository();

      // Initialize proxy manager
      const proxyManager = new ProxyManager(
        logger.child('proxy'),
        config
      );
      await proxyManager.initialize();

      // Initialize Instagram automation
      this.instagram = new InstagramAutomation(
        this.browser,
        logger.child('instagram'),
        proxyManager,
        config
      );
      await this.instagram.initialize();

      // Initialize API clients
      const openai = new OpenAIClient(
        logger.child('openai'),
        config.get('api.openai.key')
      );

      const anthropic = new AnthropicClient(
        logger.child('anthropic'),
        config.get('api.anthropic.key')
      );

      const braveSearch = new BraveSearchClient(
        logger.child('braveSearch'),
        config.get('api.braveSearch.key')
      );

      // Initialize utilities
      const imageProcessor = new ImageProcessor(
        logger.child('imageProcessor')
      );

      // Initialize services
      const analytics = new AnalyticsService(
        logger.child('analytics'),
        repository
      );

      // Initialize AI components
      const competitorAnalyzer = new CompetitorAnalyzer(
        logger.child('competitorAnalyzer'),
        config,
        this.instagram,
        braveSearch,
        repository,
        openai
      );

      const contentGenerator = new ContentGenerator(
        openai,
        logger.child('contentGenerator'),
        config,
        imageProcessor,
        repository
      );

      const decisionEngine = new DecisionEngine(
        openai,
        anthropic,
        logger.child('decisionEngine'),
        config,
        analytics,
        competitorAnalyzer
      );

      // Initialize scheduler
      this.scheduler = new Scheduler(
        logger.child('scheduler'),
        config,
        repository,
        decisionEngine
      );
      await this.scheduler.initialize();

      this.isRunning = true;
      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application', { error });
      await this.shutdown();
    }
  }

  /**
   * Shutdown the application
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down application');

    // Close browser if open
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Browser closed');
    }

    this.isRunning = false;
    logger.info('Application shutdown complete');
  }
}

/**
 * Main function to start the application
 */
async function main(): Promise<void> {
  const app = new Application();
  
  // Handle process termination signals
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT signal');
    await app.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM signal');
    await app.shutdown();
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    logger.error('Uncaught exception', { error });
    await app.shutdown();
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason) => {
    logger.error('Unhandled promise rejection', { reason });
    await app.shutdown();
    process.exit(1);
  });

  // Initialize application
  await app.initialize();
}

// Run the application
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { Application };