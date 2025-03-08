/**
 * Rate limiter to prevent API abuse detection
 */
interface RateLimiterOptions {
  maxRequests: number;  // Maximum number of requests
  timeWindow: number;   // Time window in seconds
  minDelay?: number;    // Minimum delay between requests in milliseconds
  maxDelay?: number;    // Maximum delay between requests in milliseconds
}

export class RateLimiter {
  private maxRequests: number;
  private timeWindow: number;
  private minDelay: number;
  private maxDelay: number;
  private requestTimes: number[] = [];
  
  /**
   * Create a new rate limiter
   * @param options Rate limiter options
   */
  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.timeWindow = options.timeWindow * 1000; // Convert to milliseconds
    this.minDelay = options.minDelay || 500; // Default minimum delay is 500ms
    this.maxDelay = options.maxDelay || 3000; // Default maximum delay is 3 seconds
  }
  
  /**
   * Wait for rate limit if necessary
   * @returns Promise that resolves when it's safe to make a request
   */
  async wait(): Promise<void> {
    // Add random delay to appear more human-like
    await this.randomDelay();
    
    // Check if we need to wait for rate limit
    const now = Date.now();
    
    // Clean up old request times
    this.requestTimes = this.requestTimes.filter(time => now - time < this.timeWindow);
    
    // If we've hit the rate limit, wait until the oldest request drops off
    if (this.requestTimes.length >= this.maxRequests) {
      const oldestTime = this.requestTimes[0];
      const timeToWait = this.timeWindow - (now - oldestTime);
      
      if (timeToWait > 0) {
        await new Promise(resolve => setTimeout(resolve, timeToWait));
      }
    }
    
    // Add current time to request times
    this.requestTimes.push(Date.now());
  }
  
  /**
   * Add a random delay to requests to make them appear more human-like
   */
  private async randomDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * (this.maxDelay - this.minDelay)) + this.minDelay;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.requestTimes = [];
  }
  
  /**
   * Get the number of requests made in the current time window
   */
  get currentRequestCount(): number {
    const now = Date.now();
    return this.requestTimes.filter(time => now - time < this.timeWindow).length;
  }
  
  /**
   * Check if the rate limit has been reached
   */
  get isRateLimited(): boolean {
    return this.currentRequestCount >= this.maxRequests;
  }
  
  /**
   * Get the time in milliseconds until the rate limit resets
   */
  get timeUntilReset(): number {
    if (this.requestTimes.length === 0) {
      return 0;
    }
    
    const now = Date.now();
    const oldestTime = this.requestTimes[0];
    const timeElapsed = now - oldestTime;
    
    return Math.max(0, this.timeWindow - timeElapsed);
  }
}