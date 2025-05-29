import puppeteer from 'puppeteer';
import getColors from 'get-image-colors';

// Helper function to get dominant colors from an image buffer
async function getDominantColors(buffer, count = 5) {
  try {
    const colors = await getColors(buffer, 'image/png');
    
    // Sort colors by brightness and saturation to prioritize vibrant colors
    const sortedColors = colors
      .map(color => ({
        hex: color.hex().toUpperCase(),
        hsl: color.hsl(),
        saturation: color.hsl()[1],
        lightness: color.hsl()[2],
        brightness: (color.rgb()[0] * 299 + color.rgb()[1] * 587 + color.rgb()[2] * 114) / 1000
      }))
      .filter(color => 
        // Filter out very light or very dark colors
        color.lightness > 0.1 && 
        color.lightness < 0.9 &&
        // Filter out grays
        color.saturation > 0.2
      )
      .sort((a, b) => {
        // Prioritize more saturated and mid-tone colors
        const scoreA = a.saturation * (1 - Math.abs(0.7 - a.lightness));
        const scoreB = b.saturation * (1 - Math.abs(0.7 - b.lightness));
        return scoreB - scoreA;
      });
    
    // Get unique colors
    const uniqueColors = [];
    const seen = new Set();
    
    for (const color of sortedColors) {
      if (!seen.has(color.hex) && uniqueColors.length < count) {
        seen.add(color.hex);
        uniqueColors.push(color.hex);
      }
    }
    
    return uniqueColors;
  } catch (error) {
    console.error('Error extracting colors from image:', error);
    return [];
  }
}

// Take a screenshot of a webpage and extract colors
export async function extractColorsFromUrl(url) {
  let browser;
  try {
    // Launch a headless browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport to a reasonable size
    await page.setViewport({
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
    });
    
    console.log(`Navigating to ${url}...`);
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Take a screenshot of the visible viewport
    console.log('Taking screenshot...');
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false
    });
    
    // Analyze visual composition
    console.log('Analyzing composition...');
    const composition = analyzeComposition(screenshot);
    
    // Extract and analyze colors
    console.log('Extracting colors...');
    let colors = await getDominantColors(screenshot);
    
    // If we don't have enough colors, try taking a full page screenshot
    if (colors.length < 5) {
      console.log('Not enough colors, trying full page...');
      const fullPageScreenshot = await page.screenshot({
        type: 'png',
        fullPage: true
      });
      
      const fullPageColors = await getDominantColors(fullPageScreenshot);
      // Merge colors, preserving roles and metadata
      const colorMap = new Map();
      [...colors, ...fullPageColors].forEach(color => {
        if (!colorMap.has(color.hex)) {
          colorMap.set(color.hex, color);
        }
      });
      colors = Array.from(colorMap.values());
    }
    
    // Generate comprehensive brand guidelines
    console.log('Generating brand guidelines...');
    const brandGuidelines = generateBrandGuidelines(colors, composition);
    
    return brandGuidelines;
  } catch (error) {
    console.error('Error in extractColorsFromUrl:', error);
    // Return default colors if extraction fails
    return ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#F4B400'];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
