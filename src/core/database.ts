import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';
import { Config } from './config';

/**
 * Simple JSON file-based database
 * In a production environment, this would be replaced with a proper database system
 */
export class Database {
  private dbPath: string;
  private data: Record<string, any> = {};
  private isConnected = false;

  constructor(
    private logger: Logger,
    private config: Config
  ) {
    const dbDir = config.get('database.directory', 'data');
    const dbFile = config.get('database.file', 'db.json');
    this.dbPath = path.join(process.cwd(), dbDir, dbFile);
  }

  /**
   * Connect to database
   */
  async connect(): Promise<void> {
    try {
      this.logger.info('Connecting to database');

      // Ensure directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Load data if file exists
      if (fs.existsSync(this.dbPath)) {
        const fileContent = fs.readFileSync(this.dbPath, 'utf-8');
        this.data = JSON.parse(fileContent);
      } else {
        // Initialize with empty data
        this.data = {
          posts: [],
          actions: [],
          metrics: {},
          users: [],
          accounts: []
        };
        await this.save();
      }

      this.isConnected = true;
      this.logger.info('Connected to database');
    } catch (error) {
      this.logger.error('Failed to connect to database', { error });
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    try {
      this.logger.info('Disconnecting from database');
      await this.save();
      this.isConnected = false;
      this.logger.info('Disconnected from database');
    } catch (error) {
      this.logger.error('Failed to disconnect from database', { error });
      throw error;
    }
  }

  /**
   * Save data to file
   */
  async save(): Promise<void> {
    try {
      await fs.promises.writeFile(this.dbPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      this.logger.error('Failed to save database', { error });
      throw error;
    }
  }

  /**
   * Get data by collection and ID
   */
  async get<T>(collection: string, id?: string): Promise<T | T[] | null> {
    this.ensureConnected();

    if (!this.data[collection]) {
      return null;
    }

    if (id) {
      const item = this.data[collection].find((item: any) => item.id === id);
      return item || null;
    }

    return this.data[collection];
  }

  /**
   * Insert data into collection
   */
  async insert<T>(collection: string, item: T): Promise<T> {
    this.ensureConnected();

    if (!this.data[collection]) {
      this.data[collection] = [];
    }

    this.data[collection].push(item);
    await this.save();

    return item;
  }

  /**
   * Update data in collection
   */
  async update<T>(collection: string, id: string, updates: Partial<T>): Promise<T | null> {
    this.ensureConnected();

    if (!this.data[collection]) {
      return null;
    }

    const index = this.data[collection].findIndex((item: any) => item.id === id);
    if (index === -1) {
      return null;
    }

    this.data[collection][index] = { ...this.data[collection][index], ...updates };
    await this.save();

    return this.data[collection][index];
  }

  /**
   * Delete data from collection
   */
  async delete(collection: string, id: string): Promise<boolean> {
    this.ensureConnected();

    if (!this.data[collection]) {
      return false;
    }

    const initialLength = this.data[collection].length;
    this.data[collection] = this.data[collection].filter((item: any) => item.id !== id);

    if (initialLength !== this.data[collection].length) {
      await this.save();
      return true;
    }

    return false;
  }

  /**
   * Ensure database is connected
   */
  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new Error('Database is not connected');
    }
  }
}