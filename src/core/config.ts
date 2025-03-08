import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env file
dotenv.config();

/**
 * Configuration class responsible for loading and providing access to application settings
 */
export class Config {
  private config: Record<string, any> = {};

  constructor() {
    this.loadEnvironmentVariables();
    this.loadDefaultConfig();
  }

  /**
   * Get a configuration value by its key
   * @param key The dot-notation path to the configuration value
   * @param defaultValue The default value to return if the key is not found
   */
  get<T>(key: string, defaultValue?: T): T {
    const parts = key.split('.');
    let current: any = this.config;

    for (const part of parts) {
      if (current === undefined || current === null) {
        return defaultValue as T;
      }
      current = current[part];
    }

    return (current !== undefined && current !== null) ? current : defaultValue as T;
  }

  /**
   * Set a configuration value
   * @param key The dot-notation path to the configuration value
   * @param value The value to set
   */
  set<T>(key: string, value: T): void {
    const parts = key.split('.');
    let current = this.config;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Load configuration from environment variables
   */
  private loadEnvironmentVariables(): void {
    // Instagram credentials
    this.set('instagram.username', process.env.INSTAGRAM_USERNAME);
    this.set('instagram.password', process.env.INSTAGRAM_PASSWORD);

    // Database configuration
    this.set('database.mongodb.uri', process.env.MONGODB_URI || 'mongodb://localhost:27017/instagram-ai-bot');
    this.set('database.redis.uri', process.env.REDIS_URI || 'redis://localhost:6379');

    // API keys
    this.set('api.openai.key', process.env.OPENAI_API_KEY);
    this.set('api.anthropic.key', process.env.ANTHROPIC_API_KEY);
    this.set('api.braveSearch.key', process.env.BRAVE_SEARCH_API_KEY);

    // Browser configuration
    this.set('browser.userAgent', process.env.BROWSER_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    this.set('browser.timezoneId', process.env.BROWSER_TIMEZONE_ID || 'America/New_York');

    // Proxy configuration
    this.set('proxy.use', process.env.USE_PROXIES === 'true');
    this.set('proxy.apiKey', process.env.PROXY_API_KEY);

    // Security
    this.set('security.jwtSecret', process.env.JWT_SECRET);
    this.set('security.encryptionKey', process.env.ENCRYPTION_KEY);

    // Rate limiting
    this.set('rateLimit.instagram.maxRequests', parseInt(process.env.RATE_LIMIT_INSTAGRAM_MAX_REQUESTS || '100'));
    this.set('rateLimit.instagram.timeWindow', parseInt(process.env.RATE_LIMIT_INSTAGRAM_TIME_WINDOW || '3600'));

    // Logging
    this.set('logging.level', process.env.LOG_LEVEL || 'info');
  }

  /**
   * Load default configuration values
   */
  private loadDefaultConfig(): void {
    this.set('app.name', 'Instagram AI Bot');
    this.set('app.version', '1.0.0');

    // Scheduler defaults
    this.set('scheduler.enabled', true);
    this.set('scheduler.timezone', 'America/New_York');

    // Content generation defaults
    this.set('content.defaultThemes', [
      'motivation',
      'inspiration',
      'education',
      'lifestyle',
      'behind-the-scenes'
    ]);

    // Instagram automation defaults
    this.set('instagram.maxDailyPosts', 2);
    this.set('instagram.maxDailyStories', 3);
    this.set('instagram.maxDailyFollows', 30);
    this.set('instagram.maxDailyLikes', 100);
    this.set('instagram.maxDailyComments', 20);

    // Competitor analysis defaults
    this.set('competitors', []);
    this.set('competitors.maxToTrack', 10);
    this.set('competitors.updateFrequency', 'daily');

    // Analytics
    this.set('analytics.storeDuration', 90); // days to keep analytics data
  }

  /**
   * Load configuration from a JSON file
   * @param filePath Path to the configuration file
   */
  loadFromFile(filePath: string): void {
    try {
      const configFile = path.resolve(filePath);
      if (fs.existsSync(configFile)) {
        const fileConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        this.mergeConfig(fileConfig);
      }
    } catch (error) {
      console.error(`Failed to load configuration from file: ${error}`);
    }
  }

  /**
   * Merge configuration objects
   * @param source Source configuration to merge
   * @param target Target configuration (defaults to the main config)
   */
  private mergeConfig(source: Record<string, any>, target: Record<string, any> = this.config): void {
    for (const key of Object.keys(source)) {
      if (
        source[key] !== null && 
        typeof source[key] === 'object' && 
        !Array.isArray(source[key])
      ) {
        if (!target[key]) {
          target[key] = {};
        }
        this.mergeConfig(source[key], target[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
}

// Export a singleton instance
export const config = new Config();