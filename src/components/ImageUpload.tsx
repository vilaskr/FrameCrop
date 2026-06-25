import { useState, useRef, MouseEvent, TouchEvent, DragEvent } from 'react';
import { Upload, Image as ImageIcon, Crosshair, RefreshCw, Sparkles } from 'lucide-react';
import NeoCard from './NeoCard';
import NeoButton from './NeoButton';
import { FocalPoint } from '../types';

interface ImageUploadProps {
  onImageLoaded: (img: HTMLImageElement, name: string) => void;
  selectedImage: HTMLImageElement | null;
  imageName: string;
  focalPoint: FocalPoint;
  onChangeFocalPoint: (fp: FocalPoint) => void;
  onDetectSmartFocus: () => void;
  onReset: () => void;
}

const SAMPLE_IMAGES = [
  {
    name: 'Vibrant Portrait',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80',
    description: 'Perfect for portrait-centering',
    bg: 'bg-[#FFD43B]',
  },
  {
    name: 'Mountain Valley',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    description: 'Great for cinematic landscapes',
    bg: 'bg-[#74C0FC]',
  },
  {
    name: 'Gaming Setup',
    url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    description: 'Neon highlights & details',
    bg: 'bg-[#8CE99A]',
  },
  {
    name: 'Travel Adventure',
    url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
    description: 'Multi-subject scenic roadtrip',
    bg: 'bg-[#FF8787]',
  },
];

export default function ImageUpload({
  onImageLoaded,
  selectedImage,
  imageName,
  focalPoint,
  onChangeFocalPoint,
  onDetectSmartFocus,
  onReset,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse files
  const handleFile = (file: File) => {
    if (!file) return;
    
    // Size check: 20MB limit
    if (file.size > 20 * 1024 * 1024) {
      setError('File size exceeds the 20MB limit!');
      return;
    }

    if (!file.type.match('image/jpeg|image/png|image/webp')) {
      setError('Unsupported file type! Please upload JPG, PNG, or WEBP.');
      return;
    }

    setError(null);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        onImageLoaded(img, file.name);
        setIsLoading(false);
      };
      img.onerror = () => {
        setError('Failed to render uploaded image.');
        setIsLoading(false);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSampleSelect = (url: string, name: string) => {
    setIsLoading(true);
    setError(null);
    
    const img = new Image();
    img.crossOrigin = 'anonymous'; // critical for canvas pixel manipulation & download
    img.onload = () => {
      onImageLoaded(img, `sample-${name.toLowerCase().replace(/\s+/g, '-')}.png`);
      setIsLoading(false);
    };
    img.onerror = () => {
      setError('Failed to load sample image. Check internet connection.');
      setIsLoading(false);
    };
    img.src = url;
  };

  // Handle Focal Point Positioning (Click or Drag on preview image)
  const handleFocalInput = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate percentages
    let x = (clientX - rect.left) / rect.width;
    let y = (clientY - rect.top) / rect.height;

    // Clamp between 0 and 1
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    onChangeFocalPoint({ x, y });
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    // Left click only
    if (e.button !== 0) return;
    handleFocalInput(e.clientX, e.clientY);

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      handleFocalInput(moveEvent.clientX, moveEvent.clientY);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    handleFocalInput(touch.clientX, touch.clientY);

    const handleTouchMove = (moveEvent: globalThis.TouchEvent) => {
      if (moveEvent.touches.length === 0) return;
      handleFocalInput(moveEvent.touches[0].clientX, moveEvent.touches[0].clientY);
    };

    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
  };

  return (
    <div className="w-full">
      {!selectedImage ? (
        <div className="space-y-6">
          {/* UPLOAD ZONE */}
          <div
            id="drag-drop-zone"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center border-4 border-dashed border-black rounded-[12px] p-8 md:p-12 text-center cursor-pointer transition-colors ${
              isDragging ? 'bg-[#FFD43B]' : 'bg-white'
            } hover:bg-[#F8F4E8]`}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/png, image/jpeg, image/webp"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            <div className="p-4 bg-[#74C0FC] border-4 border-black rounded-full shadow-[4px_4px_0px_#000] mb-4">
              <Upload className="w-10 h-10 text-black stroke-[3px]" />
            </div>

            <h3 className="font-extrabold text-xl md:text-2xl text-black mb-2">
              DRAG & DROP YOUR IMAGE
            </h3>
            <p className="font-bold text-sm text-gray-700 mb-1">
              Supports: PNG, JPG, WEBP (Max 20MB)
            </p>
            <p className="text-xs font-semibold text-gray-500">
              or click anywhere to browse your files
            </p>
          </div>

          {error && (
            <div className="border-4 border-black bg-[#FF8787] p-4 rounded-[12px] shadow-[4px_4px_0px_#000] font-bold text-black text-center">
              🚨 {error}
            </div>
          )}

          {/* SAMPLES SECTION */}
          <NeoCard bg="bg-white">
            <h3 className="font-extrabold text-lg text-black mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 fill-[#FFD43B]" /> NO IMAGE READY? TRY A CREATOR SAMPLE:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {SAMPLE_IMAGES.map((sample) => (
                <button
                  key={sample.name}
                  onClick={() => handleSampleSelect(sample.url, sample.name)}
                  disabled={isLoading}
                  className="flex flex-col text-left border-4 border-black rounded-[12px] overflow-hidden group shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-150 bg-white"
                >
                  <div className="h-28 overflow-hidden border-b-4 border-black relative">
                    <img
                      src={sample.url}
                      alt={sample.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-black text-[#FFD43B] font-extrabold text-[10px] rounded-full border border-[#FFD43B]">
                      TRY
                    </div>
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-black">{sample.name}</h4>
                      <p className="text-[11px] font-semibold text-gray-500 mt-1">
                        {sample.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </NeoCard>
        </div>
      ) : (
        /* IMAGE ACTIVE STATE */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* INTERACTIVE FOCAL ZONE */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 bg-black text-white rounded-full font-bold text-xs tracking-wider border border-white">
                📷 {imageName} ({(selectedImage.naturalWidth || selectedImage.width)}×{(selectedImage.naturalHeight || selectedImage.height)})
              </span>
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 font-bold text-xs text-red-500 hover:text-red-700 bg-red-100 border-2 border-black px-2.5 py-1 rounded-full cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Reset File
              </button>
            </div>

            <div className="relative border-4 border-black rounded-[12px] overflow-hidden bg-[#2C2E33] shadow-[6px_6px_0px_#000] select-none flex items-center justify-center">
              {/* Interactive Target Canvas Container */}
              <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className="relative max-h-[500px] max-w-full overflow-hidden cursor-crosshair"
              >
                <img
                  src={selectedImage.src}
                  alt="Original workspace"
                  className="max-h-[500px] w-auto max-w-full block pointer-events-none"
                  referrerPolicy="no-referrer"
                />

                {/* Focal Target Crosshair Selector Overlay */}
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
                  style={{
                    left: `${focalPoint.x * 100}%`,
                    top: `${focalPoint.y * 100}%`,
                  }}
                >
                  {/* Neon retro targeting reticle */}
                  <div className="relative flex items-center justify-center">
                    {/* Ring */}
                    <div className="w-10 h-10 border-4 border-black rounded-full bg-[#FFD43B] opacity-90 animate-pulse flex items-center justify-center">
                      <Crosshair className="w-6 h-6 text-black stroke-[3px]" />
                    </div>
                    {/* Tiny Red Center Dot */}
                    <div className="absolute w-2.5 h-2.5 bg-[#FF8787] rounded-full border-2 border-black" />
                    
                    {/* Label */}
                    <div className="absolute top-12 bg-black text-white px-2 py-0.5 text-[9px] font-extrabold rounded-md border border-[#FFD43B] shadow-[2px_2px_0px_#000] whitespace-nowrap">
                      FOCUS TARGET ({(focalPoint.x * 100).toFixed(0)}%, {(focalPoint.y * 100).toFixed(0)}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* INSTRUCTIONS & TOOLS */}
          <div className="flex flex-col justify-between h-full">
            <NeoCard bg="bg-white" className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b-2 border-black">
                  <Crosshair className="w-6 h-6 text-black" />
                  <h3 className="font-extrabold text-lg text-black">CROP TARGET FINDER</h3>
                </div>

                <p className="text-sm font-bold text-gray-700 leading-relaxed">
                  Click or drag directly on the image to set your <span className="underline decoration-2 decoration-[#FFD43B]">focal target</span>.
                </p>
                
                <p className="text-xs font-semibold text-gray-500 leading-normal">
                  Our smart crop generation keeps this exact coordinates center stage across every aspect ratio! This prevents faces or branding elements from being cut out in horizontal or vertical renders.
                </p>

                <div className="pt-2">
                  <div className="bg-[#F8F4E8] border-2 border-black p-3 rounded-md space-y-1.5">
                    <div className="flex justify-between text-xs font-extrabold text-black">
                      <span>Horizontal Focal Center:</span>
                      <span className="font-mono text-blue-600">{(focalPoint.x * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-xs font-extrabold text-black">
                      <span>Vertical Focal Center:</span>
                      <span className="font-mono text-blue-600">{(focalPoint.y * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mt-6 pt-4 border-t-2 border-black">
                <NeoButton
                  onClick={onDetectSmartFocus}
                  variant="green"
                  className="w-full text-xs py-2"
                >
                  <Sparkles className="w-4 h-4 mr-2" /> Detect Smart Focus Point
                </NeoButton>

                <p className="text-[11px] font-semibold text-gray-500 text-center">
                  Analyzes high-contrast subject edges dynamically!
                </p>
              </div>
            </NeoCard>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center space-y-4">
          <div className="p-6 bg-white border-4 border-black rounded-[12px] shadow-[6px_6px_0px_#FFD43B] text-center max-w-xs">
            <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-black mx-auto mb-3"></div>
            <p className="font-extrabold text-black text-lg">PROCESSSING FILE...</p>
            <p className="text-xs text-gray-500 font-bold mt-1">Applying color matrix & pre-indexing image pixels.</p>
          </div>
        </div>
      )}
    </div>
  );
}
