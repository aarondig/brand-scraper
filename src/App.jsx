import { useState, useCallback } from 'react';
import Layout from './components/Layout';
import UrlInput from './components/UrlInput';
import BrandAnalysis from './components/BrandAnalysis';
import { analyzeWebsite, formatUrl } from './lib/api';

export default function App() {
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  const handleSearch = useCallback(async (url) => {
    try {
      setError(null);
      setIsAnalyzing(true);
      
      // Format the URL for display
      const formattedUrl = formatUrl(url);
      
      // Call the API
      const result = await analyzeWebsite(url);
      
      // Add to recent analyses
      setRecentAnalyses(prev => [
        { 
          id: Date.now(),
          url: formattedUrl,
          timestamp: 'Just now',
          data: result
        },
        ...prev
      ].slice(0, 5)); // Keep only the 5 most recent
      
    } catch (err) {
      console.error('Error analyzing website:', err);
      setError(err.message || 'Failed to analyze website');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleAnalysisClose = () => {
    setSelectedAnalysis(null);
  };

  return (
    <Layout>
      {selectedAnalysis ? (
        <BrandAnalysis 
          data={selectedAnalysis.data} 
          onClose={handleAnalysisClose} 
        />
      ) : (
        <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-medium text-gray-900 mb-1">
            Brand Scraper
          </h1>
          <p className="text-gray-500 text-sm">
            Extract brand elements from any website
          </p>
        </div>
        
        <div>
          <UrlInput onSearch={handleSearch} isLoading={isAnalyzing} />
          {error && (
            <div className="mt-2 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>
        
        {recentAnalyses.length > 0 && (
          <div className="border-t border-gray-100 pt-6">
            <h2 className="text-sm font-medium text-gray-500 mb-3">RECENT</h2>
            <div className="space-y-1">
              {recentAnalyses.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedAnalysis(item)}
                  className="w-full text-left p-2 -mx-2 rounded hover:bg-gray-50 flex items-center justify-between group transition-colors"
                >
                  <span className="text-gray-700 group-hover:text-gray-900">
                    {item.url}
                  </span>
                  <span className="text-xs text-gray-400">
                    {item.timestamp}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
          </div>
        )}
    </Layout>
  );
}
