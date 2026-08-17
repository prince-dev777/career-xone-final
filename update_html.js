const fs = require('fs');
const path = require('path');

const dirPath = __dirname;

function processHtmlFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  let modified = false;

  // Regex to find <img> tags
  const imgTagRegex = /<img\s+([^>]+)>/gi;
  
  content = content.replace(imgTagRegex, (match, attrs) => {
    let newAttrs = attrs;
    let tagModified = false;

    // 1. Check and replace cloudinary src
    const srcRegex = /src=["'](https:\/\/res\.cloudinary\.com\/[^"']+)["']/i;
    const srcMatch = newAttrs.match(srcRegex);
    if (srcMatch) {
      const fullUrl = srcMatch[1];
      // Extract the filename from the URL
      // E.g. https://res.cloudinary.com/ddmmsdond/image/upload/logo.webp -> logo.webp
      // Some might have versioning or transformations like v1780570406/heroPhoto0.webp -> heroPhoto0.webp
      const urlParts = fullUrl.split('/');
      const filename = urlParts[urlParts.length - 1].split('?')[0].split('#')[0]; // robust filename extraction
      
      const newSrc = `./images/${filename}`;
      newAttrs = newAttrs.replace(fullUrl, newSrc);
      tagModified = true;
    }

    // 2. Check loading="lazy"
    // Also consider cases where lazy might be already there
    const loadingRegex = /loading=["']([^"']+)["']/i;
    const loadingMatch = newAttrs.match(loadingRegex);
    
    if (!loadingMatch) {
      // Append loading="lazy" at the end of the attributes
      newAttrs += ' loading="lazy"';
      tagModified = true;
    } else if (loadingMatch[1] !== 'lazy') {
      newAttrs = newAttrs.replace(loadingRegex, 'loading="lazy"');
      tagModified = true;
    }

    if (tagModified) {
      modified = true;
      return `<img ${newAttrs}>`;
    }
    
    return match;
  });

  if (modified) {
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
