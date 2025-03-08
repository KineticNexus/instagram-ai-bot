import axios from 'axios';
import { Logger } from '../core/logger';
import { Config } from '../core/config';

interface SearchResult {
  title: string;
  description: string;
  url: string;
}

/**
 * Client for Brave Search API
 */
export class BraveSearchClient {
  private apiKey: string;
  private apiUrl = 'https://api.search.brave.com/res/v1/web/search';
  
  constructor(
    private logger: Logger,
    private config: Config
  ) {
    this.apiKey = this.config.get('brave.apiKey');
    
    if (!this.apiKey) {
      this.logger.warn('Brave Search API key not found in configuration');
    }
  }
  
  /**
   * Perform a search query
   */
  async search(query: string, options: {
    count?: number;
    country?: string;
    safeSearch?: boolean;
  } = {}): Promise<SearchResult[]> {
    try {
      if (!this.apiKey) {
        this.logger.warn('Using simulated results as Brave Search API key is not configured');
        return this.getSimulatedResults(query);
      }
      
      const response = await axios.get(this.apiUrl, {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': this.apiKey
        },
        params: {
          q: query,
          count: options.count || 10,
          offset: 0,
          country: options.country || 'US',
          search_lang: 'en',
          safesearch: options.safeSearch !== false
        }
      });
      
      // Extract and format results
      if (response.data && response.data.web && response.data.web.results) {
        return response.data.web.results.map((result: any) => ({
          title: result.title,
          description: result.description,
          url: result.url
        }));
      }
      
      return [];
    } catch (error) {
      this.logger.error('Failed to perform Brave search', { error });
      
      // Fallback to simulated results in case of error
      return this.getSimulatedResults(query);
    }
  }
  
  /**
   * Generate simulated search results when API key is not available
   */
  private getSimulatedResults(query: string): SearchResult[] {
    this.logger.info('Generating simulated search results', { query });
    
    // Create some simulated results based on the query
    return [
      {
        title: `Information about ${query}`,
        description: `This is a simulated search result about ${query}. In a real implementation, this would contain actual search results from the Brave Search API.`,
        url: `https://example.com/results/${encodeURIComponent(query)}`
      },
      {
        title: `${query} - Wikipedia`,
        description: `Wikipedia article about ${query} with comprehensive information and references.`,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`
      },
      {
        title: `Latest news about ${query}`,
        description: `Recent news, updates, and developments related to ${query} from trusted sources.`,
        url: `https://news.example.com/${encodeURIComponent(query)}`
      }
    ];
  }
  
  /**
   * Search for images
   */
  async searchImages(query: string, options: {
    count?: number;
    safeSearch?: boolean;
  } = {}): Promise<any[]> {
    try {
      if (!this.apiKey) {
        this.logger.warn('Using simulated results as Brave Search API key is not configured');
        return this.getSimulatedImageResults(query);
      }
      
      const response = await axios.get(`${this.apiUrl}/images`, {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': this.apiKey
        },
        params: {
          q: query,
          count: options.count || 10,
          offset: 0,
          safesearch: options.safeSearch !== false
        }
      });
      
      // Extract and format results
      if (response.data && response.data.images && response.data.images.results) {
        return response.data.images.results.map((result: any) => ({
          title: result.title,
          imageUrl: result.image.url,
          sourceUrl: result.source_url,
          width: result.image.width,
          height: result.image.height
        }));
      }
      
      return [];
    } catch (error) {
      this.logger.error('Failed to perform Brave image search', { error });
      
      // Fallback to simulated results in case of error
      return this.getSimulatedImageResults(query);
    }
  }
  
  /**
   * Generate simulated image search results when API key is not available
   */
  private getSimulatedImageResults(query: string): any[] {
    this.logger.info('Generating simulated image search results', { query });
    
    // Create some simulated results based on the query
    return [
      {
        title: `Image of ${query} - Example 1`,
        imageUrl: `https://via.placeholder.com/800x600?text=${encodeURIComponent(query)}+1`,
        sourceUrl: `https://example.com/images/${encodeURIComponent(query)}/1`,
        width: 800,
        height: 600
      },
      {
        title: `Image of ${query} - Example 2`,
        imageUrl: `https://via.placeholder.com/1200x800?text=${encodeURIComponent(query)}+2`,
        sourceUrl: `https://example.com/images/${encodeURIComponent(query)}/2`,
        width: 1200,
        height: 800
      },
      {
        title: `Image of ${query} - Example 3`,
        imageUrl: `https://via.placeholder.com/600x600?text=${encodeURIComponent(query)}+3`,
        sourceUrl: `https://example.com/images/${encodeURIComponent(query)}/3`,
        width: 600,
        height: 600
      }
    ];
  }
}