import { useEffect, useRef } from 'react';
import { 
  Instagram, 
  Smartphone, 
  Video, 
  Youtube, 
  Twitter, 
  Linkedin, 
  Facebook, 
  Pin, 
  Sliders, 
  Download, 
  Edit3, 
  Layers, 
  Maximize2 
} from 'lucide-react';
import { CropPreset, CropSettings, FocalPoint } from '../types';
import { drawCroppedImage, renderToBlob } from '../utils/imageEngine';
import NeoCard from './NeoCard';

interface PresetCardProps {
  key?: string;
  preset: CropPreset;
  image: HTMLImageElement;
  focalPoint: FocalPoint;
  settings: CropSettings;
  onEditPreset: () => void;
  onToggleFillMode: () => void;
  showSafeZoneOverlay: boolean;
}

export default function PresetCard({
  preset,
  image,
  focalPoint,
  settings,
  onEditPreset,
  onToggleFillMode,
  showSafeZoneOverlay,
}: PresetCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Map icon strings to Lucide icon components
  const getIcon = () => {
    switch (preset.iconName) {
      case 'Instagram': return <Instagram className="w-5 h-5 text-black" />;
      case 'Smartphone': return <Smartphone className="w-5 h-5 text-black" />;
      case 'Video': return <Video className="w-5 h-5 text-black" />;
      case 'Youtube': return <Youtube className="w-5 h-5 text-black" />;
      case 'Twitter': return <Twitter className="w-5 h-5 text-black" />;
      case 'Linkedin': return <Linkedin className="w-5 h-5 text-black" />;
      case 'Facebook': return <Facebook className="w-5 h-5 text-black" />;
      case 'Pin': return <Pin className="w-5 h-5 text-black" />;
      default: return <Sliders className="w-5 h-5 text-black" />;
    }
  };

  // Get platform specific brand background color to complete the Bento Grid theme
  const getPlatformBg = () => {
    switch (preset.platform) {
      case 'Instagram':
        return preset.id === 'ig-story' ? 'bg-[#FF8787]' : 'bg-[#74C0FC]';
      case 'TikTok':
        return 'bg-[#FF8787]';
      case 'YouTube':
        return 'bg-[#FFD43B]';
      case 'X':
        return 'bg-[#8CE99A]';
      case 'LinkedIn':
        return 'bg-white';
      case 'Facebook':
        return 'bg-[#74C0FC]';
      case 'Pinterest':
        return 'bg-[#FF8787]';
      default:
        return 'bg-[#FFD43B]';
    }
  };

  // Re-draw canvas preview whenever image, focal point, settings, or toggle changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use internal dimensions of the canvas
    canvas.width = preset.width;
    canvas.height = preset.height;

    drawCroppedImage({
      ctx,
      img: image,
      targetW: preset.width,
      targetH: preset.height,
      focalPoint,
      settings,
      drawOverlays: {
        safeZone: showSafeZoneOverlay ? preset.safeZoneType : 'none',
      },
    });
  }, [image, focalPoint, settings, preset, showSafeZoneOverlay]);

  // Handle single download
  const handleDownload = async () => {
    try {
      const blob = await renderToBlob(image, preset, focalPoint, settings);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Clean filename
      const cleanName = preset.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      link.download = `framecrop-${cleanName}-${preset.width}x${preset.height}.png`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download image:', e);
      alert('Error creating download. Please try again.');
    }
  };

  // Calculate Aspect Ratio string
  const gcd = (a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b);
  };
  const d = gcd(preset.width, preset.height);
  const ratio = `${preset.width / d}:${preset.height / d}`;

  return (
    <NeoCard bg="bg-white dark:bg-[#2C2E33] text-black dark:text-white" className="flex flex-col h-full justify-between overflow-hidden">
      {/* CARD HEADER */}
      <div className="flex items-start justify-between pb-3 border-b-2 border-black dark:border-neutral-800 mb-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`p-1 ${getPlatformBg()} border-2 border-black rounded-md inline-flex items-center justify-center shadow-[1.5px_1.5px_0px_#000]`}>
              {getIcon()}
            </span>
            <h4 className="font-extrabold text-sm text-black dark:text-white leading-tight">{preset.name}</h4>
          </div>
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
            {preset.width} × {preset.height} px <span className="text-black/70 dark:text-white/70 bg-gray-200 dark:bg-neutral-800 px-1 py-0.2 rounded border border-black/20 dark:border-white/10 text-[10px] ml-1">{ratio}</span>
          </p>
        </div>

        {/* Edit Button */}
        <button
          onClick={onEditPreset}
          title="Fine tune crop"
          className="p-1.5 bg-white dark:bg-[#1D1E22] text-black dark:text-white border-2 border-black hover:bg-[#FFD43B] dark:hover:bg-[#FFD43B] dark:hover:text-black rounded-lg shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#000] transition-all cursor-pointer inline-flex items-center justify-center"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      </div>

      {/* PREVIEW CONTAINER */}
      <div className="relative w-full aspect-square md:aspect-[4/3] bg-neutral-100 dark:bg-neutral-900 rounded-lg border-2 border-black overflow-hidden flex items-center justify-center p-2 mb-4">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain rounded-md shadow-sm bg-neutral-200 dark:bg-neutral-800"
          style={{
            // Keep aspect ratio visual fidelity
            aspectRatio: `${preset.width} / ${preset.height}`
          }}
        />

        {/* Fill mode badge indicator */}
        <div className="absolute top-2 left-2 bg-black/85 text-white px-2 py-0.5 text-[9px] font-extrabold rounded-md border border-[#FFD43B]">
          {settings.fillMode === 'blur-fill' ? '🎬 BLUR FILL' : '✂️ STANDARD CROP'}
        </div>
      </div>

      {/* CARD ACTIONS */}
      <div className="grid grid-cols-2 gap-2 mt-auto">
        <button
          onClick={onToggleFillMode}
          className={`flex items-center justify-center gap-1.5 text-xs font-bold py-2 px-1 border-2 border-black rounded-lg transition-colors cursor-pointer ${
            settings.fillMode === 'blur-fill' 
              ? 'bg-[#74C0FC] text-black hover:bg-[#5db1f5]' 
              : 'bg-white dark:bg-[#1D1E22] text-black dark:text-white hover:bg-[#F8F4E8] dark:hover:bg-neutral-800'
          }`}
          title={settings.fillMode === 'blur-fill' ? 'Switch to Crop' : 'Switch to Blurred Background Fill'}
        >
          <Layers className="w-3.5 h-3.5" />
          {settings.fillMode === 'blur-fill' ? 'Full Frame' : 'Blur Fill'}
        </button>

        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-1.5 text-xs font-bold py-2 px-1 bg-[#8CE99A] hover:bg-[#76d383] text-black border-2 border-black rounded-lg cursor-pointer transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
      </div>
    </NeoCard>
  );
}
