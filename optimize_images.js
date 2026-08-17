const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imagesDir = path.join(__dirname, 'images');

async function optimizeImages() {
  try {
    const files = fs.readdirSync(imagesDir);
    
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      // We only want to process images
      if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        const filePath = path.join(imagesDir, file);
        
        console.log(`Optimizing: ${file}...`);
        
        // Read file into memory so we don't lock the file path
        const inputBuffer = fs.readFileSync(filePath);
        
        // Convert everything to optimized webp, keeping dimensions but lowering quality slightly for max compression without visible loss
        const outputBuffer = await sharp(inputBuffer)
          .webp({ quality: 80, effort: 6 }) // effort 6 for slower but better compression
          .toBuffer();
          
        // Replace original with optimized version directly
        fs.writeFileSync(filePath, outputBuffer);
        
        console.log(`Finished optimizing: ${file}`);
      }
    }
    console.log('All images optimized successfully!');
  } catch (error) {
    console.error('Error optimizing images:', error);
  }
}

optimizeImages();
