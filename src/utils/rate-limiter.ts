/**
 * Rate limiter to prevent API abuse and account flagging
 */
interface RateLimiterOptions {
  maxRequests: number;     // Maximum requests in the time window
  timeWindow: number;      // Time window in seconds
  minDelay?: number;       // Minimum delay between requests in ms
  maxDelay?: number;       // Maximum delay for random jitter in ms
}

export class RateLimiter {
  private maxRequests: number;
  private timeWindow: number;
  private minDelay: number;
  private maxDelay: number;
  private requestTimestamps: number[] = [];

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.timeWindow = options.timeWindow * 1000; // Convert to milliseconds
    this.minDelay = options.minDelay || 1000;    // Default 1 second
    this.maxDelay = options.maxDelay || 5000;    // Default 5 seconds
  }

  /**
   * Wait for rate limit if necessary
   */
  async wait(): Promise<void> {
    // Clean up old timestamps
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < this.timeWindow
    );

    // Check if we've hit the rate limit
    if (this.requestTimestamps.length >= this.maxRequests) {
      // Calculate time to wait
      const oldestTimestamp = this.requestTimestamps[0];
      const timeToWait = this.timeWindow - (now - oldestTimestamp);
      
      if (timeToWait > 0) {
        await new Promise(resolve => setTimeout(resolve, timeToWait));
      }
      
      // Clear the timestamps and start fresh
      this.requestTimestamps = [];
    }

    // Add random delay to avoid patterns
    const randomDelay = Math.floor(
      Math.random() * (this.maxDelay - this.minDelay) + this.minDelay
    );
    
    await new Promise(resolve => setTimeout(resolve, randomDelay));
    
    // Add current timestamp
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Get current rate limit status
   */
  getStatus(): { used: number; remaining: number; resetIn: number } {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < this.timeWindow
    );
    
    const used = this.requestTimestamps.length;
    const remaining = Math.max(0, this.maxRequests - used);
    
    let resetIn = 0;
    if (used > 0) {
      const oldestTimestamp = this.requestTimestamps[0];
      resetIn = Math.max(0, this.timeWindow - (now - oldestTimestamp));
    }
    
    return {
      used,
      remaining,
      resetIn
    };
  }
}