// Color similarity threshold (0-1, where 1 is identical)
const SIMILARITY_THRESHOLD = 0.15;

// Common brand color palettes for reference
const BRAND_COLORS = {
  'google': ['#4285F4', '#34A853', '#FBBC05', '#EA4335'],
  'facebook': ['#1877F2', '#42B72A'],
  'twitter': ['#1DA1F2'],
  'instagram': ['#E1306C', '#405DE6'],
  'linkedin': ['#0077B5'],
  'youtube': ['#FF0000'],
  'pinterest': ['#E60023'],
  'reddit': ['#FF4500'],
  'tiktok': ['#000000', '#25F4EE', '#FE2C55', '#FFFFFF'],
  'whatsapp': ['#25D366']
};

// Convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Calculate color brightness (0-1)
function getBrightness(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000 / 255;
}

// Calculate color saturation (0-1)
function getSaturation(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  return max === 0 ? 0 : delta / max;
}

// Calculate color distance (0-1)
function getColorDistance(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 1;
  
  const rMean = (rgb1.r + rgb2.r) / 2 / 255;
  const r = (rgb1.r - rgb2.r) / 255;
  const g = (rgb1.g - rgb2.g) / 255;
  const b = (rgb1.b - rgb2.b) / 255;
  
  return Math.sqrt(
    (2 + rMean) * r * r +
    4 * g * g +
    (3 - rMean) * b * b
  ) / 3;
}

// Check if color is similar to any brand color
function isSimilarToBrandColor(hex) {
  for (const brand in BRAND_COLORS) {
    for (const brandColor of BRAND_COLORS[brand]) {
      if (getColorDistance(hex, brandColor) < SIMILARITY_THRESHOLD) {
        return true;
      }
    }
  }
  return false;
}

// Check if color is vibrant (saturated and not too dark/light)
function isVibrant(hex) {
  const brightness = getBrightness(hex);
  const saturation = getSaturation(hex);
  
  return (
    saturation > 0.4 &&  // More saturated
    brightness > 0.2 &&   // Not too dark
    brightness < 0.9      // Not too light
  );
}

// Score color based on various factors
function scoreColor(hex) {
  if (!hex || !/^#[0-9A-F]{6}$/i.test(hex)) return 0;
  
  let score = 0;
  
  // Higher score for brand-like colors
  if (isSimilarToBrandColor(hex)) {
    score += 50;
  }
  
  // Higher score for vibrant colors
  if (isVibrant(hex)) {
    score += 30;
  }
  
  // Add saturation and brightness to score
  score += getSaturation(hex) * 20;
  score += (1 - Math.abs(0.7 - getBrightness(hex))) * 20;
  
  return score;
}

export {
  hexToRgb,
  getBrightness,
  getSaturation,
  getColorDistance,
  isSimilarToBrandColor,
  isVibrant,
  scoreColor
};
