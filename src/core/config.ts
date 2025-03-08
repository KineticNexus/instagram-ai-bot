import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

/**
 * Configuration manager
 * Handles loading and accessing configuration settings from:
 * 1. Environment variables
 * 2. Config files
 * 3. Default values
 */
export class Config {
  private config: Record<string, any> = {};

  constructor() {
    // Load configuration from environment
    this.loadFromEnvironment();

    // Load configuration from files
    this.loadFromFile('config/default.json');
    const environment = process.env.NODE_ENV || 'development';
    this.loadFromFile(`config/${environment}.json`);
  }

  /**
   * Get configuration value by path
   */
  get<T>(path: string, defaultValue?: T): T {
    const parts = path.split('.');
    let current: any = this.config;

    for (const part of parts) {
      if (current === undefined || current === null || typeof current !== 'object') {
        return defaultValue as T;
      }
      current = current[part];
    }

    return (current === undefined) ? defaultValue as T : current;
  }

  /**
   * Set configuration value
   */
  set(path: string, value: any): void {
    const parts = path.split('.');
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
  private loadFromEnvironment(): void {
    // Convert environment variables to nested configuration
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('BOT_')) {
        const configKey = key.substring(4).toLowerCase().replace(/_/g, '.');
        this.set(configKey, process.env[key]);
      }
    });

    // Load specific important variables
    if (process.env.OPENAI_API_KEY) {
      this.set('openai.apiKey', process.env.OPENAI_API_KEY);
    }

    if (process.env.ANTHROPIC_API_KEY) {
      this.set('anthropic.apiKey', process.env.ANTHROPIC_API_KEY);
    }

    if (process.env.BRAVE_API_KEY) {
      this.set('brave.apiKey', process.env.BRAVE_API_KEY);
    }

    if (process.env.INSTAGRAM_USERNAME) {
      this.set('instagram.username', process.env.INSTAGRAM_USERNAME);
    }

    if (process.env.INSTAGRAM_PASSWORD) {
      this.set('instagram.password', process.env.INSTAGRAM_PASSWORD);
    }
  }

  /**
   * Load configuration from file
   */
  private loadFromFile(filePath: string): void {
    const fullPath = path.resolve(process.cwd(), filePath);

    if (fs.existsSync(fullPath)) {
      try {
        const fileContent = fs.readFileSync(fullPath, 'utf-8');
        const fileConfig = JSON.parse(fileContent);
        this.merge(this.config, fileConfig);
      } catch (error) {
        console.error(`Error loading config from ${fullPath}:`, error);
      }
    }
  }

  /**
   * Merge configuration objects
   */
  private merge(target: Record<string, any>, source: Record<string, any>): void {
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) {
          target[key] = {};
        }
        this.merge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    });
  }
}