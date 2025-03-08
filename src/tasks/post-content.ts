import { logger } from '../core/logger';
import { config } from '../core/config';
import { Browser, chromium } from 'playwright';
import { InstagramAutomation } from '../automation/instagram';
import { ProxyManager } from '../automation/proxies';
import { ContentGenerator } from '../ai/content-generator';
import { DecisionEngine } from '../ai/decision-engine';
import { OpenAIClient } from '../api/openai';
import { ImageProcessor } from '../utils/image-processing';
import { Repository } from '../database/repository';
import { connectDatabase } from '../database/connection';

async function main() {
  let browser: Browser | null = null;
  
  try {
    logger.info('Starting post content task');
    
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
    
    const imageProcessor = new ImageProcessor(
      logger.child('imageProcessor')
    );
    
    const contentGenerator = new ContentGenerator(
      openai,
      logger.child('contentGenerator'),
      config,
      imageProcessor,
      repository
    );
    
    // Generate and post content
    const content = await contentGenerator.generateContent();
    await instagram.createPost(content);
    
    logger.info('Content posted successfully');
  } catch (error) {
    logger.error('Error in post content task', { error });
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

export { main as postContent };