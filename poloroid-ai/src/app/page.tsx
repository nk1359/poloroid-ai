'use client';

import { useState, useRef } from 'react';

const promptOptions = [
  {
    id: 'portrait',
    label: 'Portrait',
    prompt: 'a polaroid photo of the two people with a white curtain background, no props, slight blur, and a soft flash light source'
  },
  {
    id: 'high-five',
    label: 'High Five',
    prompt: 'a polaroid photo of the two people high-fiving each other with a white curtain background, soft light, slightly blurred'
  },
  {
    id: 'hug',
    label: 'Hug',
    prompt: 'a polaroid photo of the two people hugging with a white curtain background, soft light, slightly blurred'
  }
];

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedImages, setGeneratedImages] = useState<{ src: string; alt: string }[]>([]);
  const [imageProgress, setImageProgress] = useState<number[]>([]);
  const [imageStatus, setImageStatus] = useState<string[]>([]);
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]); // Start with none selected
  const [uploadedFiles, setUploadedFiles] = useState<{ file1: File | null; file2: File | null }>({ file1: null, file2: null });
  const image1Ref = useRef<HTMLInputElement>(null);
  const image2Ref = useRef<HTMLInputElement>(null);

  const handlePromptToggle = (promptId: string) => {
    setSelectedPrompts(prev => 
      prev.includes(promptId) 
        ? prev.filter(id => id !== promptId)
        : [...prev, promptId]
    );
  };

  const handleFileUpload = (file: File | null, type: 'file1' | 'file2') => {
    setUploadedFiles(prev => ({
      ...prev,
      [type]: file
    }));
  };

  const handleDownload = (imageSrc: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerate = async () => {
    const image1File = image1Ref.current?.files?.[0];
    const image2File = image2Ref.current?.files?.[0];

    if (!image1File || !image2File) {
      setError('Please upload two images to continue.');
      return;
    }

    if (selectedPrompts.length === 0) {
      setError('Please select at least one prompt to generate.');
      return;
    }

    setError('');
    setLoading(true);
    setGeneratedImages([]);
    
    // Initialize progress arrays based on selected prompts
    const selectedCount = selectedPrompts.length;
    setImageProgress(new Array(selectedCount).fill(0));
    setImageStatus(new Array(selectedCount).fill('pending'));

    try {
      const base64Image1 = await fileToBase64(image1File);
      const base64Image2 = await fileToBase64(image2File);

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY; // Add your API key in .env.local
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;

      const newImages = [];
      const selectedPromptObjects = promptOptions.filter(option => selectedPrompts.includes(option.id));
      
      for (let i = 0; i < selectedPromptObjects.length; i++) {
        const currentPrompt = selectedPromptObjects[i];
        
        // Update status to generating for current image
        setImageStatus(prev => {
          const newStatus = [...prev];
          newStatus[i] = 'generating';
          return newStatus;
        });

        // Simulate progress for current image
        const progressInterval = setInterval(() => {
          setImageProgress(prev => {
            const newProgress = [...prev];
            if (newProgress[i] < 90) {
              newProgress[i] += Math.random() * 10;
            }
            return newProgress;
          });
        }, 200);

        const payload = {
          contents: [{
            parts: [
              { text: currentPrompt.prompt },
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
          (part: any) => part.inlineData && part.inlineData.mimeType.startsWith('image/')
        );

        // Clear progress interval
        clearInterval(progressInterval);

        if (generatedImage) {
          const base64Data = generatedImage.inlineData.data;
          const imageUrl = `data:${generatedImage.inlineData.mimeType};base64,${base64Data}`;
          const newImage = { src: imageUrl, alt: currentPrompt.label };
          newImages.push(newImage);
          
          // Update progress to 100% and status to completed
          setImageProgress(prev => {
            const newProgress = [...prev];
            newProgress[i] = 100;
            return newProgress;
          });
          setImageStatus(prev => {
            const newStatus = [...prev];
            newStatus[i] = 'completed';
            return newStatus;
          });
          
          // Add the image immediately to the display
          setGeneratedImages([...newImages]);
        } else {
          throw new Error('No image returned for prompt: ' + currentPrompt.label);
        }
      }
    } catch (error) {
      console.error('Error generating images:', error);
      setError('An error occurred during generation. Please try again.');
    } finally {
      setLoading(false);
      setImageProgress([0, 0, 0]);
      setImageStatus(['pending', 'pending', 'pending']);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('FileReader result is not a string.'));
        }
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="polaroid-container">
      <div className="polaroid-card">
        <div className="polaroid-header">
          <h1 className="polaroid-title">
            Polaroid AI
          </h1>
          <p className="polaroid-subtitle">
            Transform your photos into beautiful polaroid memories with AI-powered generation
          </p>
        </div>

        {/* Modern Upload Areas */}
        <div className="upload-grid">
          <div className="upload-group">
            <label className="upload-label">1st Photo</label>
            <div className="upload-container">
              <input 
                type="file" 
                ref={image1Ref} 
                accept="image/*"
                className="upload-input"
                onChange={(e) => handleFileUpload(e.target.files?.[0] || null, 'file1')}
              />
              <div className={`upload-box ${uploadedFiles.file1 ? 'upload-box-success' : ''}`}>
                <div className="upload-content">
                  {uploadedFiles.file1 ? (
                    <>
                      <div className="upload-icon upload-icon-success">
                        <svg className="upload-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="upload-text-success">✓ {uploadedFiles.file1.name}</p>
                        <p className="upload-subtext">Click to change</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="upload-icon">
                        <svg className="upload-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="upload-text">Drop your first photo here</p>
                        <p className="upload-subtext">or click to browse</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="upload-group">
            <label className="upload-label">2nd Photo</label>
            <div className="upload-container">
              <input 
                type="file" 
                ref={image2Ref} 
                accept="image/*"
                className="upload-input"
                onChange={(e) => handleFileUpload(e.target.files?.[0] || null, 'file2')}
              />
              <div className={`upload-box ${uploadedFiles.file2 ? 'upload-box-success' : ''}`}>
                <div className="upload-content">
                  {uploadedFiles.file2 ? (
                    <>
                      <div className="upload-icon upload-icon-success">
                        <svg className="upload-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="upload-text-success">✓ {uploadedFiles.file2.name}</p>
                        <p className="upload-subtext">Click to change</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="upload-icon">
                        <svg className="upload-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="upload-text">Drop your second photo here</p>
                        <p className="upload-subtext">or click to browse</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Prompt Selection Section */}
        <div className="prompt-section">
          <div className="prompt-header">
            <h2 className="prompt-section-title">Select Styles</h2>
            <p className="prompt-section-subtitle">Choose one or more styles for your polaroid photos</p>
          </div>
          
          <div className="prompt-grid">
            {promptOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handlePromptToggle(option.id)}
                className={`prompt-card ${
                  selectedPrompts.includes(option.id)
                    ? 'prompt-card-selected'
                    : 'prompt-card-unselected'
                }`}
              >
                <div className="prompt-content">
                  <h3 className="prompt-title">{option.label}</h3>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Modern Generate Button */}
        <div className="generate-container">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`generate-button ${
              loading 
                ? 'generate-button-loading' 
                : 'generate-button-active'
            }`}
          >
            <div className="generate-content">
              {loading ? (
                <>
                  <div className="generate-spinner"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <svg className="generate-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Generate Polaroids</span>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Progress Cards - Show during loading */}
        {loading && (
          <div className="progress-container">
            <h3 className="progress-title">Creating Your Polaroids</h3>
            <div className="progress-grid">
              {promptOptions.filter(option => selectedPrompts.includes(option.id)).map((option, index) => (
                <div key={index} className="progress-card">
                  <div className="progress-header">
                    <div className="progress-info">
                      <div className="progress-details">
                        <h4 className="progress-prompt-title">{option.label}</h4>
                        <p className="progress-prompt-subtitle">Polaroid Style</p>
                      </div>
                    </div>
                    <span className="progress-percentage">
                      {Math.round(imageProgress[index])}%
                    </span>
                  </div>
                  
                  <div className="progress-bar-container">
                    <div 
                      className={`progress-bar ${
                        imageStatus[index] === 'completed' 
                          ? 'progress-bar-completed' 
                          : imageStatus[index] === 'generating'
                          ? 'progress-bar-generating'
                          : 'progress-bar-pending'
                      }`}
                      style={{ width: `${imageProgress[index]}%` }}
                    >
                      {/* Scrolling animation for generating state */}
                      {imageStatus[index] === 'generating' && (
                        <div className="absolute inset-0 overflow-hidden">
                          <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-60 scroll-shimmer"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="progress-status">
                    {imageStatus[index] === 'pending' && (
                      <span className="progress-status-pending">
                        <div className="progress-dot progress-dot-pending"></div>
                        Waiting to start
                      </span>
                    )}
                    {imageStatus[index] === 'generating' && (
                      <span className="progress-status-generating">
                        <div className="progress-spinner"></div>
                        Creating polaroid...
                      </span>
                    )}
                    {imageStatus[index] === 'completed' && (
                      <span className="progress-status-completed">
                        <svg className="progress-checkmark" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Ready!
                      </span>
                    )}
                  </div>
                  
                  {/* Show generated image inline when completed */}
                  {imageStatus[index] === 'completed' && generatedImages.length > index && generatedImages[index] && (
                    <div className="progress-generated-image">
                      <img 
                        src={generatedImages[index].src} 
                        alt={generatedImages[index].alt}
                        className="progress-image"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generated Images Gallery - Show after completion */}
        {!loading && generatedImages.length > 0 && generatedImages.length === selectedPrompts.length && (
          <div className="gallery-container">
            <h3 className="gallery-title">Your Generated Polaroids</h3>
            <div className="gallery-grid">
              {generatedImages.map((image, index) => (
                <div key={index} className="gallery-card">
                  <div className="gallery-image-container">
                    <img 
                      src={image.src} 
                      alt={image.alt} 
                      className="gallery-image" 
                    />
                  </div>
                  <div className="gallery-content">
                    <button
                      onClick={() => handleDownload(image.src, `polaroid-${image.alt.toLowerCase().replace(/\s+/g, '-')}.png`)}
                      className="gallery-save-button"
                      title="Download image"
                    >
                      <svg className="gallery-save-icon" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 15l-4-4h3V3h2v8h3l-4 4z" />
            </svg>
                      Download
                    </button>
                    <h4 className="gallery-name">{image.alt}</h4>
                    <p className="gallery-subtitle">Polaroid Style</p>
                    <div className="gallery-status">
                      <div className="gallery-status-dot"></div>
                      <span className="gallery-status-text">Generated</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="error-container" role="alert">
            <p className="error-title">Error</p>
            <p className="error-message">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
