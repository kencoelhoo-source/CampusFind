import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

async function main() {
  console.log('Starting image optimization...');

  // 1. Optimize public/favicon.png
  const faviconPath = path.resolve('public/favicon.png');
  const appleTouchPath = path.resolve('public/apple-touch-icon.png');
  const ogImagePath = path.resolve('public/og-image.png');

  try {
    const faviconBuffer = await fs.readFile(faviconPath);
    
    // Resize favicon to standard sizes and compress
    await sharp(faviconBuffer)
      .resize(32, 32)
      .png({ quality: 80, compressionLevel: 9 })
      .toFile(path.resolve('public/favicon-opt.png'));
    
    // Replace old favicon
    await fs.rename(path.resolve('public/favicon-opt.png'), faviconPath);
    console.log('Optimized favicon.png');

    // Create apple-touch-icon
    await sharp(faviconBuffer)
      .resize(180, 180)
      .png({ quality: 80 })
      .toFile(appleTouchPath);
    console.log('Created apple-touch-icon.png');

    // Create a basic og-image placeholder (1200x630) using the favicon centered on dark background
    await sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 4,
        background: { r: 22, g: 20, b: 18, alpha: 1 } // #161412
      }
    })
      .composite([{ input: faviconBuffer, blend: 'over' }]) // Just paste the favicon in middle if possible, or wait, sharp composite might fail if favicon > 1200
      .png()
      .toFile(ogImagePath);
    console.log('Created og-image.png');
  } catch (err) {
    console.error('Error processing favicons:', err);
  }

  // 2. Compress src/assets/*.png to .webp
  const assetsDir = path.resolve('src/assets');
  const files = await fs.readdir(assetsDir);
  const pngFiles = files.filter(f => f.endsWith('.png'));

  for (const file of pngFiles) {
    const filePath = path.join(assetsDir, file);
    const newFilePath = path.join(assetsDir, file.replace(/\.png$/, '.webp'));
    
    console.log(`Converting ${file} to webp...`);
    await sharp(filePath)
      .webp({ quality: 75 })
      .toFile(newFilePath);
    
    // Delete the original PNG to save space
    await fs.unlink(filePath);
  }

  console.log('Image optimization complete.');
}

main().catch(console.error);
