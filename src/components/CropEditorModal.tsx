import { useEffect, useRef, useState, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Grid, 
  Maximize, 
  HelpCircle, 
  Sliders, 
  Check, 
  Layers, 
  Move 
} from 'lucide-react';
import { CropPreset, CropSettings, FocalPoint } from '../types';
import { drawCroppedImage } from '../utils/imageEngine';
import NeoButton from './NeoButton';
import NeoCard from './NeoCard';

interface CropEditorModalProps {
  preset: CropPreset;
  image: HTMLImageElement;
  focalPoint: FocalPoint;
  initialSettings: CropSettings;
  onSave: (settings: CropSettings) => void;
  onClose: () => void;
}

export default function CropEditorModal({
  preset,
  image,
  focalPoint,
  initialSettings,
  onSave,
  onClose,
}: CropEditorModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Local state for the adjustments
  const [zoom, setZoom] = useState(initialSettings.zoom);
  const [panX, setPanX] = useState(initialSettings.panX);
  const [panY, setPanY] = useState(initialSettings.panY);
  const [fillMode, setFillMode] = useState<CropSettings['fillMode']>(initialSettings.fillMode);

  // Overlay toggles
  const [showThirds, setShowThirds] = useState(true);
  const [showCenter, setShowCenter] = useState(true);
  const [showSafeZone, setShowSafeZone] = useState(preset.safeZoneType !== 'none');
  const [showGrid, setShowGrid] = useState(false);

  // Drag interaction states
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  // Draw in canvas whenever dimensions, parameters, or grid toggles change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = preset.width;
    canvas.height = preset.height;

    drawCroppedImage({
      ctx,
      img: image,
      targetW: preset.width,
      targetH: preset.height,
      focalPoint,
      settings: { zoom, panX, panY, fillMode },
      drawOverlays: {
        ruleOfThirds: showThirds,
        centerGuide: showCenter,
        safeZone: showSafeZone ? preset.safeZoneType : 'none',
        grid: showGrid,
      }
    });
  }, [image, focalPoint, zoom, panX, panY, fillMode, preset, showThirds, showCenter, showSafeZone, showGrid]);

  // Handle Drag Start (Mouse)
  const handleMouseDown = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { x: panX, y: panY };
  };

  // Handle Drag Move (Mouse)
  const handleMouseMove = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Scale client drag movement to high-res canvas resolution coordinates
    const pixelToClientRatioX = canvas.width / rect.width;
    const pixelToClientRatioY = canvas.height / rect.height;

    const deltaX = (e.clientX - dragStart.current.x) * pixelToClientRatioX;
    const deltaY = (e.clientY - dragStart.current.y) * pixelToClientRatioY;

    setPanX(panStart.current.x + deltaX);
    setPanY(panStart.current.y + deltaY);
  };

  // Handle Drag End
  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Handle Touch Start (Mobile)
  const handleTouchStart = (e: ReactTouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) return;
    setIsDragging(true);
    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX, y: touch.clientY };
    panStart.current = { x: panX, y: panY };
  };

  // Handle Touch Move (Mobile)
  const handleTouchMove = (e: ReactTouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current || e.touches.length === 0) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];

    const pixelToClientRatioX = canvas.width / rect.width;
    const pixelToClientRatioY = canvas.height / rect.height;

    const deltaX = (touch.clientX - dragStart.current.x) * pixelToClientRatioX;
    const deltaY = (touch.clientY - dragStart.current.y) * pixelToClientRatioY;

    setPanX(panStart.current.x + deltaX);
    setPanY(panStart.current.y + deltaY);
  };

  // Reset Adjustments
  const handleReset = () => {
    setZoom(1.0);
    setPanX(0);
    setPanY(0);
    setFillMode('crop');
  };

  const handleSaveClick = () => {
    onSave({ zoom, panX, panY, fillMode });
  };

  // Calculate standard display aspect ratio
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(preset.width, preset.height);
  const ratioStr = `${preset.width / divisor}:${preset.height / divisor}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      {/* Neo-Brutalist Desktop-Window Container */}
      <div className="w-full max-w-5xl bg-[#F8F4E8] border-4 border-black rounded-[12px] shadow-[8px_8px_0px_#000] overflow-hidden flex flex-col my-auto">
        
        {/* WINDOW HEADER */}
        <div className="bg-[#FFD43B] border-b-4 border-black p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-black" />
            <span className="font-extrabold text-black uppercase tracking-wider text-sm md:text-base">
              CROP STUDIO: {preset.name} ({preset.width}×{preset.height} px — {ratioStr})
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#FF8787] border-2 border-black rounded-lg bg-white shadow-[2px_2px_0px_#000] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
          >
            <X className="w-4 h-4 text-black stroke-[3px]" />
          </button>
        </div>

        {/* WORKSPACE AREA */}
        <div className="grid grid-cols-1 lg:grid-cols-3">
          
          {/* MAIN VISUAL CANVAS STAGE (LEFT) */}
          <div className="lg:col-span-2 p-4 md:p-6 bg-neutral-200 border-b-4 lg:border-b-0 lg:border-r-4 border-black flex flex-col items-center justify-center min-h-[300px] md:min-h-[420px] relative">
            <div className="absolute top-3 left-4 bg-black/85 text-white px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-widest flex items-center gap-1.5 border border-[#8CE99A] z-10">
              <Move className="w-3.5 h-3.5 text-[#8CE99A]" /> DRAG OR TOUCH ON CANVAS TO PAN
            </div>

            <div className="relative max-w-full max-h-[450px] aspect-square lg:aspect-auto flex items-center justify-center bg-neutral-100 rounded-[12px] border-4 border-black p-2 overflow-hidden shadow-[4px_4px_0px_#000] w-full h-full">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUpOrLeave}
                className="max-w-full max-h-[380px] object-contain cursor-grab active:cursor-grabbing rounded shadow bg-neutral-300"
                style={{
                  aspectRatio: `${preset.width} / ${preset.height}`
                }}
              />
            </div>
          </div>

          {/* CONTROLS SIDEBAR (RIGHT) */}
          <div className="p-5 md:p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              
              {/* SLIDERS & POSITION */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-black border-b-2 border-black pb-1.5 uppercase text-xs tracking-wider flex items-center gap-1.5">
                  <Maximize className="w-4 h-4" /> Canvas Coordinates
                </h4>

                {/* ZOOM SLIDER */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-black">
                    <span>ZOOM LEVEL:</span>
                    <span className="font-mono text-blue-600 font-extrabold">{zoom.toFixed(2)}x</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setZoom(prev => Math.max(1.0, prev - 0.1))}
                      className="p-1 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none cursor-pointer"
                    >
                      <ZoomOut className="w-4 h-4 text-black" />
                    </button>
                    <input
                      type="range"
                      min="1.0"
                      max="3.0"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full h-2 bg-neutral-300 rounded-lg appearance-none cursor-pointer accent-black"
                    />
                    <button 
                      onClick={() => setZoom(prev => Math.min(3.0, prev + 0.1))}
                      className="p-1 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none cursor-pointer"
                    >
                      <ZoomIn className="w-4 h-4 text-black" />
                    </button>
                  </div>
                </div>

                {/* ZOOM QUICK PRESETS */}
                <div className="flex gap-2">
                  {[1.0, 1.5, 2.0, 3.0].map((val) => (
                    <button
                      key={val}
                      onClick={() => setZoom(val)}
                      className={`flex-1 font-mono text-xs font-bold py-1 border-2 border-black rounded-lg cursor-pointer ${
                        zoom === val ? 'bg-[#FFD43B]' : 'bg-white hover:bg-neutral-100'
                      }`}
                    >
                      {val.toFixed(1)}x
                    </button>
                  ))}
                </div>

                {/* CROP FILL MODES */}
                <div className="space-y-1.5 mt-3">
                  <span className="text-xs font-bold text-black uppercase block">Frame Fill Mode:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFillMode('crop')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-1.5 border-2 border-black text-xs font-bold rounded-lg cursor-pointer ${
                        fillMode === 'crop' ? 'bg-[#8CE99A]' : 'bg-white hover:bg-neutral-50'
                      }`}
                    >
                      ✂️ Crop Fill
                    </button>
                    <button
                      onClick={() => setFillMode('blur-fill')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-1.5 border-2 border-black text-xs font-bold rounded-lg cursor-pointer ${
                        fillMode === 'blur-fill' ? 'bg-[#74C0FC]' : 'bg-white hover:bg-neutral-50'
                      }`}
                    >
                      🎬 Blur Fill
                    </button>
                  </div>
                </div>
              </div>

              {/* OVERLAYS HELPER */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-black border-b-2 border-black pb-1.5 uppercase text-xs tracking-wider flex items-center gap-1.5">
                  <Grid className="w-4 h-4" /> Toggle Creator Overlays
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowThirds(!showThirds)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 border-2 border-black rounded-lg text-xs font-bold cursor-pointer ${
                      showThirds ? 'bg-[#FFD43B] text-black shadow-[2px_2px_0px_#000]' : 'bg-white text-gray-400'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-black bg-[#FFD43B]" />
                    Thirds Grid
                  </button>

                  <button
                    onClick={() => setShowCenter(!showCenter)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 border-2 border-black rounded-lg text-xs font-bold cursor-pointer ${
                      showCenter ? 'bg-[#8CE99A] text-black shadow-[2px_2px_0px_#000]' : 'bg-white text-gray-400'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-black bg-[#8CE99A]" />
                    Center Mark
                  </button>

                  {preset.safeZoneType && preset.safeZoneType !== 'none' && (
                    <button
                      onClick={() => setShowSafeZone(!showSafeZone)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 border-2 border-black rounded-lg text-xs font-bold cursor-pointer ${
                        showSafeZone ? 'bg-[#FF8787] text-black shadow-[2px_2px_0px_#000]' : 'bg-white text-gray-400'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full border border-black bg-[#FF8787]" />
                      UI Safe Zone
                    </button>
                  )}

                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 border-2 border-black rounded-lg text-xs font-bold cursor-pointer ${
                      showGrid ? 'bg-[#74C0FC] text-black shadow-[2px_2px_0px_#000]' : 'bg-white text-gray-400'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-black bg-[#74C0FC]" />
                    Fine Mesh
                  </button>
                </div>
              </div>
            </div>

            {/* MODAL FOOTER ACTIONS */}
            <div className="space-y-3 pt-4 border-t-2 border-black">
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center gap-1.5 font-bold text-xs py-2 px-3 border-2 border-black bg-white rounded-lg shadow-[3px_3px_0px_#000] hover:bg-neutral-100 active:translate-y-0.5 active:shadow-none cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>

                <button
                  onClick={onClose}
                  className="flex-1 font-bold text-xs py-2 px-3 border-2 border-black bg-white rounded-lg shadow-[3px_3px_0px_#000] hover:bg-neutral-100 active:translate-y-0.5 active:shadow-none cursor-pointer text-center"
                >
                  Cancel
                </button>

                <NeoButton
                  onClick={handleSaveClick}
                  variant="green"
                  className="flex-1 text-xs py-2 px-4 font-extrabold"
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Apply
                </NeoButton>
              </div>

              <div className="flex justify-center text-[10px] text-gray-500 font-semibold gap-1.5 items-center bg-[#F8F4E8] py-1 border border-black/10 rounded">
                <HelpCircle className="w-3 h-3" /> Tip: Drag the canvas with your mouse/finger to center!
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
