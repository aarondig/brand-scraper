import { parse } from 'node-html-parser';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Fetch the website HTML
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    
    // Parse the HTML
    const root = parse(html);
    
    // Extract brand information
    const brandInfo = {
      title: root.querySelector('title')?.text || 'No title found',
      description: root.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      favicon: root.querySelector('link[rel*="icon"]')?.getAttribute('href') || '',
      colors: extractColors(root, html),
      fonts: extractFonts(root, html),
      images: extractImages(root, url),
    };

    res.status(200).json(brandInfo);
  } catch (error) {
    console.error('Error analyzing website:', error);
    res.status(500).json({ 
      error: 'Failed to analyze website',
      details: error.message 
    });
  }
}

// Helper functions to extract brand elements
function extractColors(root, html) {
  // Extract colors from inline styles, stylesheets, and meta tags
  const colors = new Set();
  
  // Check for theme color
  const themeColor = root.querySelector('meta[name="theme-color"]')?.getAttribute('content');
  if (themeColor) colors.add(themeColor);

  // Extract from inline styles
  const elementsWithColor = root.querySelectorAll('*[style*="color:"]');
  elementsWithColor.forEach(el => {
    const color = el.getAttribute('style').match(/color:\s*(#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)|hsla?\([^)]+\)|\w+)/)?.[1];
    if (color) colors.add(color);
  });

  // Extract from style tags (basic extraction)
  const styleTags = root.querySelectorAll('style');
  styleTags.forEach(style => {
    const colorMatches = style.textContent.matchAll(/#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)|hsla?\([^)]+\)|\w+(?=;|\s|,|$)/g);
    for (const match of colorMatches) {
      colors.add(match[0]);
    }
  });

  return Array.from(colors).slice(0, 10); // Return top 10 colors
}

function extractFonts(root) {
  const fonts = new Set();
  
  // Extract from link tags
  const fontLinks = root.querySelectorAll('link[rel*="font"], link[rel*="stylesheet"]');
  fontLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href.endsWith('.woff') || href.endsWith('.woff2') || href.endsWith('.ttf'))) {
      fonts.add(href);
    }
  });

  // Extract from @font-face in style tags
  const styleTags = root.querySelectorAll('style');
  styleTags.forEach(style => {
    const fontFaceMatches = style.textContent.matchAll(/@font-face\s*\{([^}]*)\}/g);
    for (const match of fontFaceMatches) {
      const fontFamilyMatch = match[1].match(/font-family:\s*['"]([^'"]+)['"]/);
      if (fontFamilyMatch) {
        fonts.add(fontFamilyMatch[1]);
      }
    }
  });

  return Array.from(fonts);
}

function extractImages(root, baseUrl) {
  const images = new Set();
  
  // Extract from img tags
  const imgTags = root.querySelectorAll('img[src]');
  imgTags.forEach(img => {
    const src = img.getAttribute('src');
    if (src) {
      const absoluteUrl = new URL(src, baseUrl).toString();
      images.add(absoluteUrl);
    }
  });

  // Extract from picture/source tags
  const sourceTags = root.querySelectorAll('source[srcset]');
  sourceTags.forEach(source => {
    const srcset = source.getAttribute('srcset');
    const urls = srcset.split(',').map(s => s.trim().split(' ')[0]);
    urls.forEach(url => {
      if (url) {
        const absoluteUrl = new URL(url, baseUrl).toString();
        images.add(absoluteUrl);
      }
    });
  });

  return Array.from(images).slice(0, 10); // Return top 10 images
}
