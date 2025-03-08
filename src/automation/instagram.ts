import { Browser, Page, ElementHandle } from 'playwright';
import { Logger } from '../core/logger';
import { Config } from '../core/config';
import { ProxyManager } from './proxies';
import { InstagramSelectors } from './selectors';
import { RateLimiter } from '../utils/rate-limiter';

interface LoginOptions {
  username: string;
  password: string;
  twoFactorCode?: string;
}

interface PostOptions {
  mediaUrls: string[];
  caption: string;
  hashtags: string[];
  location?: string;
}

interface PostData {
  id: string;
  type: 'image' | 'carousel' | 'video';
  caption: string;
  hashtags: string[];
  likeCount: number;
  commentCount: number;
  timestamp: string;
  url: string;
}

interface ProfileData {
  username: string;
  fullName: string;
  bio: string;
  website: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isVerified: boolean;
  isPrivate: boolean;
}

// Create a mock permission status that matches the PermissionStatus interface
interface MockPermissionStatus extends PermissionStatus {
  state: PermissionState;
  name: string;
  onchange: ((this: PermissionStatus, ev: Event) => any) | null;
}

export class InstagramAutomation {
  private page: Page | null = null;
  private rateLimiter: RateLimiter;
  private isLoggedIn = false;

  constructor(
    private browser: Browser,
    private logger: Logger,
    private proxyManager: ProxyManager,
    private config: Config
  ) {
    this.rateLimiter = new RateLimiter({
      maxRequests: config.get('instagram.limits.requestsPerHour'),
      timeWindow: 3600, // 1 hour
      minDelay: 1000,  // 1 second
      maxDelay: 5000   // 5 seconds
    });
  }

  /**
   * Initialize automation
   */
  async initialize(): Promise<void> {
    try {
      // Create new page with proxy
      const proxy = await this.proxyManager.getProxy();
      const context = await this.browser.newContext({
        proxy: {
          server: proxy.url,
          username: proxy.username,
          password: proxy.password
        }
      });

      this.page = await context.newPage();

      // Set user agent and viewport
      await this.page.setViewportSize({ width: 1280, height: 800 });
      await this.page.setExtraHTTPHeaders({
        'User-Agent': this.config.get('instagram.userAgent')
      });

      // Disable notifications
      await this.page.addInitScript(() => {
        window.Notification = { requestPermission: () => Promise.resolve('denied') };
        
        // Create a fully compliant PermissionStatus mock
        const mockPermissionStatus: MockPermissionStatus = {
          state: 'denied',
          name: '',
          onchange: null,
          addEventListener: function(): void {},
          removeEventListener: function(): void {},
          dispatchEvent: function(): boolean { return false; }
        };
        
        // Override the navigator.permissions.query method
        navigator.permissions = {
          query: () => Promise.resolve(mockPermissionStatus)
        };
      });

      this.logger.info('Instagram automation initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Instagram automation', { error });
      throw error;
    }
  }

  /**
   * Login to Instagram
   */
  async login(options: LoginOptions): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    try {
      await this.rateLimiter.wait();

      // Navigate to login page
      await this.page.goto('https://www.instagram.com/accounts/login/');
      await this.page.waitForLoadState('networkidle');

      // Accept cookies if prompted
      const acceptCookiesButton = await this.page.$(InstagramSelectors.ACCEPT_COOKIES_BUTTON);
      if (acceptCookiesButton) {
        await acceptCookiesButton.click();
      }

      // Enter credentials
      await this.page.fill(InstagramSelectors.USERNAME_INPUT, options.username);
      await this.page.fill(InstagramSelectors.PASSWORD_INPUT, options.password);
      await this.page.click(InstagramSelectors.LOGIN_BUTTON);

      // Handle two-factor authentication
      if (options.twoFactorCode) {
        await this.page.waitForSelector(InstagramSelectors.TWO_FACTOR_INPUT);
        await this.page.fill(InstagramSelectors.TWO_FACTOR_INPUT, options.twoFactorCode);
        await this.page.click(InstagramSelectors.TWO_FACTOR_SUBMIT);
      }

      // Handle "Save Login Info" prompt
      const saveLoginButton = await this.page.$(InstagramSelectors.SAVE_LOGIN_INFO);
      if (saveLoginButton) {
        await this.page.click(InstagramSelectors.NOT_NOW_BUTTON);
      }

      // Verify login success
      await this.page.waitForSelector(InstagramSelectors.PROFILE_ICON);
      this.isLoggedIn = true;

      this.logger.info('Successfully logged in to Instagram');
    } catch (error) {
      this.logger.error('Failed to login to Instagram', { error });
      throw error;
    }
  }

  /**
   * Create a new post
   */
  async createPost(options: PostOptions): Promise<void> {
    if (!this.page || !this.isLoggedIn) {
      throw new Error('Not logged in');
    }

    try {
      await this.rateLimiter.wait();

      // Click create post button
      await this.page.click(InstagramSelectors.CREATE_POST_BUTTON);
      await this.page.waitForSelector(InstagramSelectors.FILE_INPUT);

      // Upload media files
      const fileInput = await this.page.$(InstagramSelectors.FILE_INPUT);
      if (!fileInput) {
        throw new Error('File input not found');
      }

      await fileInput.setInputFiles(options.mediaUrls);
      await this.page.click(InstagramSelectors.NEXT_BUTTON);

      // Add caption and hashtags
      await this.page.waitForSelector(InstagramSelectors.CAPTION_INPUT);
      const caption = `${options.caption}\n\n${options.hashtags.join(' ')}`;
      await this.page.fill(InstagramSelectors.CAPTION_INPUT, caption);

      // Add location if provided
      if (options.location) {
        await this.page.click(InstagramSelectors.ADD_LOCATION_BUTTON);
        await this.page.fill(InstagramSelectors.LOCATION_SEARCH_INPUT, options.location);
        await this.page.click(InstagramSelectors.LOCATION_RESULT);
      }

      // Share post
      await this.page.click(InstagramSelectors.SHARE_BUTTON);
      await this.page.waitForSelector(InstagramSelectors.POST_SUCCESS_INDICATOR);

      this.logger.info('Post created successfully');
    } catch (error) {
      this.logger.error('Failed to create post', { error });
      throw error;
    }
  }

  /**
   * Get recent posts from a profile
   */
  async getRecentPosts(username: string, limit: number = 12): Promise<PostData[]> {
    if (!this.page || !this.isLoggedIn) {
      throw new Error('Not logged in');
    }

    try {
      await this.rateLimiter.wait();

      // Navigate to profile
      await this.page.goto(`https://www.instagram.com/${username}/`);
      await this.page.waitForSelector(InstagramSelectors.POST_ITEMS);

      // Extract post data with proper type annotations
      const posts = await this.page.evaluate((selectors) => {
        const postElements = document.querySelectorAll(selectors.POST_ITEMS);
        const posts: Array<{
          id: string;
          type: 'image' | 'carousel' | 'video';
          caption: string;
          hashtags: string[];
          likeCount: number;
          commentCount: number;
          timestamp: string;
          url: string;
        }> = [];

        postElements.forEach((post, index) => {
          if (index >= 12) return;

          const postData = {
            id: post.getAttribute('data-id') || '',
            type: 'image' as const,
            caption: post.querySelector(selectors.POST_CAPTION)?.textContent || '',
            hashtags: Array.from(post.querySelectorAll(selectors.POST_HASHTAGS))
              .map(tag => tag.textContent || '')
              .filter(Boolean),
            likeCount: parseInt(post.querySelector(selectors.POST_LIKE_COUNT)?.textContent || '0'),
            commentCount: parseInt(post.querySelector(selectors.POST_COMMENT_COUNT)?.textContent || '0'),
            timestamp: post.querySelector(selectors.POST_TIMESTAMP)?.getAttribute('datetime') || '',
            url: post.querySelector(selectors.POST_IMAGE)?.getAttribute('src') || ''
          };

          if (post.querySelector(selectors.VIDEO_INDICATOR)) {
            postData.type = 'video';
          } else if (post.querySelectorAll(selectors.POST_IMAGE).length > 1) {
            postData.type = 'carousel';
          }

          posts.push(postData);
        });

        return posts;
      }, InstagramSelectors);

      if (!Array.isArray(posts)) {
        return [];
      }

      return posts.slice(0, limit);
    } catch (error) {
      this.logger.error('Failed to get recent posts', { error });
      throw error;
    }
  }

  /**
   * Get profile information
   */
  async getProfile(username: string): Promise<ProfileData> {
    if (!this.page || !this.isLoggedIn) {
      throw new Error('Not logged in');
    }

    try {
      await this.rateLimiter.wait();

      await this.page.goto(`https://www.instagram.com/${username}/`);
      await this.page.waitForSelector(InstagramSelectors.PROFILE_USERNAME);

      const profile = await this.page.evaluate((selectors) => {
        return {
          username: document.querySelector(selectors.PROFILE_USERNAME)?.textContent || '',
          fullName: document.querySelector(selectors.PROFILE_FULL_NAME)?.textContent || '',
          bio: document.querySelector(selectors.PROFILE_BIO)?.textContent || '',
          website: document.querySelector(selectors.PROFILE_WEBSITE)?.getAttribute('href') || '',
          followerCount: parseInt(document.querySelector(selectors.FOLLOWER_COUNT)?.textContent || '0'),
          followingCount: parseInt(document.querySelector(selectors.FOLLOWING_COUNT)?.textContent || '0'),
          postCount: parseInt(document.querySelector(selectors.POST_COUNT)?.textContent || '0'),
          isVerified: Boolean(document.querySelector(selectors.VERIFIED_BADGE)),
          isPrivate: Boolean(document.querySelector(selectors.PRIVATE_ACCOUNT_INDICATOR))
        };
      }, InstagramSelectors);

      return profile as ProfileData;
    } catch (error) {
      this.logger.error('Failed to get profile information', { error });
      throw error;
    }
  }

  /**
   * Like a post
   */
  async likePost(postUrl: string): Promise<void> {
    if (!this.page || !this.isLoggedIn) {
      throw new Error('Not logged in');
    }

    try {
      await this.rateLimiter.wait();

      await this.page.goto(postUrl);
      await this.page.waitForSelector(InstagramSelectors.LIKE_BUTTON);
      await this.page.click(InstagramSelectors.LIKE_BUTTON);

      this.logger.info('Post liked successfully');
    } catch (error) {
      this.logger.error('Failed to like post', { error });
      throw error;
    }
  }

  /**
   * Comment on a post
   */
  async commentOnPost(postUrl: string, comment: string): Promise<void> {
    if (!this.page || !this.isLoggedIn) {
      throw new Error('Not logged in');
    }

    try {
      await this.rateLimiter.wait();

      await this.page.goto(postUrl);
      await this.page.waitForSelector(InstagramSelectors.COMMENT_INPUT);
      await this.page.fill(InstagramSelectors.COMMENT_INPUT, comment);
      await this.page.click(InstagramSelectors.COMMENT_SUBMIT);

      this.logger.info('Comment posted successfully');
    } catch (error) {
      this.logger.error('Failed to post comment', { error });
      throw error;
    }
  }

  /**
   * Follow a user
   */
  async followUser(username: string): Promise<void> {
    if (!this.page || !this.isLoggedIn) {
      throw new Error('Not logged in');
    }

    try {
      await this.rateLimiter.wait();

      await this.page.goto(`https://www.instagram.com/${username}/`);
      await this.page.waitForSelector(InstagramSelectors.FOLLOW_BUTTON);
      await this.page.click(InstagramSelectors.FOLLOW_BUTTON);

      this.logger.info('User followed successfully');
    } catch (error) {
      this.logger.error('Failed to follow user', { error });
      throw error;
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(username: string): Promise<void> {
    if (!this.page || !this.isLoggedIn) {
      throw new Error('Not logged in');
    }

    try {
      await this.rateLimiter.wait();

      await this.page.goto(`https://www.instagram.com/${username}/`);
      await this.page.waitForSelector(InstagramSelectors.UNFOLLOW_BUTTON);
      await this.page.click(InstagramSelectors.UNFOLLOW_BUTTON);
      await this.page.click(InstagramSelectors.CONFIRM_UNFOLLOW_BUTTON);

      this.logger.info('User unfollowed successfully');
    } catch (error) {
      this.logger.error('Failed to unfollow user', { error });
      throw error;
    }
  }
}