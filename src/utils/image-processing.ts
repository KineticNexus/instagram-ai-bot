import { Logger } from '../core/logger';
import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import type { Sharp } from 'sharp';

interface ImageDimensions {
  width: number;
  height: number;
}

interface ImageProcessingOptions {
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  width?: number;
  height?: number;
}

export class ImageProcessor {
  private sharp!: typeof import('sharp').default;

  constructor(
    private logger: Logger
  ) {}

  /**
   * Initialize the image processor
   */
  private async initialize(): Promise<void> {
    if (!this.sharp) {
      try {
        const sharpModule = await import('sharp');
        this.sharp = sharpModule.default;
      } catch (error) {
        this.logger.error('Failed to initialize sharp', { error });
        throw new Error('Failed to initialize image processor');
      }
    }
  }

  /**
   * Optimize image for Instagram feed
   */
  async optimizeForInstagram(imagePath: string): Promise<Buffer> {
    await this.initialize();

    try {
      const image = this.sharp(imagePath);
      const metadata = await image.metadata();

      // Instagram feed image requirements
      const maxWidth = 1080;
      const maxHeight = 1350;
      const minAspectRatio = 4 / 5;
      const maxAspectRatio = 1.91;

      // Calculate dimensions
      const dimensions = this.calculateDimensions({
        width: metadata.width || 0,
        height: metadata.height || 0
      }, {
        maxWidth,
        maxHeight,
        minAspectRatio,
        maxAspectRatio
      });

      // Process image
      return await image
        .resize(dimensions.width, dimensions.height, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .jpeg({
          quality: 90,
          progressive: true
        })
        .toBuffer();
    } catch (error) {
      this.logger.error('Failed to optimize image for Instagram', { error });
      throw error;
    }
  }

  /**
   * Optimize image for Instagram story
   */
  async optimizeForInstagramStory(imagePath: string): Promise<Buffer> {
    await this.initialize();

    try {
      const image = this.sharp(imagePath);
      const metadata = await image.metadata();

      // Instagram story requirements
      const width = 1080;
      const height = 1920;
      const aspectRatio = 9 / 16;

      // Calculate dimensions
      const dimensions = this.calculateDimensions({
        width: metadata.width || 0,
        height: metadata.height || 0
      }, {
        targetWidth: width,
        targetHeight: height,
        targetAspectRatio: aspectRatio
      });

      // Process image
      return await image
        .resize(dimensions.width, dimensions.height, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .jpeg({
          quality: 90,
          progressive: true
        })
        .toBuffer();
    } catch (error) {
      this.logger.error('Failed to optimize image for Instagram story', { error });
      throw error;
    }
  }

  /**
   * Create image collage
   */
  async createCollage(imagePaths: string[], columns: number = 2): Promise<Buffer> {
    await this.initialize();

    try {
      const images = await Promise.all(
        imagePaths.map(async (path) => {
          const buffer = await fs.readFile(path);
          return this.sharp(buffer);
        })
      );

      const rows = Math.ceil(images.length / columns);
      const cellWidth = 1080 / columns;
      const cellHeight = cellWidth;

      const compositeOperations = await Promise.all(
        images.map(async (image, index) => {
          const row = Math.floor(index / columns);
          const col = index % columns;

          const resized = await image
            .resize(cellWidth, cellHeight, {
              fit: 'cover',
              position: 'center'
            })
            .toBuffer();

          return {
            input: resized,
            top: row * cellHeight,
            left: col * cellWidth
          };
        })
      );

      return await this.sharp({
        create: {
          width: 1080,
          height: rows * cellHeight,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
      .composite(compositeOperations)
      .jpeg({
        quality: 90,
        progressive: true
      })
      .toBuffer();
    } catch (error) {
      this.logger.error('Failed to create collage', { error });
      throw new Error(`Failed to create collage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save image to disk
   */
  async saveImage(imageBuffer: Buffer): Promise<string> {
    try {
      // Create hash of image data for filename
      const hash = createHash('md5').update(imageBuffer).digest('hex');
      const filename = `${hash}.jpg`;
      const uploadDir = path.join(process.cwd(), 'uploads');
      const filepath = path.join(uploadDir, filename);

      // Ensure upload directory exists
      await fs.mkdir(uploadDir, { recursive: true });

      // Save file
      await fs.writeFile(filepath, imageBuffer);

      return filepath;
    } catch (error) {
      this.logger.error('Failed to save image', { error });
      throw error;
    }
  }

  /**
   * Calculate dimensions while maintaining aspect ratio constraints
   */
  private calculateDimensions(
    original: ImageDimensions,
    constraints: {
      maxWidth?: number;
      maxHeight?: number;
      minAspectRatio?: number;
      maxAspectRatio?: number;
      targetWidth?: number;
      targetHeight?: number;
      targetAspectRatio?: number;
    }
  ): ImageDimensions {
    let { width, height } = original;
    const aspectRatio = width / height;

    if (constraints.targetAspectRatio) {
      // Adjust to target aspect ratio
      if (aspectRatio > constraints.targetAspectRatio) {
        width = height * constraints.targetAspectRatio;
      } else {
        height = width / constraints.targetAspectRatio;
      }
    } else {
      // Adjust to aspect ratio constraints
      if (constraints.minAspectRatio && aspectRatio < constraints.minAspectRatio) {
        height = width / constraints.minAspectRatio;
      } else if (constraints.maxAspectRatio && aspectRatio > constraints.maxAspectRatio) {
        width = height * constraints.maxAspectRatio;
      }
    }

    // Scale down if exceeding maximum dimensions
    if (constraints.maxWidth && width > constraints.maxWidth) {
      width = constraints.maxWidth;
      height = width / aspectRatio;
    }

    if (constraints.maxHeight && height > constraints.maxHeight) {
      height = constraints.maxHeight;
      width = height * aspectRatio;
    }

    // Scale to target dimensions
    if (constraints.targetWidth && constraints.targetHeight) {
      width = constraints.targetWidth;
      height = constraints.targetHeight;
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }
}