'use client';

import { useState, useRef } from 'react';

const prompts = [
  'a polaroid photo of the two people with a white curtain background, no props, slight blur, and a soft flash light source',
  'a polaroid photo of the two people high-fiving each other with a white curtain background, soft light, slightly blurred',
  'a polaroid photo of the two people hugging with a white curtain background, soft light, slightly blurred'
];

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedImages, setGeneratedImages] = useState([]);
  const image1Ref = useRef(null);
  const image2Ref = useRef(null);

  const handleGenerate = async () => {
    const image1File = image1Ref.current.files[0];
    const image2File = image2Ref.current.files[0];

    if (!image1File || !image2File) {
      setError('Please upload two images to continue.');
      return;
    } else {
      setError('');
    }

    setLoading(true);
    setGeneratedImages([]);

    try {
      const base64Image1 = await fileToBase64(image1File);
      const base64Image2 = await fileToBase64(image2File);

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY; // Add your API key in .env.local
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;

      const newImages = [];
      for (let i = 0; i < prompts.length; i++) {
        const payload = {
          contents: [{
            parts: [
              { text: prompts[i] },
              { inlineData: { mimeType: image1File.type, data: base64Image1 } },
              { inlineData: { mimeType: image2File.type, data: base64Image2 } }
            ]
          }],
          generationConfig: { responseModalities: ["IMAGE"] }
        };

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`API response failed. Status: ${response.status}`);
        }

        const result = await response.json();
        const generatedImage = result?.candidates?.[0]?.content?.parts?.find(
          part => part.inlineData && part.inlineData.mimeType.startsWith('image/')
        );

        if (generatedImage) {
          const base64Data = generatedImage.inlineData.data;
          const imageUrl = `data:${generatedImage.inlineData.mimeType};base64,${base64Data}`;
          newImages.push({ src: imageUrl, alt: prompts[i] });
        } else {
          throw new Error('No image returned for prompt: ' + prompts[i]);
        }
      }
      setGeneratedImages(newImages);
    } catch (error) {
      console.error('Error generating images:', error);
      setError('An error occurred during generation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="p-6 md:p-10 flex items-center justify-center min-h-screen font-sans bg-gray-900 text-gray-200">
      <div className="container mx-auto p-8 bg-gray-800 rounded-2xl shadow-xl max-w-4xl">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Image Generator</h1>
          <p className="text-gray-400 mb-8">
            Upload two images, and I will generate three new pictures based on a set of custom prompts.
          </p>
        </div>

        {/* Upload inputs */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-8">
          <div className="w-full md:w-1/2">
            <label className="block text-gray-200 font-medium mb-2">Image 1</label>
            <input type="file" ref={image1Ref} accept="image/*"
              className="w-full p-3 border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300 bg-gray-700 text-gray-200" />
          </div>
          <div className="w-full md:w-1/2">
            <label className="block text-gray-200 font-medium mb-2">Image 2</label>
            <input type="file" ref={image2Ref} accept="image/*"
              className="w-full p-3 border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300 bg-gray-700 text-gray-200" />
          </div>
        </div>

        {/* Generate button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`bg-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform ${
              loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 hover:scale-105 active:scale-95'
            } duration-300 focus:outline-none focus:ring-4 focus:ring-blue-800`}
          >
            {loading ? 'Generating...' : 'Generate Images'}
          </button>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="text-center text-gray-400 mb-6">
            <svg className="animate-spin h-8 w-8 text-blue-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none"
              viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0
                3.042 1.135 5.824 3 7.965l1-1.674zm10 0l-1-1.674c1.865-2.141 3-4.923 3-7.965h-4v8z">
              </path>
            </svg>
            <p className="mt-2">Generating your images...</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-900 border-l-4 border-red-700 text-red-200 p-4 rounded-lg mb-6" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Image Gallery */}
        <div id="image-gallery" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {generatedImages.map((image, index) => (
            <div key={index} className="bg-gray-700 rounded-xl p-4 shadow-md flex flex-col items-center">
              <img src={image.src} alt={image.alt} className="w-full h-auto rounded-lg mb-2 object-contain" />
              <p className="text-sm text-gray-400 text-center italic">{image.alt}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
