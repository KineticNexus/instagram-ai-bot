import axios, { AxiosRequestConfig } from 'axios';
import fs from 'fs/promises';
import { Logger } from '../core/logger';
import { Config } from '../core/config';

interface Proxy {
  url: string;
  username?: string;
  password?: string;
  lastUsed?: Date;
  failCount?: number;
}

// Define a proper union type for proxy types
type ProxyType = 'manual' | 'api' | 'file';

interface ProxyConfig {
  type: ProxyType;
  apiUrl?: string;
  apiKey?: string;
  filePath?: string;
  proxies?: Proxy[];
  rotationInterval?: number;
}

interface ProxyStats {
  totalProxies: number;
  activeProxies: number;
  failedProxies: number;
  lastRotation: Date | null;
}

export class ProxyManager {
  private proxies: Proxy[] = [];
  private currentIndex = 0;
  private lastRotation: Date | null = null;
  private rotationInterval: number;

  constructor(
    private logger: Logger,
    private config: Config
  ) {
    this.rotationInterval = config.get('proxies.rotationInterval') || 3600000; // 1 hour default
  }

  /**
   * Initialize proxy manager
   */
  async initialize(config: ProxyConfig): Promise<void> {
    try {
      this.logger.info('Initializing proxy manager', { type: config.type });

      // Type-safe switch statement
      if (config.type === 'manual') {
        await this.initializeManualProxy(config.proxies || []);
      } else if (config.type === 'api') {
        if (!config.apiUrl || !config.apiKey) {
          throw new Error('API URL and key are required for API proxy configuration');
        }
        await this.initializeApiProxy(config.apiUrl, config.apiKey);
      } else if (config.type === 'file') {
        if (!config.filePath) {
          throw new Error('File path is required for file proxy configuration');
        }
        await this.initializeFileProxy(config.filePath);
      } else {
        // This ensures exhaustiveness checking
        const _exhaustiveCheck: never = config.type;
        throw new Error(`Invalid proxy configuration type: ${config.type}`);
      }

      if (config.rotationInterval) {
        this.rotationInterval = config.rotationInterval;
      }

      this.logger.info('Proxy manager initialized', {
        proxyCount: this.proxies.length,
        rotationInterval: this.rotationInterval
      });
    } catch (error) {
      this.logger.error('Failed to initialize proxy manager', { error });
      throw error;
    }
  }

  /**
   * Get next proxy
   */
  async getProxy(): Promise<Proxy> {
    if (this.proxies.length === 0) {
      throw new Error('No proxies available');
    }

    try {
      // Check if rotation is needed
      const now = new Date();
      if (this.lastRotation && (now.getTime() - this.lastRotation.getTime() > this.rotationInterval)) {
        await this.rotateProxies();
      }

      // Get next proxy
      const proxy = this.proxies[this.currentIndex];
      proxy.lastUsed = new Date();

      // Update index
      this.currentIndex = (this.currentIndex + 1) % this.proxies.length;

      return proxy;
    } catch (error) {
      this.logger.error('Failed to get proxy', { error });
      throw error;
    }
  }

  /**
   * Initialize manual proxy configuration
   */
  private async initializeManualProxy(proxies: Proxy[]): Promise<void> {
    if (proxies.length === 0) {
      throw new Error('No proxies provided for manual configuration');
    }

    this.proxies = proxies.map(proxy => ({
      url: proxy.url,
      username: proxy.username,
      password: proxy.password,
      failCount: 0
    }));
  }

  /**
   * Initialize API proxy configuration
   */
  private async initializeApiProxy(apiUrl: string, apiKey: string): Promise<void> {
    try {
      const config: AxiosRequestConfig = {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      };

      const response = await axios.get<{ proxies: Proxy[] }>(apiUrl, config);

      if (!response.data.proxies || response.data.proxies.length === 0) {
        throw new Error('No proxies returned from API');
      }

      this.proxies = response.data.proxies.map(proxy => {
        return {
          url: proxy.url,
          username: proxy.username,
          password: proxy.password,
          failCount: 0
        };
      });
    } catch (error) {
      this.logger.error('Failed to initialize API proxies', { error });
      throw error;
    }
  }

  /**
   * Initialize file proxy configuration
   */
  private async initializeFileProxy(filePath: string): Promise<void> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const proxies = JSON.parse(fileContent) as Proxy[];

      if (!Array.isArray(proxies) || proxies.length === 0) {
        throw new Error('Invalid or empty proxy file');
      }

      this.proxies = proxies.map(proxy => {
        return {
          url: proxy.url,
          username: proxy.username,
          password: proxy.password,
          failCount: 0
        };
      });
    } catch (error) {
      this.logger.error('Failed to initialize file proxies', { error });
      throw error;
    }
  }

  /**
   * Rotate proxies
   */
  private async rotateProxies(): Promise<void> {
    try {
      this.logger.info('Rotating proxies');

      // Shuffle proxies
      for (let i = this.proxies.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.proxies[i], this.proxies[j]] = [this.proxies[j], this.proxies[i]];
      }

      this.lastRotation = new Date();
      this.currentIndex = 0;

      this.logger.info('Proxies rotated successfully');
    } catch (error) {
      this.logger.error('Failed to rotate proxies', { error });
      throw error;
    }
  }

  /**
   * Get proxy statistics
   */
  getStats(): ProxyStats {
    return {
      totalProxies: this.proxies.length,
      activeProxies: this.proxies.filter(p => !p.failCount || p.failCount < 3).length,
      failedProxies: this.proxies.filter(p => p.failCount && p.failCount >= 3).length,
      lastRotation: this.lastRotation
    };
  }
}