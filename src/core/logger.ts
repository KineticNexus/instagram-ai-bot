import * as winston from 'winston';
import { config } from './config';
import * as path from 'path';
import * as fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom format for console logs with colors
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} ${level}: ${message} ${metaString}`;
  })
);

/**
 * Format for file logs (without colors)
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json()
);

/**
 * Logger class for application logging
 */
export class Logger {
  private logger: winston.Logger;
  private context: string;

  /**
   * Create a new logger instance
   * @param context Context name for the logger
   */
  constructor(context: string = 'app') {
    this.context = context;
    const level = config.get<string>('logging.level', 'info');

    this.logger = winston.createLogger({
      level,
      defaultMeta: { context },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: consoleFormat
        }),
        // File transport for all logs
        new winston.transports.File({
          filename: path.join(logsDir, 'combined.log'),
          format: fileFormat,
          maxsize: 10485760, // 10MB
          maxFiles: 5
        }),
        // File transport for error logs
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          format: fileFormat,
          maxsize: 10485760, // 10MB
          maxFiles: 5
        })
      ]
    });
  }

  /**
   * Log a debug message
   * @param message Message to log
   * @param meta Additional metadata
   */
  debug(message: string, meta: Record<string, any> = {}): void {
    this.logger.debug(message, { ...meta, context: this.context });
  }

  /**
   * Log an info message
   * @param message Message to log
   * @param meta Additional metadata
   */
  info(message: string, meta: Record<string, any> = {}): void {
    this.logger.info(message, { ...meta, context: this.context });
  }

  /**
   * Log a warning message
   * @param message Message to log
   * @param meta Additional metadata
   */
  warn(message: string, meta: Record<string, any> = {}): void {
    this.logger.warn(message, { ...meta, context: this.context });
  }

  /**
   * Log an error message
   * @param message Message to log
   * @param meta Additional metadata
   */
  error(message: string, meta: Record<string, any> = {}): void {
    if (meta.error instanceof Error) {
      const error = meta.error;
      meta.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    }
    this.logger.error(message, { ...meta, context: this.context });
  }

  /**
   * Create a child logger with a specific context
   * @param context Context name for the child logger
   */
  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }
}

// Export a default logger instance
export const logger = new Logger();