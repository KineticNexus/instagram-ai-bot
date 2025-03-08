import * as winston from 'winston';
import * as path from 'path';

/**
 * Logger utility for consistent logging across the application
 */
export class Logger {
  private logger: winston.Logger;

  constructor() {
    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs');

    // Configure logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'instagram-ai-bot' },
      transports: [
        // Console logger
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, meta, service }) => {
              return `${timestamp} [${service}] ${level}: ${message} ${meta ? JSON.stringify(meta) : ''}`;
            })
          )
        }),
        
        // File logger for all logs
        new winston.transports.File({ filename: path.join(logsDir, 'combined.log') }),
        
        // File logger for errors only
        new winston.transports.File({ 
          filename: path.join(logsDir, 'error.log'),
          level: 'error'
        })
      ]
    });
  }

  /**
   * Log informational message
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, { meta });
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(message, { meta });
  }

  /**
   * Log error message
   */
  error(message: string, meta?: any): void {
    this.logger.error(message, { meta });
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: any): void {
    this.logger.debug(message, { meta });
  }
}