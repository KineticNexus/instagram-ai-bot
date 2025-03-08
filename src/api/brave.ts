import axios from 'axios';
import { Logger } from '../core/logger';

export class BraveSearchClient {
  private baseUrl = 'https://api.search.brave.com/res/v1';

  constructor(
    private logger: Logger,
    private apiKey: string
  ) {}

  /**
   * Search web content
   */
  async search(query: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/web/search`, {
        headers: {
          'X-Subscription-Token': this.apiKey,
          'Accept': 'application/json'
        },
        params: {
          q: query,
          format: 'json'
        }
      });

      return response.data;
    } catch (error) {
      this.logger.error('Search failed', { error });
      throw new Error(`Failed to search: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get suggestions for a query
   */
  async getSuggestions(query: string): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/suggest`, {
        headers: {
          'X-Subscription-Token': this.apiKey,
          'Accept': 'application/json'
        },
        params: {
          q: query,
          format: 'json'
        }
      });

      return response.data.suggestions || [];
    } catch (error) {
      this.logger.error('Failed to get suggestions', { error });
      throw new Error(`Failed to get suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search news content
   */
  async searchNews(query: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/news/search`, {
        headers: {
          'X-Subscription-Token': this.apiKey,
          'Accept': 'application/json'
        },
        params: {
          q: query,
          format: 'json'
        }
      });

      return response.data;
    } catch (error) {
      this.logger.error('News search failed', { error });
      throw new Error(`Failed to search news: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search images
   */
  async searchImages(query: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/images/search`, {
        headers: {
          'X-Subscription-Token': this.apiKey,
          'Accept': 'application/json'
        },
        params: {
          q: query,
          format: 'json'
        }
      });

      return response.data;
    } catch (error) {
      this.logger.error('Image search failed', { error });
      throw new Error(`Failed to search images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}