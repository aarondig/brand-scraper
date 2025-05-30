import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Puppeteer will be dynamically imported when needed
let puppeteer;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AIBrandAnalyzer {
  constructor(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
    this.tempDir = path.join(process.cwd(), 'temp');
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async analyzeWebsite(url) {
    console.log(`[AI Brand Analyzer] Starting analysis for: ${url}`);
    let screenshotPath;
    
    try {
      // Take screenshot of the website
      screenshotPath = path.join(this.tempDir, `screenshot-${Date.now()}.png`);
      console.log(`[AI Brand Analyzer] Taking screenshot of ${url}`);
      
      try {
        await this.takeScreenshot(url, screenshotPath);
        
        if (!fs.existsSync(screenshotPath)) {
          throw new Error('Screenshot file was not created');
        }
        console.log(`[AI Brand Analyzer] Screenshot saved to ${screenshotPath}`);
      } catch (screenshotError) {
        console.error('[AI Brand Analyzer] Screenshot error:', screenshotError);
        throw new Error(`Screenshot failed: ${screenshotError.message}`);
      }
      
      // Analyze with GPT-4 Vision
      console.log('[AI Brand Analyzer] Sending to GPT-4 Vision for analysis');
      let analysis;
      try {
        analysis = await this.analyzeWithGPT4Vision(screenshotPath, url);
        console.log('[AI Brand Analyzer] Received analysis from GPT-4 Vision');
      } catch (analysisError) {
        console.error('[AI Brand Analyzer] Analysis error:', analysisError);
        throw new Error(`AI analysis failed: ${analysisError.message}`);
      }
      
      // Format the response
      let formatted;
      try {
        formatted = this.formatBrandGuidelines(analysis, url);
        console.log('[AI Brand Analyzer] Analysis completed successfully');
      } catch (formatError) {
        console.error('[AI Brand Analyzer] Format error:', formatError);
        throw new Error(`Failed to format results: ${formatError.message}`);
      }
      
      return formatted;
    } catch (error) {
      console.error('[AI Brand Analyzer] Error during analysis:', error);
      // Return a detailed error response
      return {
        error: 'Failed to analyze website',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        url,
        timestamp: new Date().toISOString()
      };
    } finally {
      // Clean up screenshot file if it exists
      try {
        if (screenshotPath && fs.existsSync(screenshotPath)) {
          fs.unlinkSync(screenshotPath);
          console.log(`[AI Brand Analyzer] Cleaned up screenshot at ${screenshotPath}`);
        }
      } catch (cleanupError) {
        console.error('[AI Brand Analyzer] Error cleaning up screenshot:', cleanupError);
      }
    }
  }

  async takeScreenshot(url, outputPath) {
    console.log(`[AI Brand Analyzer] Starting screenshot process for ${url}`);
    let browser;
    
    try {
      // Dynamically import puppeteer if not already imported
      if (!puppeteer) {
        console.log('[AI Brand Analyzer] Importing puppeteer...');
        puppeteer = (await import('puppeteer')).default;
        console.log('[AI Brand Analyzer] Puppeteer imported successfully');
      }
      
      console.log('[AI Brand Analyzer] Launching browser...');
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--single-process',
          '--no-zygote',
          '--no-first-run',
          '--disable-extensions',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-site-isolation-trials'
        ],
        ignoreHTTPSErrors: true,
        defaultViewport: {
          width: 1280,
          height: 800,
          deviceScaleFactor: 1,
        },
        timeout: 30000
      });
      
      console.log('[AI Brand Analyzer] Creating new page...');
      const page = await browser.newPage();
      
      // Set user agent to avoid bot detection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
      
      // Set viewport
      await page.setViewport({ width: 1280, height: 800 });
      
      console.log(`[AI Brand Analyzer] Navigating to ${url}...`);
      await page.goto(url, { 
        waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
        timeout: 60000,
      });
      
      // Wait for page to be fully loaded
      await page.evaluate(() => document.fonts.ready);
      
      console.log('[AI Brand Analyzer] Taking screenshot...');
      await page.screenshot({ 
        path: outputPath,
        fullPage: true,
        type: 'png',
        omitBackground: false,
        encoding: 'binary'
      });
      
      console.log(`[AI Brand Analyzer] Screenshot saved to ${outputPath}`);
      
      // Verify the file was created
      if (!fs.existsSync(outputPath)) {
        throw new Error(`Screenshot file was not created at ${outputPath}`);
      }
      
      const stats = fs.statSync(outputPath);
      if (stats.size === 0) {
        throw new Error('Screenshot file is empty');
      }
      
      console.log(`[AI Brand Analyzer] Screenshot size: ${stats.size} bytes`);
      
    } catch (error) {
      console.error('[AI Brand Analyzer] Error in takeScreenshot:', error);
      
      // Take a screenshot of the error page if possible
      try {
        if (browser) {
          const errorPath = outputPath.replace(/\.(png|jpg|jpeg)$/i, '_error.$1');
          await page.screenshot({ path: errorPath });
          console.error(`[AI Brand Analyzer] Error screenshot saved to: ${errorPath}`);
        }
      } catch (screenshotError) {
        console.error('[AI Brand Analyzer] Failed to capture error screenshot:', screenshotError);
      }
      
      throw error;
      
    } finally {
      if (browser) {
        console.log('[AI Brand Analyzer] Closing browser...');
        try {
          await browser.close();
          console.log('[AI Brand Analyzer] Browser closed successfully');
        } catch (closeError) {
          console.error('[AI Brand Analyzer] Error closing browser:', closeError);
        }
      }
    }
  }

  async analyzeWithGPT4Vision(imagePath, url) {
    const base64Image = fs.readFileSync(imagePath, 'base64');
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this website screenshot and provide comprehensive brand guidelines. 
              Include:
              1. Primary, secondary, and accent colors with hex codes
              2. Typography (font families, sizes, weights)
              3. Layout and spacing patterns
              4. Design principles and style
              5. Visual hierarchy
              6. Any distinctive design elements
              
              Format your response as a JSON object with these keys:
              - colors: { primary, secondary, accent, neutrals: [] }
              - typography: { primaryFont, secondaryFont, fontScale, headingSizes: { h1, h2, h3 } }
              - spacing: { base, small, medium, large, xlarge }
              - designPrinciples: []
              - visualHierarchy: {}
              - distinctiveElements: []
              
              Be precise and detailed in your analysis.`
            },
            {
              type: 'image_url',
              image_url: `data:image/png;base64,${base64Image}`
            }
          ]
        }
      ]
    });

    // Extract the JSON from the response
    const content = response.choices[0].message.content;
    return this.parseJSONResponse(content);
  }

  parseJSONResponse(content) {
    try {
      // Try to extract JSON from markdown code block if present
      const jsonMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.log('Response content:', content);
      throw new Error('Failed to parse AI response');
    }
  }

  formatBrandGuidelines(analysis, url) {
    return {
      metadata: {
        analyzedAt: new Date().toISOString(),
        sourceUrl: url,
        analysisMethod: 'AI Vision Analysis (GPT-4)'
      },
      colors: {
        primary: analysis.colors?.primary || '#000000',
        secondary: analysis.colors?.secondary || '#666666',
        accent: analysis.colors?.accent || '#FF0000',
        neutrals: analysis.colors?.neutrals || ['#FFFFFF', '#F5F5F5', '#333333'],
        palette: analysis.colors || {}
      },
      typography: {
        primaryFont: analysis.typography?.primaryFont || 'sans-serif',
        secondaryFont: analysis.typography?.secondaryFont || 'serif',
        fontScale: analysis.typography?.fontScale || 1.2,
        headingSizes: analysis.typography?.headingSizes || {
          h1: '2.5rem',
          h2: '2rem',
          h3: '1.5rem'
        },
        ...analysis.typography
      },
      spacing: {
        base: '1rem',
        small: '0.5rem',
        medium: '1.5rem',
        large: '3rem',
        xlarge: '4.5rem',
        ...analysis.spacing
      },
      designPrinciples: analysis.designPrinciples || [],
      visualHierarchy: analysis.visualHierarchy || {},
      distinctiveElements: analysis.distinctiveElements || [],
      rawAnalysis: analysis
    };
  }
}

export default AIBrandAnalyzer;
