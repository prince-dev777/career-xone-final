const fs = require('fs');
const path = require('path');

const dirPath = __dirname;

function processHtmlFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Regex to find ANY cloudinary url
  // Match https://res.cloudinary.com/ddmmsdond/image/upload/.../filename.ext
  const cloudinaryRegex = /https:\/\/res\.cloudinary\.com\/ddmmsdond\/image\/upload\/([^"'\s>]+)/gi;
  
  content = content.replace(cloudinaryRegex, (match, filepath) => {
    // Extract filename from the filepath matched
    const parts = filepath.split('/');
    const filename = parts[parts.length - 1].split('?')[0].split('#')[0];
    return `./images/${filename}`;
  });

  // Now ensure all <img> tags have loading="lazy"
  const imgTagRegex = /<img\s+([^>]+)>/gi;
  content = content.replace(imgTagRegex, (match, attrs) => {
    let newAttrs = attrs;
    let tagModified = false;

    const loadingRegex = /loading=["']([^"']+)["']/i;
    const loadingMatch = newAttrs.match(loadingRegex);
    
    if (!loadingMatch) {
      // Add loading="lazy"
      newAttrs += ' loading="lazy"';
      tagModified = true;
    } else if (loadingMatch[1] !== 'lazy') {
      newAttrs = newAttrs.replace(loadingRegex, 'loading="lazy"');
      tagModified = true;
    }

    if (tagModified) {
      return `<img ${newAttrs}>`;
    }
    
    return match;
  });

  // Special fix for the broken og:image meta tag which looks like:
  // content="https://cxjeeneet.com/./images/heroPhoto1.webp" due to the replacement above
  content = content.replace(/content=["']https:\/\/cxjeeneet\.com\/\.\/images\/([^"']+)["']/g, 'content="https://cxjeeneet.com/images/$1"');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${path.basename(filePath)}`);
  }
}

function findAndProcessHtmlFiles() {
  const files = fs.readdirSync(dirPath);
  
  let processedCount = 0;
  for (const file of files) {
    if (file.endsWith('.html')) {
      const filePath = path.join(dirPath, file);
      processHtmlFile(filePath);
      processedCount++;
    }
  }
  console.log(`Processed ${processedCount} HTML files.`);
}

findAndProcessHtmlFiles();
