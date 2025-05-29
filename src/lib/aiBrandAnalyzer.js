import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
    try {
      console.log(`Analyzing website: ${url}`);
      
      // Take screenshot of the website
      const screenshotPath = path.join(this.tempDir, 'screenshot.png');
      await this.takeScreenshot(url, screenshotPath);
      
      // Analyze with GPT-4 Vision
      const analysis = await this.analyzeWithGPT4Vision(screenshotPath, url);
      
      // Clean up
      fs.unlinkSync(screenshotPath);
      
      return this.formatBrandGuidelines(analysis, url);
    } catch (error) {
      console.error('Error in AI brand analysis:', error);
      throw error;
    }
  }

  async takeScreenshot(url, outputPath) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.screenshot({ path: outputPath, fullPage: true });
    } finally {
      await browser.close();
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
