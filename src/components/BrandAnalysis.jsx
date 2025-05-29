import { useState, useEffect } from 'react';

export default function BrandAnalysis({ data, onClose }) {
  const [activeTab, setActiveTab] = useState('colors');
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [data]);

  if (isLoading) {
    return (
      <div className="mt-8 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-medium text-gray-900">
          Brand Elements
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Close analysis"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['colors', 'fonts', 'images', 'details'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'colors' && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">Brand Colors</h3>
            <div className="grid grid-cols-5 gap-4">
              {data.colors.map((color, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div 
                    className="w-full h-20 rounded-md mb-2 border border-gray-200"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-mono text-gray-600">
                    {color.length > 12 ? `${color.substring(0, 10)}...` : color}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'fonts' && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">Fonts</h3>
            <div className="space-y-4">
              {data.fonts.length > 0 ? (
                data.fonts.map((font, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded">
                    <p 
                      className="text-lg"
                      style={{ fontFamily: font }}
                    >
                      {font}
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      {font.includes('http') ? 'Font file' : 'System font'}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No fonts detected</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'images' && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">Images</h3>
            <div className="grid grid-cols-2 gap-4">
              {data.images.map((image, index) => (
                <div key={index} className="overflow-hidden rounded-lg">
                  <img
                    src={image}
                    alt={`Website image ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg hover:opacity-90 transition-opacity"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Title</h3>
              <p className="mt-1 text-gray-700">{data.title}</p>
            </div>
            {data.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-900">Description</h3>
                <p className="mt-1 text-gray-700">{data.description}</p>
              </div>
            )}
            {data.favicon && (
              <div>
                <h3 className="text-sm font-medium text-gray-900">Favicon</h3>
                <div className="mt-2 flex items-center">
                  <img 
                    src={data.favicon} 
                    alt="Website favicon" 
                    className="w-6 h-6"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                  <a 
                    href={data.favicon} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-sm text-primary-600 hover:underline"
                  >
                    View
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
