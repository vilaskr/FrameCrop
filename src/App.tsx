import { useState, useEffect } from 'react';
import { 
  Crop, 
  Download, 
  RefreshCw, 
  Sparkles, 
  Layers, 
  Sun, 
  Moon, 
  Sliders, 
  Trash2, 
  Copy, 
  Check, 
  Video,
  Info
} from 'lucide-react';
import { SOCIAL_PRESETS } from './presets';
import { CropPreset, CropSettings, FocalPoint } from './types';
import { detectSmartFocalPoint, exportAllToZip } from './utils/imageEngine';

// Components
import ImageUpload from './components/ImageUpload';
import PresetCard from './components/PresetCard';
import CropEditorModal from './components/CropEditorModal';
import CustomSizeForm from './components/CustomSizeForm';
import NeoButton from './components/NeoButton';
import NeoCard from './components/NeoCard';

export default function App() {
  // Application theme
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Loaded image states
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [imageName, setImageName] = useState('');
  const [focalPoint, setFocalPoint] = useState<FocalPoint>({ x: 0.5, y: 0.5 });

  // Crop presets (Default social presets + any user custom sizes)
  const [presets, setPresets] = useState<CropPreset[]>(SOCIAL_PRESETS);
  
  // Custom crop states map (presetId -> CropSettings)
  const [cropSettingsMap, setCropSettingsMap] = useState<Record<string, CropSettings>>({});

  // Active crop preset in visual editor modal
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);

  // Global safe zone overlay trigger for final grid preview
  const [showSafeZoneOverlay, setShowSafeZoneOverlay] = useState(false);

  // Batch ZIP download states
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  // Notification for copying dimension clips
  const [copiedPresetId, setCopiedPresetId] = useState<string | null>(null);

  // Handle incoming image loading
  const handleImageLoaded = (img: HTMLImageElement, name: string) => {
    setSelectedImage(img);
    setImageName(name);

    // Compute automatic smart focal point based on luminance gradients
    const smartFP = detectSmartFocalPoint(img);
    setFocalPoint(smartFP);

    // Intelligently configure crop settings for all presets
    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;
    const imgAspect = imgW / imgH;

    const initialMap: Record<string, CropSettings> = {};
    presets.forEach((p) => {
      const presetAspect = p.width / p.height;
      
      // If the image is very landscape (wide) and the preset is vertical (story/tiktok),
      // default to 'blur-fill' so they don't lose the whole side of the frame immediately.
      // Otherwise, default to standard crop.
      const defaultMode: 'crop' | 'blur-fill' = (imgAspect > 1.3 && presetAspect < 0.7) ? 'blur-fill' : 'crop';

      initialMap[p.id] = {
        zoom: 1.0,
        panX: 0,
        panY: 0,
        fillMode: defaultMode,
      };
    });

    setCropSettingsMap(initialMap);
  };

  // Re-run focal detection manually
  const handleDetectSmartFocus = () => {
    if (!selectedImage) return;
    const smartFP = detectSmartFocalPoint(selectedImage);
    setFocalPoint(smartFP);
  };

  // Reset work space back to fresh upload state
  const handleResetWorkspace = () => {
    setSelectedImage(null);
    setImageName('');
    setFocalPoint({ x: 0.5, y: 0.5 });
    setCropSettingsMap({});
    // Keep custom presets but clear crop settings
  };

  // Handle adding custom crop dimensions
  const handleAddCustomPreset = (newPreset: CropPreset) => {
    setPresets((prev) => [...prev, newPreset]);
    
    // Automatically initialize its crop settings
    if (selectedImage) {
      const imgW = selectedImage.naturalWidth || selectedImage.width;
      const imgH = selectedImage.naturalHeight || selectedImage.height;
      const imgAspect = imgW / imgH;
      const presetAspect = newPreset.width / newPreset.height;

      const defaultMode: 'crop' | 'blur-fill' = (imgAspect > 1.3 && presetAspect < 0.7) ? 'blur-fill' : 'crop';

      setCropSettingsMap((prev) => ({
        ...prev,
        [newPreset.id]: {
          zoom: 1.0,
          panX: 0,
          panY: 0,
          fillMode: defaultMode,
        },
      }));
    }
  };

  // Delete a custom preset
  const handleDeleteCustomPreset = (presetId: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
    setCropSettingsMap((prev) => {
      const copy = { ...prev };
      delete copy[presetId];
      return copy;
    });
  };

  // Toggle fill mode for a specific preset card directly
  const handleToggleFillMode = (presetId: string) => {
    setCropSettingsMap((prev) => {
      const current = prev[presetId] || { zoom: 1.0, panX: 0, panY: 0, fillMode: 'crop' };
      return {
        ...prev,
        [presetId]: {
          ...current,
          fillMode: current.fillMode === 'blur-fill' ? 'crop' : 'blur-fill',
        },
      };
    });
  };

  // Trigger fine-tune modal save
  const handleSaveModalSettings = (settings: CropSettings) => {
    if (editingPresetId) {
      setCropSettingsMap((prev) => ({
        ...prev,
        [editingPresetId]: settings,
      }));
      setEditingPresetId(null);
    }
  };

  // Bulk set all crops to either "Standard Crop" or "Blur Fill"
  const handleBulkSetFillMode = (mode: 'crop' | 'blur-fill') => {
    setCropSettingsMap((prev) => {
      const updated: Record<string, CropSettings> = {};
      Object.keys(prev).forEach((key) => {
        updated[key] = {
          ...prev[key],
          fillMode: mode,
        };
      });
      return updated;
    });
  };

  // Bulk reset all zoom/pan values back to default
  const handleBulkResetCrops = () => {
    setCropSettingsMap((prev) => {
      const updated: Record<string, CropSettings> = {};
      Object.keys(prev).forEach((key) => {
        updated[key] = {
          zoom: 1.0,
          panX: 0,
          panY: 0,
          fillMode: prev[key]?.fillMode || 'crop',
        };
      });
      return updated;
    });
  };

  // Batch download entire zip file
  const handleDownloadAllZip = async () => {
    if (!selectedImage) return;

    try {
      setIsExportingZip(true);
      setZipProgress(0);

      // Create ZIP using the background engine
      const zipBlob = await exportAllToZip(
        selectedImage,
        presets,
        focalPoint,
        cropSettingsMap,
        (percent) => setZipProgress(percent)
      );

      // Save ZIP file
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `framecrop-export-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsExportingZip(false);
    } catch (e) {
      console.error('ZIP generation error:', e);
      alert('Error compressing files. Please try again.');
      setIsExportingZip(false);
    }
  };

  // Copy dimension ratios helper
  const handleCopyDimensions = (preset: CropPreset) => {
    const text = `${preset.width}x${preset.height}`;
    navigator.clipboard.writeText(text);
    setCopiedPresetId(preset.id);
    setTimeout(() => setCopiedPresetId(null), 2000);
  };

  // Separate default social presets from custom presets for layout grouping
  const socialPresetsList = presets.filter((p) => p.platform !== 'Custom');
  const customPresetsList = presets.filter((p) => p.platform === 'Custom');

  return (
    <div className={`min-h-screen transition-colors duration-200 p-4 md:p-8 bento-grid-bg ${
      isDarkMode ? 'bg-[#18181A] text-white' : 'bg-[#F8F4E8] text-black'
    }`}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER BRAND BAR */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 border-4 border-black rounded-[12px] p-5 bg-[#FFD43B] shadow-[6px_6px_0px_#000]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-black text-[#FFD43B] border-4 border-black rounded-[12px] shadow-[3px_3px_0px_#000] rotate-[-2deg] hover:rotate-0 transition-transform">
              <Crop className="w-8 h-8 stroke-[3.5px]" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-black tracking-tighter uppercase leading-none">
                FrameCrop
              </h1>
              <p className="font-extrabold text-xs md:text-sm text-black/85 mt-1">
                One Upload. Every Platform.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick stats / Theme toggler */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 bg-white border-4 border-black hover:bg-[#74C0FC] rounded-[12px] shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#000] transition-all cursor-pointer inline-flex items-center justify-center text-black"
              title={isDarkMode ? 'Light Mode' : 'Retro Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-5 h-5 stroke-[2.5px]" /> : <Moon className="w-5 h-5 stroke-[2.5px]" />}
            </button>
          </div>
        </header>

        {/* WORKSPACE & UPLOAD ZONE */}
        <section className="grid grid-cols-1 gap-6">
          <ImageUpload
            onImageLoaded={handleImageLoaded}
            selectedImage={selectedImage}
            imageName={imageName}
            focalPoint={focalPoint}
            onChangeFocalPoint={setFocalPoint}
            onDetectSmartFocus={handleDetectSmartFocus}
            onReset={handleResetWorkspace}
          />
        </section>

        {/* RESULTS AND EDITING ENGINE */}
        {selectedImage && (
          <main className="space-y-8 animate-fade-in">
            
            {/* BATCH ACTION CONTROLS PANEL */}
            <div className={`border-4 border-black rounded-[12px] p-5 shadow-[6px_6px_0px_#000] flex flex-col lg:flex-row items-center justify-between gap-6 ${
              isDarkMode ? 'bg-[#2C2E33]' : 'bg-white'
            }`}>
              <div className="space-y-1 text-center lg:text-left">
                <h2 className="text-xl font-black uppercase tracking-tight flex items-center justify-center lg:justify-start gap-2">
                  <Layers className="w-5 h-5 text-[#FFD43B]" /> PREVIEW & EXPORT CENTER
                </h2>
                <p className="text-xs font-bold text-gray-500">
                  {presets.length} crops generated. Review safe-zones, adjust framing ratios, or batch export standard formats.
                </p>
              </div>

              {/* ACTION COMMANDS BAR */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                
                {/* Safe zone toggle */}
                <button
                  onClick={() => setShowSafeZoneOverlay(!showSafeZoneOverlay)}
                  className={`px-4 py-2 border-2 border-black rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    showSafeZoneOverlay 
                      ? 'bg-[#FF8787] text-black shadow-[3px_3px_0px_#000]' 
                      : 'bg-white text-black hover:bg-neutral-50 shadow-[3px_3px_0px_#000]'
                  }`}
                >
                  {showSafeZoneOverlay ? '📺 Hide Safe Zones' : '📺 Show Safe Zones'}
                </button>

                {/* Crop vs Blur buttons */}
                <button
                  onClick={() => handleBulkSetFillMode('crop')}
                  className="px-4 py-2 bg-white hover:bg-neutral-50 text-black border-2 border-black rounded-lg text-xs font-bold shadow-[3px_3px_0px_#000] cursor-pointer"
                  title="Crop all to fill the frame"
                >
                  ✂️ Force Crop All
                </button>

                <button
                  onClick={() => handleBulkSetFillMode('blur-fill')}
                  className="px-4 py-2 bg-white hover:bg-neutral-50 text-black border-2 border-black rounded-lg text-xs font-bold shadow-[3px_3px_0px_#000] cursor-pointer"
                  title="Fit all and fill borders with blur"
                >
                  🎬 Force Blur Fill
                </button>

                {/* Bulk Reset */}
                <button
                  onClick={handleBulkResetCrops}
                  className="px-4 py-2 bg-white hover:bg-neutral-50 text-black border-2 border-black rounded-lg text-xs font-bold shadow-[3px_3px_0px_#000] cursor-pointer"
                  title="Reset custom zoom and pan across all panels"
                >
                  <RefreshCw className="w-3.5 h-3.5 inline mr-1" /> Reset Crop Frame
                </button>

                {/* Batch ZIP Export */}
                <NeoButton
                  onClick={handleDownloadAllZip}
                  variant="black"
                  className="text-xs font-black py-2.5 px-6 uppercase flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-[#FFD43B] stroke-[3px]" /> Export All Crops (.ZIP)
                </NeoButton>
              </div>
            </div>

            {/* PLATFORMS GRID */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b-4 border-black pb-2">
                <h3 className="text-lg md:text-xl font-black uppercase tracking-tight flex items-center gap-2">
                  <Video className="w-5 h-5" /> SOCIAL MEDIA PRESETS
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {socialPresetsList.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    image={selectedImage}
                    focalPoint={focalPoint}
                    settings={cropSettingsMap[preset.id] || { zoom: 1.0, panX: 0, panY: 0, fillMode: 'crop' }}
                    onEditPreset={() => setEditingPresetId(preset.id)}
                    onToggleFillMode={() => handleToggleFillMode(preset.id)}
                    showSafeZoneOverlay={showSafeZoneOverlay}
                  />
                ))}
              </div>
            </div>

            {/* CUSTOM RESOLUTIONS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
              
              {/* Form panel */}
              <div className="lg:col-span-1">
                <CustomSizeForm onAddCustomPreset={handleAddCustomPreset} />
              </div>

              {/* Custom crops list */}
              <div className="lg:col-span-2 space-y-6">
                <div className="border-b-4 border-black pb-2">
                  <h3 className="text-lg md:text-xl font-black uppercase tracking-tight flex items-center gap-2">
                    <Sliders className="w-5 h-5" /> YOUR CUSTOM RESOLUTIONS
                  </h3>
                </div>

                {customPresetsList.length === 0 ? (
                  <div className={`border-4 border-dashed border-black rounded-[12px] p-8 text-center ${
                    isDarkMode ? 'bg-[#212328]' : 'bg-[#F8F4E8]/50'
                  }`}>
                    <Sliders className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="font-bold text-sm text-gray-600">No custom resolutions created yet.</p>
                    <p className="text-xs text-gray-400 font-semibold mt-1">Use the generator on the left to add your own dimensions!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {customPresetsList.map((preset) => (
                      <div key={preset.id} className="relative">
                        {/* Custom preset cards */}
                        <PresetCard
                          preset={preset}
                          image={selectedImage}
                          focalPoint={focalPoint}
                          settings={cropSettingsMap[preset.id] || { zoom: 1.0, panX: 0, panY: 0, fillMode: 'crop' }}
                          onEditPreset={() => setEditingPresetId(preset.id)}
                          onToggleFillMode={() => handleToggleFillMode(preset.id)}
                          showSafeZoneOverlay={showSafeZoneOverlay}
                        />

                        {/* Top corner Delete/Trash controller */}
                        <button
                          onClick={() => handleDeleteCustomPreset(preset.id)}
                          className="absolute top-2.5 right-12 p-1.5 bg-red-100 hover:bg-red-200 border-2 border-black rounded-lg cursor-pointer shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all"
                          title="Delete custom preset"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </main>
        )}

        {/* INTRODUCTORY BRAND BENEFIT BANNER (if no image loaded) */}
        {!selectedImage && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <NeoCard bg="bg-white" className="space-y-2">
              <div className="p-2 bg-[#FFD43B] border-4 border-black rounded-lg inline-block shadow-[2px_2px_0px_#000]">
                <Sparkles className="w-5 h-5 text-black" />
              </div>
              <h4 className="font-black text-base text-black uppercase">Edge Gradient Smart Focus</h4>
              <p className="text-xs font-bold text-gray-500 leading-normal">
                Analyzes details, patterns, and contrast borders to intelligently preserve focal subjects without manual math.
              </p>
            </NeoCard>

            <NeoCard bg="bg-white" className="space-y-2">
              <div className="p-2 bg-[#74C0FC] border-4 border-black rounded-lg inline-block shadow-[2px_2px_0px_#000]">
                <Layers className="w-5 h-5 text-black" />
              </div>
              <h4 className="font-black text-base text-black uppercase">Creator Safe Zones</h4>
              <p className="text-xs font-bold text-gray-500 leading-normal">
                Avoid caption blocks, user icons, and system UI overlay zones for TikTok, Instagram Stories, and YouTube Thumbnails.
              </p>
            </NeoCard>

            <NeoCard bg="bg-white" className="space-y-2">
              <div className="p-2 bg-[#8CE99A] border-4 border-black rounded-lg inline-block shadow-[2px_2px_0px_#000]">
                <Sliders className="w-5 h-5 text-black" />
              </div>
              <h4 className="font-black text-base text-black uppercase">Interactive Panning</h4>
              <p className="text-xs font-bold text-gray-500 leading-normal">
                Need specific offsets? Slide, pinch, drag, and fine-tune individual platforms with simple live studio previewing.
              </p>
            </NeoCard>
          </section>
        )}

        {/* FINE-TUNE CROP STUDIO MODAL DIALOG */}
        {editingPresetId && selectedImage && (
          <CropEditorModal
            preset={presets.find((p) => p.id === editingPresetId)!}
            image={selectedImage}
            focalPoint={focalPoint}
            initialSettings={cropSettingsMap[editingPresetId] || { zoom: 1.0, panX: 0, panY: 0, fillMode: 'crop' }}
            onSave={handleSaveModalSettings}
            onClose={() => setEditingPresetId(null)}
          />
        )}

        {/* EXPORT ZIP MODAL LOADER */}
        {isExportingZip && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white border-4 border-black p-6 rounded-[12px] shadow-[8px_8px_0px_#FFD43B] text-center max-w-sm w-full space-y-4">
              <div className="font-black text-lg text-black uppercase">COMPRESSING RENDER STACK</div>
              
              <div className="relative h-6 bg-gray-200 rounded-full border-2 border-black overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-[#8CE99A] border-r-2 border-black transition-all duration-150"
                  style={{ width: `${zipProgress}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center font-extrabold text-xs text-black">
                  {zipProgress}% Completed
                </span>
              </div>

              <p className="text-xs font-bold text-gray-500">
                Instantiating high-resolution multi-threaded offscreen canvas processes and bundling into ZIP archive...
              </p>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer className="text-center py-8 border-t-4 border-black mt-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-extrabold text-xs uppercase tracking-wide">
            ⚙️ FrameCrop — ONE UPLOAD. EVERY PLATFORM.
          </p>
          <p className="font-bold text-xs text-gray-500 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-[#74C0FC]" /> Real-time in-browser client-side canvas engine. No backend, 100% private.
          </p>
        </footer>

      </div>
    </div>
  );
}
