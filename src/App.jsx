import { useState, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { Camera, Upload, Image as ImageIcon, RotateCw, Download } from 'lucide-react';

function App() {
  const [image, setImage] = useState(null);
  const [editedImage, setEditedImage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageUpload = (file) => {
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, or WebP)');
      return;
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('Image size should be less than 10MB');
      return;
    }
    
    const imageUrl = URL.createObjectURL(file);
    setImage(imageUrl);
    setIsEditing(true);
    toast.success('Image uploaded successfully!');
  };

  const handleEditComplete = (editedImageUrl) => {
    setEditedImage(editedImageUrl);
    toast.success('Edit applied successfully!');
  };

  const handleNewEdit = () => {
    setImage(null);
    setEditedImage(null);
    setIsEditing(false);
    setPrompt('');
  };

  const handleProcessImage = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt for the edit');
      return;
    }
    
    try {
      setIsProcessing(true);
      toast.loading('Processing your image...');
      
      // Simulate API call with a timeout
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo purposes, we'll just use the original image
      // In a real app, you would call your AI image processing API here
      setEditedImage(image);
      toast.dismiss();
      toast.success('Edit applied successfully!');
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!editedImage) return;
    
    const link = document.createElement('a');
    link.href = editedImage;
    link.download = `edited-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Image downloaded!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ImageIcon className="h-6 w-6 mr-2 text-indigo-600" />
            AI Photo Editor
          </h1>
          {isEditing && (
            <button
              onClick={handleNewEdit}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <RotateCw className="h-4 w-4 mr-2" />
              New Edit
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {!isEditing ? (
          // Upload Section
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-2">
              Edit Your Photos with AI
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Upload a photo or take a picture to get started
            </p>
            
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
              {/* Upload Option */}
              <div 
                className="relative bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer border-2 border-dashed border-gray-300 hover:border-indigo-500 p-8 text-center"
                onClick={() => document.getElementById('file-upload').click()}
              >
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files?.[0])}
                />
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
                    <Upload className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Upload Photo</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Upload an existing photo from your device
                  </p>
                </div>
              </div>
              
              {/* Camera Option */}
              <div 
                className="relative bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer border-2 border-dashed border-gray-300 hover:border-indigo-500 p-8 text-center"
                onClick={async () => {
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    // In a real app, you would show a camera preview and capture the image
                    toast('Camera access granted! Implement capture functionality here.');
                    // Don't forget to stop all tracks when done
                    stream.getTracks().forEach(track => track.stop());
                  } catch (error) {
                    console.error('Error accessing camera:', error);
                    toast.error('Could not access camera. Please check permissions.');
                  }
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-purple-100">
                    <Camera className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Take a Photo</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Use your device's camera to take a new photo
                  </p>
                </div>
              </div>
              
              {/* Sample Images (Optional) */}
              <div className="relative bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer border-2 border-dashed border-gray-300 hover:border-indigo-500 p-8 text-center">
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <ImageIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Sample Images</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Try with our sample images
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-12 text-center text-sm text-gray-500">
              <p>Supported formats: JPG, PNG, WebP (max 10MB)</p>
            </div>
          </div>
        ) : (
          // Editor Section
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Your Photo</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Original Image */}
                <div className="lg:col-span-2">
                  <div className="bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                      src={editedImage || image} 
                      alt="Preview" 
                      className="w-full h-auto max-h-[70vh] object-contain mx-auto"
                    />
                  </div>
                </div>
                
                {/* Editing Controls */}
                <div className="space-y-6">
                  <div>
                    <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
                      Describe your edit
                    </label>
                    <div className="flex rounded-md shadow-sm">
                      <input
                        type="text"
                        id="prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Make the colors more vibrant..."
                        disabled={isProcessing}
                      />
                      <button
                        type="button"
                        onClick={handleProcessImage}
                        disabled={isProcessing}
                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white ${
                          isProcessing ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
                        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                      >
                        {isProcessing ? 'Processing...' : 'Apply'}
                      </button>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Try: "Make it look professional" or "Apply vintage effect"
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Edits</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {['Enhance colors', 'Black & white', 'Vintage', 'Sharpen'].map((quickEdit) => (
                        <button
                          key={quickEdit}
                          type="button"
                          onClick={() => setPrompt(quickEdit)}
                          className="inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          {quickEdit}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between">
                      <button
                        type="button"
                        onClick={handleNewEdit}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <RotateCw className="h-4 w-4 mr-2" />
                        Start Over
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleDownload}
                        disabled={!editedImage || isProcessing}
                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                          !editedImage || isProcessing ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'
                        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} AI Photo Editor. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
