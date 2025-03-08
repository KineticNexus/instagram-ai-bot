import { Browser } from 'playwright';
import { chromium } from 'playwright';
import { Logger } from './logger';
import { Config } from './config';
import { Database } from './database';
import { Scheduler } from './scheduler';
import { ProxyManager } from '../automation/proxies';
import { InstagramAutomation } from '../automation/instagram';
import { DecisionEngine } from '../ai/decision-engine';
import { ContentGenerator } from '../ai/content-generator';
import { CompetitorAnalyzer } from '../ai/competitor-analyzer';
import { OpenAIClient } from '../api/openai';
import { AnthropicClient } from '../api/anthropic';
import { BraveSearchClient } from '../api/brave';
import { ImageProcessor } from '../utils/image-processing';
import { AnalyticsService } from '../services/analytics';

export class Application {
  private browser: Browser | null = null;
  private instagram: InstagramAutomation | null = null;
  private scheduler: Scheduler | null = null;
  private isRunning = false;

  constructor(
    private logger: Logger,
    private config: Config
  ) {}

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing application');
      this.isRunning = true;

      // Connect to database
      const database = new Database(this.logger, this.config);
      await database.connect();

      // Launch browser
      this.browser = await chromium.launch({
        headless: this.config.get('browser.headless'),
        args: this.config.get('browser.args')
      });

      // Initialize proxy manager
      const proxyManager = new ProxyManager(this.logger, this.config);
      await proxyManager.initialize({
        type: this.config.get('proxies.type'),
        apiUrl: this.config.get('proxies.apiUrl'),
        apiKey: this.config.get('proxies.apiKey'),
        filePath: this.config.get('proxies.filePath'),
        proxies: this.config.get('proxies.list'),
        rotationInterval: this.config.get('proxies.rotationInterval')
      });

      // Initialize API clients
      const openai = new OpenAIClient(this.logger, this.config);
      const anthropic = new AnthropicClient(this.logger, this.config);
      const braveSearch = new BraveSearchClient(this.logger, this.config);

      // Initialize services
      const analytics = new AnalyticsService(this.logger, database);
      const imageProcessor = new ImageProcessor(this.logger, this.config);

      // Initialize Instagram automation
      this.instagram = new InstagramAutomation(
        this.browser,
        this.logger,
        proxyManager,
        this.config
      );
      await this.instagram.initialize();

      // Initialize AI components
      const competitorAnalyzer = new CompetitorAnalyzer(
        this.logger,
        this.config,
        openai,
        braveSearch,
        this.instagram
      );

      const contentGenerator = new ContentGenerator(
        this.logger,
        this.config,
        openai,
        anthropic,
        braveSearch,
        imageProcessor
      );

      const decisionEngine = new DecisionEngine(
        this.logger,
        this.config,
        openai,
        anthropic,
        braveSearch,
        analytics
      );

      // Initialize scheduler
      this.scheduler = new Scheduler(
        this.logger,
        this.config,
        decisionEngine,
        this.instagram
      );
      await this.scheduler.initialize();

      this.logger.info('Application initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize application', { error });
      await this.shutdown();
      throw error;
    }
  }

  /**
   * Shutdown the application
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down application');

      // Shutdown scheduler
      if (this.scheduler) {
        this.scheduler.shutdown();
      }

      // Close browser
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      this.isRunning = false;
      this.logger.info('Application shutdown complete');
    } catch (error) {
      this.logger.error('Error during application shutdown', { error });
      this.isRunning = false;
    }
  }
}

/**
 * Main entry point
 */
export async function main(): Promise<void> {
  const logger = new Logger();
  const config = new Config();

  const app = new Application(logger, config);

  // Handle process termination
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

  try {
    await app.initialize();
  } catch (error) {
    logger.error('Application failed to start', { error });
    process.exit(1);
  }
}