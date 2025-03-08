import { logger } from '../core/logger';
import { config } from '../core/config';
import { Browser, chromium } from 'playwright';
import { InstagramAutomation } from '../automation/instagram';
import { ProxyManager } from '../automation/proxies';
import { CompetitorAnalyzer } from '../ai/competitor-analyzer';
import { OpenAIClient } from '../api/openai';
import { BraveSearchClient } from '../api/brave';
import { Repository } from '../database/repository';
import { connectDatabase } from '../database/connection';

async function main() {
  let browser: Browser | null = null;
  
  try {
    logger.info('Starting competitor analysis task');
    
    // Connect to database
    await connectDatabase();
    
    // Initialize browser
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage']
    });
    
    // Initialize components
    const repository = new Repository();
    const proxyManager = new ProxyManager(logger.child('proxy'), config);
    await proxyManager.initialize();
    
    const instagram = new InstagramAutomation(
      browser,
      logger.child('instagram'),
      proxyManager,
      config
    );
    await instagram.initialize();
    
    const openai = new OpenAIClient(
      logger.child('openai'),
      config.get('api.openai.key')
    );
    
    const braveSearch = new BraveSearchClient(
      logger.child('braveSearch'),
      config.get('api.braveSearch.key')
    );
    
    const competitorAnalyzer = new CompetitorAnalyzer(
      logger.child('competitorAnalyzer'),
      config,
      instagram,
      braveSearch,
      repository,
      openai
    );
    
    // Analyze competitors
    const analysis = await competitorAnalyzer.getLatestInsights();
    
    logger.info('Competitor analysis completed', {
      competitors: analysis.insights.length,
      recommendations: Object.keys(analysis.recommendations).length
    });
  } catch (error) {
    logger.error('Error in competitor analysis task', { error });
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the task
if (require.main === module) {
  main().catch(console.error);
}

export { main as analyzeCompetitors };