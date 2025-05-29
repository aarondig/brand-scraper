const API_BASE_URL = 'http://localhost:3001';

// Helper function to normalize URLs
function normalizeUrl(url) {
  try {
    // Convert to lowercase and trim whitespace
    let normalized = url.trim().toLowerCase();
    
    // Add https:// if no protocol is specified
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = 'https://' + normalized;
    }
    
    // Ensure we have a valid URL
    const urlObj = new URL(normalized);
    
    // Remove www. for consistency
    if (urlObj.hostname.startsWith('www.')) {
      urlObj.hostname = urlObj.hostname.substring(4);
    }
    
    return urlObj.toString();
  } catch (error) {
    console.error('Error normalizing URL:', error);
    // If we can't parse it, try to add https:// and return as is
    return url.startsWith('http') ? url : `https://${url}`;
  }
}

export async function analyzeWebsite(url) {
  try {
    // Normalize the URL before sending to the server
    const normalizedUrl = normalizeUrl(url);
    
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: normalizedUrl }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to analyze website');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

export function formatUrl(url) {
  try {
    // Use our normalize function but only return the hostname
    const normalized = normalizeUrl(url);
    const urlObj = new URL(normalized);
    return urlObj.hostname;
  } catch (error) {
    console.error('Error formatting URL:', error);
    // Return the original URL if we can't parse it
    return url.replace(/^https?:\/\//i, '').replace('www.', '').split('/')[0];
  }
}
