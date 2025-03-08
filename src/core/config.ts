import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

interface Config {
  get<T>(key: string): T;
  set<T>(key: string, value: T): void;
}

class Configuration implements Config {
  private config: Map<string, any>;

  constructor() {
    this.config = new Map();
    this.loadDefaults();
  }

  /**
   * Get configuration value
   */
  get<T>(key: string): T {
    const value = this.config.get(key);
    if (value === undefined) {
      throw new Error(`Configuration key not found: ${key}`);
    }
    return value as T;
  }

  /**
   * Set configuration value
   */
  set<T>(key: string, value: T): void {
    this.config.set(key, value);
  }

  /**
   * Load default configuration values
   */
  private loadDefaults(): void {
    // App configuration
    this.set('app.version', '1.0.0');
    this.set('app.name', 'Instagram AI Bot');
    this.set('app.environment', process.env.NODE_ENV || 'development');

    // Instagram configuration
    this.set('instagram.username', process.env.INSTAGRAM_USERNAME);
    this.set('instagram.password', process.env.INSTAGRAM_PASSWORD);
    this.set('instagram.userAgent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    this.set('instagram.limits', {
      requestsPerHour: 100,
      postsPerDay: 3,
      storiesPerDay: 10,
      followsPerDay: 50,
      unfollowsPerDay: 50,
      commentsPerDay: 100,
      likesPerDay: 500
    });

    // API configuration
    this.set('api.openai.key', process.env.OPENAI_API_KEY);
    this.set('api.anthropic.key', process.env.ANTHROPIC_API_KEY);
    this.set('api.braveSearch.key', process.env.BRAVE_SEARCH_API_KEY);

    // Content configuration
    this.set('content.niche', process.env.CONTENT_NICHE || '');
    this.set('content.targetAudience', process.env.TARGET_AUDIENCE || '');
    this.set('content.brandVoice', process.env.BRAND_VOICE || '');
    this.set('content.carouselImageCount', 5);

    // Proxy configuration
    this.set('proxy.type', process.env.PROXY_TYPE || 'none');
    this.set('proxy.apiUrl', process.env.PROXY_API_URL);
    this.set('proxy.apiKey', process.env.PROXY_API_KEY);
    this.set('proxy.file', process.env.PROXY_FILE);
    this.set('proxy.rotationInterval', parseInt(process.env.PROXY_ROTATION_INTERVAL || '3600'));

    // Database configuration
    this.set('database.url', process.env.DATABASE_URL);
    this.set('database.name', process.env.DATABASE_NAME);

    // File paths
    this.set('paths.uploads', path.join(process.cwd(), 'uploads'));
    this.set('paths.logs', path.join(process.cwd(), 'logs'));
    this.set('paths.data', path.join(process.cwd(), 'data'));

    // Competitors to analyze
    this.set('competitors', (process.env.COMPETITORS || '').split(',').filter(Boolean));
  }
}

export const config = new Configuration();
export type { Config };