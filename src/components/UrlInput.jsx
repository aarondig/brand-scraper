import { useState } from 'react';

export default function UrlInput({ onSearch, isLoading = false }) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    // Clean up the URL before submission
    let cleanedUrl = url.trim();
    
    // Add https:// if no protocol is specified
    if (!/^https?:\/\//i.test(cleanedUrl)) {
      cleanedUrl = 'https://' + cleanedUrl;
    }
    
    console.log('Searching for:', cleanedUrl);
    if (onSearch) onSearch(cleanedUrl);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="relative">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full text-lg py-2 border-b border-gray-300 bg-transparent focus:border-gray-900 focus:outline-none focus:ring-0 px-0 disabled:opacity-50"
          placeholder="example.com"
          disabled={isLoading}
          inputMode="url"
          pattern="^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$"
          title="Please enter a valid URL (e.g., example.com or https://example.com)"
          aria-busy={isLoading}
        />
        <button
          type="submit"
          disabled={!url.trim() || isLoading}
          className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 disabled:opacity-50"
          aria-label={isLoading ? 'Analyzing...' : 'Submit'}
        >
          {isLoading ? (
            <span className="inline-block h-4 w-4 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
          ) : (
            '→'
          )}
        </button>
      </div>
    </form>
  );
}
