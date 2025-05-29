import puppeteer from 'puppeteer';
import Color from 'color';
import { URL } from 'url';

class BrandAnalyzer {
  constructor() {
    this.pagesToAnalyze = 5; // Number of pages to analyze
    this.visitedUrls = new Set();
    this.brandProfile = {
      colors: new Map(),
      typography: {
        fonts: new Set(),
        sizes: [],
        weights: []
      },
      layout: {
        maxWidths: [],
        gutters: [],
        spacing: []
      },
      components: {
        buttons: new Set(),
        cards: new Set(),
        navigation: new Set()
      },
      pages: []
    };
  }

  async analyzeWebsite(baseUrl) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      await this.crawlAndAnalyze(browser, baseUrl);
      return this.generateBrandProfile();
    } finally {
      await browser.close();
    }
  }

  async crawlAndAnalyze(browser, url, depth = 0) {
    if (depth >= this.pagesToAnalyze || this.visitedUrls.has(url)) return;
    
    console.log(`Analyzing: ${url}`);
    this.visitedUrls.add(url);
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Extract page data
      const pageData = await this.analyzePage(page, url);
      this.brandProfile.pages.push(pageData);
      
      // Find and follow internal links
      if (depth < this.pagesToAnalyze - 1) {
        const links = await this.extractInternalLinks(page, url);
        for (const link of links) {
          if (this.visitedUrls.size >= this.pagesToAnalyze) break;
          await this.crawlAndAnalyze(browser, link, depth + 1);
        }
      }
    } catch (error) {
      console.error(`Error analyzing ${url}:`, error);
    } finally {
      await page.close();
    }
  }

  async analyzePage(page, url) {
    // Take screenshot for visual analysis
    const screenshot = await page.screenshot({ type: 'png' });
    
    // Extract colors
    const colors = await this.extractColors(page);
    
    // Extract typography
    const typography = await this.extractTypography(page);
    
    // Analyze layout
    const layout = await this.analyzeLayout(page);
    
    // Identify components
    const components = await this.identifyComponents(page);
    
    return {
      url,
      colors,
      typography,
      layout,
      components,
      screenshot: screenshot.toString('base64')
    };
  }

  async extractColors(page) {
    const colors = new Map();
    
    // Get colors from CSS
    const styleTags = await page.$$eval('style', styles => 
      styles.map(style => style.textContent).join('\n')
    );
    
    // Extract color values
    const colorRegex = /#(?:[0-9a-fA-F]{3}){1,2}|rgba?\([^)]+\)|hsla?\([^)]+\)|(?:rgb|hsl)a?\([^)]+\)/g;
    const colorMatches = styleTags.match(colorRegex) || [];
    
    // Count color occurrences
    colorMatches.forEach(color => {
      try {
        const hex = this.normalizeColor(color);
        if (hex) {
          colors.set(hex, (colors.get(hex) || 0) + 1);
        }
      } catch (e) {
        // Skip invalid colors
      }
    });
    
    // Get colors from elements
    const elementColors = await page.$$eval('*', elements => {
      const colors = new Map();
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        ['color', 'backgroundColor', 'borderColor'].forEach(prop => {
          const color = style.getPropertyValue(prop);
          if (color && !color.includes('rgba(0, 0, 0, 0)') && color !== 'transparent') {
            colors.set(color, (colors.get(color) || 0) + 1);
          }
        });
      });
      return Array.from(colors.entries());
    });
    
    // Merge with existing colors
    elementColors.forEach(([color, count]) => {
      try {
        const hex = this.normalizeColor(color);
        if (hex) {
          colors.set(hex, (colors.get(hex) || 0) + count);
        }
      } catch (e) {
        // Skip invalid colors
      }
    });
    
    return Array.from(colors.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([color]) => color);
  }

  async extractTypography(page) {
    return await page.$$eval('*', elements => {
      const typography = new Map();
      
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const fontFamily = style.fontFamily;
        const fontSize = style.fontSize;
        const fontWeight = style.fontWeight;
        
        if (fontFamily && fontSize && fontWeight) {
          const key = `${fontFamily}-${fontSize}-${fontWeight}`;
          typography.set(key, {
            fontFamily,
            fontSize: parseFloat(fontSize),
            fontWeight,
            count: (typography.get(key)?.count || 0) + 1
          });
        }
      });
      
      return Array.from(typography.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    });
  }

  async analyzeLayout(page) {
    return await page.evaluate(() => {
      const layout = {
        maxWidths: new Set(),
        gutters: new Set(),
        spacing: new Set()
      };
      
      // Analyze container widths
      document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        const width = style.width;
        const margin = style.margin;
        const padding = style.padding;
        
        if (width && width.endsWith('px')) {
          layout.maxWidths.add(parseInt(width));
        }
        
        if (margin && margin !== '0px') {
          layout.gutters.add(margin);
        }
        
        if (padding && padding !== '0px') {
          layout.spacing.add(padding);
        }
      });
      
      // Convert sets to sorted arrays
      return {
        maxWidths: Array.from(layout.maxWidths).sort((a, b) => a - b),
        gutters: Array.from(layout.gutters),
        spacing: Array.from(layout.spacing)
      };
    });
  }

  async identifyComponents(page) {
    return await page.evaluate(() => {
      const components = {
        buttons: new Set(),
        cards: new Set(),
        navigation: new Set()
      };
      
      // Identify buttons
      document.querySelectorAll('button, [role="button"], a[href]').forEach(btn => {
        const style = window.getComputedStyle(btn);
        components.buttons.add(JSON.stringify({
          backgroundColor: style.backgroundColor,
          color: style.color,
          padding: style.padding,
          borderRadius: style.borderRadius,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight
        }));
      });
      
      // Identify cards
      document.querySelectorAll('[class*="card"], [class*="Card"]').forEach(card => {
        const style = window.getComputedStyle(card);
        components.cards.add(JSON.stringify({
          backgroundColor: style.backgroundColor,
          border: style.border,
          borderRadius: style.borderRadius,
          boxShadow: style.boxShadow,
          padding: style.padding,
          margin: style.margin
        }));
      });
      
      // Identify navigation
      document.querySelectorAll('nav, [role="navigation"], [class*="nav"], [class*="Nav"]').forEach(nav => {
        const style = window.getComputedStyle(nav);
        components.navigation.add(JSON.stringify({
          backgroundColor: style.backgroundColor,
          color: style.color,
          padding: style.padding,
          position: style.position,
          display: style.display,
          flexDirection: style.flexDirection
        }));
      });
      
      // Convert sets to arrays
      return {
        buttons: Array.from(components.buttons).map(JSON.parse),
        cards: Array.from(components.cards).map(JSON.parse),
        navigation: Array.from(components.navigation).map(JSON.parse)
      };
    });
  }

  extractInternalLinks(page, baseUrl) {
    return page.$$eval('a[href]', (links, base) => {
      const baseUrl = new URL(base);
      const internalLinks = new Set();
      
      links.forEach(link => {
        try {
          const href = link.href;
          if (!href) return;
          
          const url = new URL(href, base);
          
          // Only include same-origin links
          if (url.origin === baseUrl.origin) {
            // Normalize URL
            url.hash = '';
            internalLinks.add(url.toString());
          }
        } catch (e) {
          // Skip invalid URLs
        }
      });
      
      return Array.from(internalLinks);
    }, baseUrl);
  }

  normalizeColor(color) {
    if (!color) return null;
    
    try {
      // Convert named colors to hex
      if (color.startsWith('#')) {
        // Handle shorthand hex
        if (color.length === 4) {
          return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toLowerCase();
        }
        return color.toLowerCase();
      }
      
      // Convert rgb/rgba to hex
      if (color.startsWith('rgb')) {
        const rgb = color.match(/\d+/g).map(Number);
        return `#${((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + (rgb[2] | 0)).toString(16).slice(1).toLowerCase()}`;
      }
      
      // Convert hsl/hsla to hex
      if (color.startsWith('hsl')) {
        const hsl = color.match(/(\d+)/g).map(Number);
        const [h, s, l] = hsl;
        const a = s * Math.min(l, 1 - l);
        const f = n => {
          const k = (n + h / 30) % 12;
          const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
          return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`.toLowerCase();
      }
      
      // Handle named colors
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.fillStyle = color;
      return ctx.fillStyle.toLowerCase();
    } catch (e) {
      console.error('Error normalizing color:', color, e);
      return null;
    }
  }

  generateBrandProfile() {
    // Aggregate colors from all pages
    const colorFrequency = new Map();
    this.brandProfile.pages.forEach(page => {
      page.colors.forEach(color => {
        const normalized = this.normalizeColor(color);
        if (normalized) {
          colorFrequency.set(normalized, (colorFrequency.get(normalized) || 0) + 1);
        }
      });
    });
    
    // Sort colors by frequency and get top 10
    const topColors = Array.from(colorFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([color]) => color);
    
    // Group similar colors
    const colorGroups = [];
    const usedColors = new Set();
    
    topColors.forEach(color => {
      if (usedColors.has(color)) return;
      
      const group = [color];
      usedColors.add(color);
      
      // Find similar colors
      topColors.forEach(otherColor => {
        if (!usedColors.has(otherColor) && this.areColorsSimilar(color, otherColor)) {
          group.push(otherColor);
          usedColors.add(otherColor);
        }
      });
      
      colorGroups.push({
        colors: group,
        primary: group[0],
        count: group.length
      });
    });
    
    // Sort groups by size
    colorGroups.sort((a, b) => b.count - a.count);
    
    // Extract primary colors
    const primaryColors = colorGroups.slice(0, 3).map(g => g.primary);
    
    // Analyze typography consistency
    const fontFamilies = new Map();
    this.brandProfile.pages.forEach(page => {
      page.typography.forEach(font => {
        const key = font.fontFamily;
        fontFamilies.set(key, (fontFamilies.get(key) || 0) + font.count);
      });
    });
    
    const primaryFonts = Array.from(fontFamilies.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([font]) => font);
    
    // Analyze layout consistency
    const layout = {
      maxWidths: new Set(),
      gutters: new Set(),
      spacing: new Set()
    };
    
    this.brandProfile.pages.forEach(page => {
      page.layout.maxWidths.forEach(w => layout.maxWidths.add(w));
      page.layout.gutters.forEach(g => layout.gutters.add(g));
      page.layout.spacing.forEach(s => layout.spacing.add(s));
    });
    
    // Generate brand guidelines
    return {
      colors: {
        primary: primaryColors[0] || '#000000',
        secondary: primaryColors[1] || primaryColors[0] || '#666666',
        accent: primaryColors[2] || primaryColors[1] || primaryColors[0] || '#999999',
        allColors: topColors,
        colorGroups
      },
      typography: {
        primaryFont: primaryFonts[0] || 'sans-serif',
        secondaryFont: primaryFonts[1] || primaryFonts[0] || 'serif',
        fontScale: 1.2 // Default scale
      },
      layout: {
        maxWidth: this.calculateMode(Array.from(layout.maxWidths)) || '1200px',
        gutter: this.calculateMode(Array.from(layout.gutters)) || '20px',
        spacing: this.calculateMode(Array.from(layout.spacing)) || '16px'
      },
      components: this.analyzeComponentConsistency(),
      consistency: this.calculateConsistency(),
      analyzedPages: this.brandProfile.pages.length,
      analyzedAt: new Date().toISOString()
    };
  }
  
  areColorsSimilar(color1, color2, threshold = 30) {
    try {
      const c1 = Color(color1).rgb().array();
      const c2 = Color(color2).rgb().array();
      
      // Calculate Euclidean distance in RGB space
      const distance = Math.sqrt(
        Math.pow(c1[0] - c2[0], 2) +
        Math.pow(c1[1] - c2[1], 2) +
        Math.pow(c1[2] - c2[2], 2)
      );
      
      return distance < threshold;
    } catch (e) {
      return false;
    }
  }
  
  calculateMode(values) {
    if (!values.length) return null;
    
    const frequency = {};
    let max = 0;
    let mode = null;
    
    values.forEach(value => {
      frequency[value] = (frequency[value] || 0) + 1;
      if (frequency[value] > max) {
        max = frequency[value];
        mode = value;
      }
    });
    
    return mode;
  }
  
  analyzeComponentConsistency() {
    // This would be implemented to analyze component consistency across pages
    return {
      buttons: { consistency: 'high' },
      cards: { consistency: 'medium' },
      navigation: { consistency: 'high' }
    };
  }
  
  calculateConsistency() {
    // Calculate overall consistency score (0-100)
    let score = 0;
    const totalPages = this.brandProfile.pages.length;
    
    if (totalPages === 0) return 0;
    
    // Color consistency
    const colorGroups = new Map();
    this.brandProfile.pages.forEach(page => {
      page.colors.forEach(color => {
        const normalized = this.normalizeColor(color);
        if (normalized) {
          colorGroups.set(normalized, (colorGroups.get(normalized) || 0) + 1);
        }
      });
    });
    
    const colorConsistency = Math.min(100, 
      (colorGroups.size > 0 ? (Math.max(...colorGroups.values()) / totalPages) * 100 : 0)
    );
    
    // Typography consistency
    const fontConsistency = 80; // Placeholder
    
    // Layout consistency
    const layoutConsistency = 85; // Placeholder
    
    // Calculate overall score
    score = Math.round((colorConsistency * 0.4) + (fontConsistency * 0.3) + (layoutConsistency * 0.3));
    
    return {
      score,
      colorConsistency: Math.round(colorConsistency),
      typographyConsistency: fontConsistency,
      layoutConsistency: layoutConsistency
    };
  }
}

export default BrandAnalyzer;
