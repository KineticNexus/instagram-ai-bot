import { Logger } from '../core/logger';
import { Config } from '../core/config';
import axios from 'axios';
import { promises as fs } from 'fs';

interface Proxy {
  url: string;
  username?: string;
  password?: string;
  country?: string;
  lastUsed?: Date;
}

type ProxyType = 'none' | 'manual' | 'api' | 'file';

export class ProxyManager {
  private proxies: Proxy[] = [];
  private currentProxyIndex = 0;
  private lastRotation = new Date();

  constructor(
    private logger: Logger,
    private config: Config
  ) {}

  /**
   * Initialize proxy manager
   */
  async initialize(): Promise<void> {
    try {
      const proxyType = this.config.get<ProxyType>('proxy.type');
      
      switch (proxyType) {
        case 'none':
          this.logger.info('No proxy configuration');
          break;
          
        case 'manual':
          await this.initializeManualProxy();
          break;
          
        case 'api':
          await this.initializeApiProxy();
          break;
          
        case 'file':
          await this.initializeFileProxy();
          break;
          
        default:
          throw new Error(`Invalid proxy type: ${proxyType}`);
      }
      
      this.logger.info('Proxy manager initialized', {
        type: proxyType,
        count: this.proxies.length
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
      return {
        url: 'direct://'
      };
    }
    
    // Check if we need to rotate proxies
    const now = new Date();
    const rotationInterval = this.config.get<number>('proxy.rotationInterval') * 1000;
    
    if (now.getTime() - this.lastRotation.getTime() >= rotationInterval) {
      await this.rotateProxies();
    }
    
    // Get next proxy
    const proxy = this.proxies[this.currentProxyIndex];
    proxy.lastUsed = new Date();
    
    // Update index for next time
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
    
    return proxy;
  }

  /**
   * Initialize manual proxy configuration
   */
  private async initializeManualProxy(): Promise<void> {
    const proxy: Proxy = {
      url: this.config.get('proxy.url'),
      username: this.config.get('proxy.username'),
      password: this.config.get('proxy.password')
    };
    
    this.proxies = [proxy];
  }

  /**
   * Initialize API-based proxy configuration
   */
  private async initializeApiProxy(): Promise<void> {
    try {
      const apiUrl = this.config.get<string>('proxy.apiUrl');
      const apiKey = this.config.get<string>('proxy.apiKey');
      
      const response = await axios.get<Proxy[]>(apiUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid proxy API response');
      }
      
      this.proxies = response.data.map(proxy => ({
        url: proxy.url,
        username: proxy.username,
        password: proxy.password,
        country: proxy.country
      }));
    } catch (error) {
      this.logger.error('Failed to initialize API proxy', { error });
      throw error;
    }
  }

  /**
   * Initialize file-based proxy configuration
   */
  private async initializeFileProxy(): Promise<void> {
    try {
      const filePath = this.config.get<string>('proxy.file');
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      this.proxies = lines.map(line => {
        const [url, username, password] = line.split(',').map(s => s.trim());
        return {
          url,
          username,
          password
        };
      });
    } catch (error) {
      this.logger.error('Failed to initialize file proxy', { error });
      throw error;
    }
  }

  /**
   * Rotate proxies
   */
  private async rotateProxies(): Promise<void> {
    try {
      const proxyType = this.config.get<ProxyType>('proxy.type');
      
      if (proxyType === 'api') {
        // Refresh proxies from API
        await this.initializeApiProxy();
      }
      
      // Shuffle proxies
      for (let i = this.proxies.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.proxies[i], this.proxies[j]] = [this.proxies[j], this.proxies[i]];
      }
      
      this.currentProxyIndex = 0;
      this.lastRotation = new Date();
      
      this.logger.info('Proxies rotated', {
        count: this.proxies.length
      });
    } catch (error) {
      this.logger.error('Failed to rotate proxies', { error });
      throw error;
    }
  }

  /**
   * Get proxy stats
   */
  getStats(): any {
    return {
      total: this.proxies.length,
      current: this.currentProxyIndex,
      lastRotation: this.lastRotation,
      type: this.config.get<ProxyType>('proxy.type')
    };
  }
}