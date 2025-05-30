import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parse } from 'node-html-parser';
import fetch from 'node-fetch';
import puppeteer from 'puppeteer';
import AIBrandAnalyzer from '../src/lib/aiBrandAnalyzer.js';

// Load environment variables
dotenv.config();

// Initialize AI Brand Analyzer
const aiBrandAnalyzer = new AIBrandAnalyzer(process.env.OPENAI_API_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../dist')));

// API Routes
app.post('/api/analyze', async (req, res) => {
  const { url } = req.body;
  console.log('Received request to analyze:', url);

  if (!url) {
    console.error('No URL provided in request');
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    console.log('Starting AI-powered brand analysis for:', url);
    
    // Use AI to analyze the website
    console.log('Calling aiBrandAnalyzer.analyzeWebsite...');
    const brandAnalysis = await aiBrandAnalyzer.analyzeWebsite(url);
    console.log('Analysis completed, processing results...');
    
    // Check if there was an error in the analysis
    if (brandAnalysis.error) {
      console.error('Error in brand analysis:', JSON.stringify(brandAnalysis, null, 2));
      return res.status(500).json({
        error: 'Failed to analyze website',
        details: brandAnalysis.details || 'Unknown error occurred',
        timestamp: new Date().toISOString()
      });
    }
    
    // Extract basic page metadata
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    const root = parse(html);
    
    const pageTitle = root.querySelector('title')?.text || 'No title found';
    const description = root.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const favicon = root.querySelector('link[rel*="icon"]')?.getAttribute('href') || '';
    
    // Combine all brand information
    const brandInfo = {
      title: pageTitle,
      description,
      favicon,
      // Extract colors for backward compatibility
      colors: [
        brandAnalysis.colors?.primary,
        brandAnalysis.colors?.secondary,
        brandAnalysis.colors?.accent,
        ...(brandAnalysis.colors?.neutrals || []).slice(0, 2)
      ].filter(Boolean),
      // Include the AI-generated brand analysis
      brandGuidelines: brandAnalysis,
      // Include extracted fonts and images
      fonts: extractFonts(root, html),
      images: extractImages(root, url),
    };
    
    console.log('AI brand analysis completed for:', url);
    res.status(200).json(brandInfo);
  } catch (error) {
    console.error('Error analyzing website:', error);
    res.status(500).json({ 
      error: 'Failed to analyze website',
      details: error.message 
    });
  }
});

// Helper functions to extract brand elements
function extractColors(root, html) {
  // Function to validate and normalize color values
  const normalizeColor = (color) => {
    if (!color) return null;
    
    // Remove whitespace and convert to lowercase
    color = color.trim().toLowerCase();
    
    // Skip common non-color values and text colors
    const skipValues = [
      'inherit', 'initial', 'unset', 'revert', 'transparent',
      'currentcolor', 'none', '0', '1px', '13px', 'gbar', '!important',
      'important', 'auto', 'normal', '0px', '1', '2', '3', '4', '5',
      '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16',
      'black', '#000', '#000000', 'white', '#fff', '#ffffff',
      'gray', 'grey', '#808080', '#80808080',
      'darkgray', 'darkgrey', '#a9a9a9',
      'lightgray', 'lightgrey', '#d3d3d3',
      'silver', '#c0c0c0',
      'transparent', 'rgba(0,0,0,0)'
    ];
    
    if (skipValues.includes(color)) {
      return null;
    }
    
    // Check for valid color formats
    const colorFormats = [
      /^#[0-9a-f]{3}$/i,                    // #RGB
      /^#[0-9a-f]{6}$/i,                   // #RRGGBB
      /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i,  // rgb(r,g,b)
      /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[01]?\d?\.?\d+\s*\)$/i, // rgba(r,g,b,a)
      /^hsl\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*\)$/i, // hsl(h,s%,l%)
      /^hsla\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*,\s*[01]?\d?\.?\d+\s*\)$/i, // hsla(h,s%,l%,a)
      /^[a-z]+$/i  // Named colors (red, blue, etc.)
    ];
    
    return colorFormats.some(format => format.test(color)) ? color : null;
  };
  
  // Function to convert color to hex format for comparison
  const colorToHex = (color) => {
    // Simple conversion for hex colors
    if (color.startsWith('#')) {
      // Convert #RGB to #RRGGBB
      if (color.length === 4) {
        return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
      }
      return color;
    }
    // For other formats, we'd need a proper color conversion library
    return color;
  };
  
  // Function to check if colors are similar
  const areColorsSimilar = (color1, color2) => {
    // Simple comparison - in a real app, you'd want to convert to LAB or HSV
    // and compare the distance in color space
    return colorToHex(color1) === colorToHex(color2);
  };
  
  // Function to extract colors from elements
  const extractElementColors = (elements, properties) => {
    const colorMap = new Map(); // color -> {count, source}
    
    elements.forEach(el => {
      properties.forEach(prop => {
        // Get computed style to handle CSS variables and inheritance
        const style = getComputedStyle(el);
        const colorValue = style.getPropertyValue(prop);
        
        if (colorValue) {
          const normalized = normalizeColor(colorValue);
          if (normalized) {
            // Check if we already have a similar color
            let found = false;
            for (const [existingColor, data] of colorMap.entries()) {
              if (areColorsSimilar(existingColor, normalized)) {
                data.count++;
                found = true;
                break;
              }
            }
            if (!found) {
              colorMap.set(normalized, { count: 1, source: prop });
            }
          }
        }
      });
    });
    
    return Array.from(colorMap.entries())
      .sort((a, b) => b[1].count - a[1].count) // Sort by frequency
      .map(([color, data]) => ({
        value: color,
        count: data.count,
        source: data.source
      }));
  };
  
  try {
    return extractColors(root, html);
  } catch (error) {
    console.error('Error extracting colors:', error);
    // Fallback to Google's color palette if extraction fails
    return ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#F4B400'];
  }
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
  const seen = new Set();
  const baseDomain = new URL(baseUrl).hostname.replace('www.', '');
  
  // Function to check if image is likely a brand element
  const isBrandImage = (src, alt = '') => {
    const lowerSrc = src.toLowerCase();
    const lowerAlt = alt.toLowerCase();
    
    // Skip common non-brand images
    const skipPatterns = [
      'icon', 'sprite', 'pixel', '1x1', 'spacer', 'loading', 'placeholder',
      'avatar', 'user', 'profile', 'thumbnail', 'advertisement', 'ad-', '-ad-',
      'banner', 'pixel', 'track', 'beacon', 'analytics', 'pixel.png', 'pixel.gif'
    ];
    
    // Check if URL contains any skip patterns
    if (skipPatterns.some(pattern => lowerSrc.includes(pattern))) {
      return false;
    }
    
    // Check for common image extensions and minimum size requirements
    const isImage = /\.(jpg|jpeg|png|svg|gif|webp)(?:\?.*)?$/i.test(lowerSrc);
    if (!isImage) return false;
    
    // Check if image is from the same domain (more likely to be brand-related)
    try {
      const imgUrl = new URL(src, baseUrl);
      return imgUrl.hostname.includes(baseDomain);
    } catch (e) {
      return false;
    }
  };

  // Extract from img tags with priority to logo images and SVGs
  const imgTags = root.querySelectorAll('img[src]');
  Array.from(imgTags)
    .filter(img => {
      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';
      return isBrandImage(src, alt) || 
             alt.toLowerCase().includes('logo') ||
             src.toLowerCase().includes('logo') ||
             src.endsWith('.svg');
    })
    .forEach(img => {
      const src = img.getAttribute('src');
      if (src) {
        try {
          const absoluteUrl = new URL(src, baseUrl).toString();
          if (!seen.has(absoluteUrl)) {
            images.add(absoluteUrl);
            seen.add(absoluteUrl);
          }
        } catch (e) {
          console.error('Invalid image URL:', src);
        }
      }
    });

  // If we don't have enough images, try to get more from other sources
  if (images.size < 5) {
    // Check for OpenGraph/Twitter images
    const metaImages = [
      root.querySelector('meta[property="og:image"]')?.getAttribute('content'),
      root.querySelector('meta[name="twitter:image"]')?.getAttribute('content'),
      root.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href'),
      root.querySelector('link[rel="icon"]')?.getAttribute('href')
    ].filter(Boolean);

    metaImages.forEach(src => {
      try {
        const absoluteUrl = new URL(src, baseUrl).toString();
        if (!seen.has(absoluteUrl)) {
          images.add(absoluteUrl);
          seen.add(absoluteUrl);
        }
      } catch (e) {
        console.error('Invalid meta image URL:', src);
      }
    });
  }

  // Convert to array, filter out any invalid URLs, and limit to 5 images
  return Array.from(images)
    .filter(url => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    })
    .slice(0, 5);
}

// Serve static files from Vite's dist directory
app.use(express.static(join(__dirname, '../../dist')));

// Handle SPA routing - return index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../../dist/index.html'));
});

// Start server only when not in Vercel environment
if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

// Export the Express API for Vercel Serverless Functions
module.exports = app;
