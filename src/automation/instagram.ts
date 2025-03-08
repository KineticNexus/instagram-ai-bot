import { Browser, Page } from 'playwright';
import { Logger } from '../core/logger';
import { ProxyManager } from './proxies';
import { InstagramSelectors } from './selectors';
import { ImageProcessor } from '../utils/image-processing';
import { RateLimiter } from '../utils/rate-limiter';
import { Config } from '../core/config';

export class InstagramAutomation {
  private browser: Browser;
  private page: Page | null = null;
  private logger: Logger;
  private proxyManager: ProxyManager;
  private rateLimiter: RateLimiter;
  private config: Config;
  private isLoggedIn: boolean = false;
  
  constructor(
    browser: Browser, 
    logger: Logger, 
    proxyManager: ProxyManager,
    config: Config
  ) {
    this.browser = browser;
    this.logger = logger;
    this.proxyManager = proxyManager;
    this.config = config;
    this.rateLimiter = new RateLimiter({
      maxRequests: this.config.get('rateLimit.instagram.maxRequests', 100),
      timeWindow: this.config.get('rateLimit.instagram.timeWindow', 3600)
    });
  }
  
  async initialize(): Promise<void> {
    try {
      // Rotate proxy if needed
      const useProxy = this.config.get('proxy.use', false);
      const proxy = useProxy ? await this.proxyManager.getNextProxy() : null;
      
      // Create new browser context with proxy
      const contextOptions: any = {
        userAgent: this.config.get('browser.userAgent'),
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        hasTouch: false,
        locale: 'en-US',
        timezoneId: this.config.get('browser.timezoneId')
      };
      
      if (proxy) {
        contextOptions.proxy = {
          server: proxy.url,
          username: proxy.username,
          password: proxy.password
        };
      }
      
      const context = await this.browser.newContext(contextOptions);
      
      // Create new page
      this.page = await context.newPage();
      
      // Set various browser fingerprints to avoid detection
      await this.page.addInitScript(() => {
        // Override navigator properties
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        
        // Add language strings
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en', 'es']
        });
        
        // Add fake plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => {
            const plugins = [];
            for (let i = 0; i < 5; i++) {
              plugins.push({
                name: `Plugin ${i}`,
                description: `Fake plugin ${i}`,
                filename: `plugin${i}.dll`
              });
            }
            return plugins;
          }
        });
        
        // Override permissions
        if (navigator.permissions) {
          const originalQuery = navigator.permissions.query;
          // @ts-ignore
          navigator.permissions.query = (parameters: any) => (
            parameters.name === 'notifications' ?
              Promise.resolve({ state: Notification.permission }) :
              originalQuery(parameters)
          );
        }
      });
      
      this.logger.info('Instagram automation initialized with new browser context');
    } catch (error) {
      this.logger.error('Failed to initialize Instagram automation', { error });
      throw error;
    }
  }
  
  async login(username?: string, password?: string): Promise<boolean> {
    if (!this.page) {
      throw new Error('Browser page not initialized');
    }
    
    try {
      await this.rateLimiter.wait();
      
      // Use provided credentials or load from config
      const instagramUsername = username || this.config.get('instagram.username');
      const instagramPassword = password || this.config.get('instagram.password');
      
      if (!instagramUsername || !instagramPassword) {
        throw new Error('Instagram credentials not provided');
      }
      
      // Navigate to Instagram login page
      await this.page.goto('https://www.instagram.com/accounts/login/', {
        waitUntil: 'networkidle'
      });
      
      // Accept cookies if dialog appears
      const cookieSelector = InstagramSelectors.ACCEPT_COOKIES_BUTTON;
      const cookieButton = await this.page.$(cookieSelector);
      if (cookieButton) {
        await cookieButton.click();
        await this.page.waitForTimeout(2000);
      }
      
      // Type username and password
      await this.page.fill(InstagramSelectors.USERNAME_INPUT, instagramUsername);
      await this.page.waitForTimeout(500 + Math.random() * 500);
      await this.page.fill(InstagramSelectors.PASSWORD_INPUT, instagramPassword);
      
      // Add random delay to simulate human behavior
      await this.page.waitForTimeout(Math.floor(Math.random() * 1000) + 500);
      
      // Click login button
      await this.page.click(InstagramSelectors.LOGIN_BUTTON);
      
      // Wait for navigation
      await this.page.waitForNavigation({ waitUntil: 'networkidle' });
      
      // Handle two-factor authentication if enabled
      if (await this.page.$(InstagramSelectors.TWO_FACTOR_INPUT)) {
        this.logger.warn('Two-factor authentication detected');
        // Get 2FA code from config, SMS service, or other source
        const twoFactorCode = await this.getTwoFactorCode();
        await this.page.fill(InstagramSelectors.TWO_FACTOR_INPUT, twoFactorCode);
        await this.page.click(InstagramSelectors.TWO_FACTOR_SUBMIT);
        await this.page.waitForNavigation({ waitUntil: 'networkidle' });
      }
      
      // Handle save login info dialog
      const saveLoginButton = await this.page.$(InstagramSelectors.SAVE_LOGIN_INFO);
      if (saveLoginButton) {
        await saveLoginButton.click();
        await this.page.waitForTimeout(2000);
      }
      
      // Handle turn on notifications dialog
      const notNowButton = await this.page.$(InstagramSelectors.NOT_NOW_BUTTON);
      if (notNowButton) {
        await notNowButton.click();
        await this.page.waitForTimeout(2000);
      }
      
      // Verify successful login by checking for profile icon
      await this.page.waitForSelector(InstagramSelectors.PROFILE_ICON, {
        timeout: 10000
      });
      
      this.isLoggedIn = true;
      this.logger.info(`Successfully logged in as ${instagramUsername}`);
      return true;
    } catch (error) {
      this.logger.error('Login failed', { error });
      
      // Take screenshot of failed login
      if (this.page) {
        await this.takeScreenshot('login-failed.png');
      }
      
      // Check for common error scenarios
      if (this.page) {
        if (await this.page.$(InstagramSelectors.INCORRECT_PASSWORD)) {
          this.logger.error('Incorrect password detected');
        } else if (await this.page.$(InstagramSelectors.SUSPICIOUS_LOGIN)) {
          this.logger.error('Suspicious login activity detected');
        } else if (await this.page.$(InstagramSelectors.ACCOUNT_DISABLED)) {
          this.logger.error('Account disabled or locked');
        }
      }
      
      return false;
    }
  }
  
  async createPost(imageUrl: string, caption: string, location?: string): Promise<boolean> {
    if (!this.page || !this.isLoggedIn) {
      throw new Error('Not logged in to Instagram');
    }
    
    try {
      await this.rateLimiter.wait();
      
      // Click create post button
      await this.page.click(InstagramSelectors.CREATE_POST_BUTTON);
      
      // Wait for file selector to appear
      await this.page.waitForSelector(InstagramSelectors.FILE_INPUT);
      
      // Upload image
      const fileInput = await this.page.$(InstagramSelectors.FILE_INPUT);
      await fileInput?.setInputFiles(imageUrl);
      
      // Wait for image to upload
      await this.page.waitForSelector(InstagramSelectors.NEXT_BUTTON);
      await this.page.click(InstagramSelectors.NEXT_BUTTON);
      
      // Wait for next screen
      await this.page.waitForSelector(InstagramSelectors.CAPTION_INPUT);
      
      // Add location if provided
      if (location) {
        await this.page.click(InstagramSelectors.ADD_LOCATION_BUTTON);
        await this.page.fill(InstagramSelectors.LOCATION_SEARCH_INPUT, location);
        await this.page.waitForSelector(InstagramSelectors.LOCATION_RESULT);
        await this.page.click(InstagramSelectors.LOCATION_RESULT);
      }
      
      // Add caption
      await this.page.fill(InstagramSelectors.CAPTION_INPUT, caption);
      
      // Add random delay to simulate human behavior
      await this.page.waitForTimeout(Math.floor(Math.random() * 2000) + 1000);
      
      // Share post
      await this.page.click(InstagramSelectors.SHARE_BUTTON);
      
      // Wait for confirmation
      await this.page.waitForSelector(InstagramSelectors.POST_SUCCESS_INDICATOR, {
        timeout: 60000
      });
      
      this.logger.info('Post created successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to create post', { error });
      if (this.page) {
        await this.takeScreenshot('create-post-failed.png');
      }
      return false;
    }
  }
  
  async likePost(postUrl: string): Promise<boolean> {
    if (!this.page || !this.isLoggedIn) {
      throw new Error('Not logged in to Instagram');
    }
    
    try {
      await this.rateLimiter.wait();
      
      // Navigate to post
      await this.page.goto(postUrl, { waitUntil: 'networkidle' });
      
      // Check if already liked
      const isLiked = await this.page.$(InstagramSelectors.UNLIKE_BUTTON);
      if (isLiked) {
        this.logger.info('Post already liked');
        return true;
      }
      
      // Click like button
      await this.page.click(InstagramSelectors.LIKE_BUTTON);
      
      // Verify like was successful
      await this.page.waitForSelector(InstagramSelectors.UNLIKE_BUTTON, {
        timeout: 5000
      });
      
      this.logger.info(`Successfully liked post: ${postUrl}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to like post: ${postUrl}`, { error });
      return false;
    }
  }
  
  async commentOnPost(postUrl: string, comment: string): Promise<boolean> {
    if (!this.page || !this.isLoggedIn) {
      throw new Error('Not logged in to Instagram');
    }
    
    try {
      await this.rateLimiter.wait();
      
      // Navigate to post
      await this.page.goto(postUrl, { waitUntil: 'networkidle' });
      
      // Click comment input
      await this.page.click(InstagramSelectors.COMMENT_INPUT);
      
      // Type comment with human-like typing pattern
      for (const char of comment) {
        await this.page.keyboard.type(char);
        await this.page.waitForTimeout(Math.random() * 100);
      }
      
      // Add random delay before posting
      await this.page.waitForTimeout(Math.floor(Math.random() * 1000) + 500);
      
      // Submit comment
      await this.page.keyboard.press('Enter');
      
      // Wait for comment to appear
      await this.page.waitForTimeout(3000);
      
      this.logger.info(`Successfully commented on post: ${postUrl}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to comment on post: ${postUrl}`, { error });
      return false;
    }
  }
  
  async followUser(username: string): Promise<boolean> {
    if (!this.page || !this.isLoggedIn) {
      throw new Error('Not logged in to Instagram');
    }
    
    try {
      await this.rateLimiter.wait();
      
      // Navigate to user profile
      await this.page.goto(`https://www.instagram.com/${username}/`, {
        waitUntil: 'networkidle'
      });
      
      // Check if already following
      const isFollowing = await this.page.$(InstagramSelectors.UNFOLLOW_BUTTON);
      if (isFollowing) {
        this.logger.info(`Already following ${username}`);
        return true;
      }
      
      // Click follow button
      await this.page.click(InstagramSelectors.FOLLOW_BUTTON);
      
      // Verify follow was successful
      await this.page.waitForSelector(InstagramSelectors.UNFOLLOW_BUTTON, {
        timeout: 5000
      });
      
      this.logger.info(`Successfully followed user: ${username}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to follow user: ${username}`, { error });
      return false;
    }
  }
  
  async unfollowUser(username: string): Promise<boolean> {
    if (!this.page || !this.isLoggedIn) {
      throw new Error('Not logged in to Instagram');
    }
    
    try {
      await this.rateLimiter.wait();
      
      // Navigate to user profile
      await this.page.goto(`https://www.instagram.com/${username}/`, {
        waitUntil: 'networkidle'
      });
      
      // Check if following
      const isFollowing = await this.page.$(InstagramSelectors.UNFOLLOW_BUTTON);
      if (!isFollowing) {
        this.logger.info(`Not following ${username}`);
        return true;
      }
      
      // Click unfollow button
      await this.page.click(InstagramSelectors.UNFOLLOW_BUTTON);
      
      // Confirm unfollow if dialog appears
      const confirmButton = await this.page.$(InstagramSelectors.CONFIRM_UNFOLLOW_BUTTON);
      if (confirmButton) {
        await confirmButton.click();
      }
      
      // Verify unfollow was successful
      await this.page.waitForSelector(InstagramSelectors.FOLLOW_BUTTON, {
        timeout: 5000
      });
      
      this.logger.info(`Successfully unfollowed user: ${username}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to unfollow user: ${username}`, { error });
      return false;
    }
  }
  
  private async takeScreenshot(filename: string): Promise<void> {
    if (!this.page) {
      return;
    }
    
    try {
      await this.page.screenshot({ path: `./screenshots/${filename}` });
    } catch (error) {
      this.logger.error(`Failed to take screenshot: ${filename}`, { error });
    }
  }
  
  private async getTwoFactorCode(): Promise<string> {
    // Implementation would depend on how you get 2FA codes
    // Options include:
    // 1. Read from config
    // 2. SMS retrieval API
    // 3. Email retrieval
    // 4. Manual input mechanism
    
    // Placeholder implementation - would read from config in real app
    const twoFactorCode = this.config.get('instagram.twoFactorCode', '');
    
    if (!twoFactorCode) {
      throw new Error('Two-factor authentication code not available');
    }
    
    return twoFactorCode;
  }
}