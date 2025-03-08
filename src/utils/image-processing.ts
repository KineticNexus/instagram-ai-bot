import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import axios from 'axios';
import { Logger } from '../core/logger';
import { Config } from '../core/config';

// Only use Sharp types, not the actual import
type Sharp = any;
type SharpInstance = any;

interface ImageDimensions {
  width: number;
  height: number;
}

interface FilterOptions {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hue?: number;
  sepia?: number;
}

interface TextOverlayOptions {
  text: string;
  position?: 'top' | 'bottom' | 'center';
  fontSize?: number;
  color?: string;
  background?: string;
}

interface CollageOptions {
  images: string[];
  columns?: number;
  spacing?: number;
  background?: string;
}

export class ImageProcessor {
  private uploadDir: string;

  constructor(
    private logger: Logger,
    private config: Config
  ) {
    this.uploadDir = this.config.get('uploads.directory') || 'uploads';
    this.ensureUploadDirectory();
  }

  /**
   * Optimize image for Instagram feed
   * Instagram feed images: max width 1080px, aspect ratio between 4:5 and 1.91:1
   */
  async optimizeForInstagram(imageUrl: string): Promise<string> {
    try {
      // Download image if it's a URL
      const imagePath = await this.downloadImageIfUrl(imageUrl);
      
      // Dynamically load sharp module
      const sharp = await this.getSharpModule();
      
      // Get image dimensions
      const metadata = await sharp(imagePath).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      // Calculate optimal dimensions for Instagram
      const maxWidth = 1080;
      const maxHeight = 1350; // 1080 * 5/4 (for 4:5 aspect ratio)
      const minHeight = 566; // 1080 / 1.91 (for 1.91:1 aspect ratio)

      const dimensions = this.calculateDimensions(
        { width, height }, 
        { maxWidth, maxHeight, minHeight }
      );

      // Resize image
      const resizedImage = sharp(imagePath)
        .resize(dimensions.width, dimensions.height, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        });

      // Save image
      const outputPath = await this.saveImage(resizedImage, 'instagram');

      return outputPath;
    } catch (error) {
      this.logger.error('Failed to optimize image for Instagram', { error });
      throw new Error('Failed to optimize image for Instagram');
    }
  }

  /**
   * Optimize image for Instagram story
   * Instagram stories: 1080px × 1920px (9:16 aspect ratio)
   */
  async optimizeForInstagramStory(imageUrl: string): Promise<string> {
    try {
      const imagePath = await this.downloadImageIfUrl(imageUrl);
      const sharp = await this.getSharpModule();
      
      const metadata = await sharp(imagePath).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      // Calculate dimensions for Instagram story (9:16 aspect ratio)
      const targetWidth = 1080;
      const targetHeight = 1920;

      // Resize and crop to fit the 9:16 aspect ratio
      const resizedImage = sharp(imagePath)
        .resize(targetWidth, targetHeight, {
          fit: 'cover',
          position: 'center'
        });

      // Save image
      const outputPath = await this.saveImage(resizedImage, 'story');

      return outputPath;
    } catch (error) {
      this.logger.error('Failed to optimize image for Instagram story', { error });
      throw new Error('Failed to optimize image for Instagram story');
    }
  }

  /**
   * Apply filters to image
   */
  async applyFilters(imageUrl: string, options: FilterOptions): Promise<string> {
    try {
      const imagePath = await this.downloadImageIfUrl(imageUrl);
      const sharp = await this.getSharpModule();
      
      // Apply filters
      let filteredImage = sharp(imagePath);
      
      if (options.brightness !== undefined) {
        filteredImage = filteredImage.modulate({ brightness: options.brightness });
      }
      
      if (options.contrast !== undefined) {
        filteredImage = filteredImage.modulate({ contrast: options.contrast });
      }
      
      if (options.saturation !== undefined) {
        filteredImage = filteredImage.modulate({ saturation: options.saturation });
      }
      
      if (options.hue !== undefined) {
        filteredImage = filteredImage.modulate({ hue: options.hue });
      }
      
      if (options.sepia !== undefined) {
        filteredImage = filteredImage.tint({ r: 112, g: 66, b: 20 });
      }

      // Save image
      const outputPath = await this.saveImage(filteredImage, 'filtered');

      return outputPath;
    } catch (error) {
      this.logger.error('Failed to apply filters to image', { error });
      throw new Error('Failed to apply filters to image');
    }
  }

  /**
   * Create a collage from multiple images
   */
  async createCollage(options: CollageOptions): Promise<string> {
    try {
      const { images, columns = 2, spacing = 10, background = '#ffffff' } = options;
      
      // Download all images
      const imagePaths = await Promise.all(
        images.map(url => this.downloadImageIfUrl(url))
      );
      
      const sharp = await this.getSharpModule();
      
      // Get dimensions of all images
      const imageMetadata = await Promise.all(
        imagePaths.map(path => sharp(path).metadata())
      );
      
      // Calculate dimensions for each image in the collage
      const maxWidth = Math.floor(1080 / columns) - spacing;
      const processedImages = await Promise.all(
        imagePaths.map(async (path, i) => {
          const metadata = imageMetadata[i];
          const width = metadata.width || 0;
          const height = metadata.height || 0;
          
          // Calculate dimensions while maintaining aspect ratio
          const dimensions = this.calculateDimensions(
            { width, height },
            { maxWidth }
          );
          
          // Resize image
          return sharp(path)
            .resize(dimensions.width, dimensions.height, {
              fit: 'contain',
              background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .toBuffer();
        })
      );
      
      // Calculate collage dimensions
      const rows = Math.ceil(images.length / columns);
      const maxHeight = Math.max(...imageMetadata.map(m => m.height || 0));
      const collageWidth = columns * maxWidth + (columns + 1) * spacing;
      const collageHeight = rows * maxHeight + (rows + 1) * spacing;
      
      // Create blank canvas
      const canvas = sharp({
        create: {
          width: collageWidth,
          height: collageHeight,
          channels: 4,
          background: background
        }
      });
      
      // Compute positions of each image
      const compositeOptions = processedImages.map((buffer, i) => {
        const row = Math.floor(i / columns);
        const col = i % columns;
        const x = col * maxWidth + (col + 1) * spacing;
        const y = row * maxHeight + (row + 1) * spacing;
        
        return {
          input: buffer,
          left: x,
          top: y
        };
      });
      
      // Composite images onto canvas
      const collage = canvas.composite(compositeOptions);
      
      // Save collage
      const outputPath = await this.saveImage(collage, 'collage');
      
      return outputPath;
    } catch (error) {
      this.logger.error('Failed to create collage', { error });
      throw new Error('Failed to create collage');
    }
  }

  /**
   * Add text overlay to image
   */
  async addTextOverlay(imageUrl: string, options: TextOverlayOptions): Promise<string> {
    try {
      const imagePath = await this.downloadImageIfUrl(imageUrl);
      const sharp = await this.getSharpModule();
      const { text, position = 'bottom', fontSize = 32, color = 'white', background = 'rgba(0,0,0,0.5)' } = options;
      
      // Get image dimensions
      const metadata = await sharp(imagePath).metadata();
      const width = metadata.width || 0;
      
      // Create text overlay
      const svgText = `
        <svg width="${width}" height="${fontSize * 2}">
          <rect width="${width}" height="${fontSize * 2}" fill="${background}"/>
          <text x="${width / 2}" y="${fontSize + 5}" font-family="Arial" font-size="${fontSize}" fill="${color}" text-anchor="middle">${text}</text>
        </svg>
      `;
      
      // Compute position
      let overlayOptions;
      if (position === 'top') {
        overlayOptions = { top: 0, left: 0 };
      } else if (position === 'bottom') {
        overlayOptions = { top: (metadata.height || 0) - fontSize * 2, left: 0 };
      } else {
        overlayOptions = { top: (metadata.height || 0) / 2 - fontSize, left: 0 };
      }
      
      // Add overlay
      const imageWithOverlay = sharp(imagePath)
        .composite([{
          input: Buffer.from(svgText),
          ...overlayOptions
        }]);
      
      // Save image
      const outputPath = await this.saveImage(imageWithOverlay, 'overlay');
      
      return outputPath;
    } catch (error) {
      this.logger.error('Failed to add text overlay', { error });
      throw new Error('Failed to add text overlay');
    }
  }

  /**
   * Save image to disk
   */
  private async saveImage(sharpInstance: SharpInstance, prefix: string): Promise<string> {
    this.ensureUploadDirectory();
    
    // Generate unique filename
    const hash = crypto.randomBytes(8).toString('hex');
    const filename = `${prefix}_${hash}.jpg`;
    const outputPath = path.join(this.uploadDir, filename);
    
    // Save image
    await sharpInstance.jpeg({ quality: 90 }).toFile(outputPath);
    
    return outputPath;
  }

  /**
   * Ensure upload directory exists
   */
  private ensureUploadDirectory(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Download image if URL
   */
  private async downloadImageIfUrl(imageSource: string): Promise<string> {
    // Check if already a local file path
    if (fs.existsSync(imageSource)) {
      return imageSource;
    }
    
    // Download from URL
    if (imageSource.startsWith('http')) {
      try {
        const response = await axios.get(imageSource, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        
        // Save to temporary file
        this.ensureUploadDirectory();
        const hash = crypto.createHash('md5').update(buffer).digest('hex');
        const tempPath = path.join(this.uploadDir, `temp_${hash}.jpg`);
        fs.writeFileSync(tempPath, buffer);
        
        return tempPath;
      } catch (error) {
        this.logger.error('Failed to download image', { error });
        throw new Error('Failed to download image');
      }
    }
    
    return imageSource;
  }

  /**
   * Calculate dimensions based on constraints
   */
  private calculateDimensions(
    original: ImageDimensions,
    constraints: {
      maxWidth?: number;
      maxHeight?: number;
      minWidth?: number;
      minHeight?: number;
    }
  ): ImageDimensions {
    const { width: originalWidth, height: originalHeight } = original;
    const { maxWidth, maxHeight, minWidth, minHeight } = constraints;
    
    let width = originalWidth;
    let height = originalHeight;
    
    // Apply maximum constraints
    if (maxWidth && width > maxWidth) {
      height = Math.round(height * (maxWidth / width));
      width = maxWidth;
    }
    
    if (maxHeight && height > maxHeight) {
      width = Math.round(width * (maxHeight / height));
      height = maxHeight;
    }
    
    // Apply minimum constraints
    if (minWidth && width < minWidth) {
      height = Math.round(height * (minWidth / width));
      width = minWidth;
    }
    
    if (minHeight && height < minHeight) {
      width = Math.round(width * (minHeight / height));
      height = minHeight;
    }
    
    return { width, height };
  }

  /**
   * Dynamically import sharp module
   */
  private async getSharpModule(): Promise<any> {
    try {
      return await import('sharp').then(module => module.default);
    } catch (error) {
      this.logger.error('Failed to import sharp module', { error });
      throw new Error('Sharp module is required for image processing. Please install it with: npm install sharp');
    }
  }
}