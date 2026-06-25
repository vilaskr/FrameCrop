import { useState, FormEvent } from 'react';
import { Plus, Sliders } from 'lucide-react';
import NeoButton from './NeoButton';
import NeoCard from './NeoCard';
import { CropPreset } from '../types';

interface CustomSizeFormProps {
  onAddCustomPreset: (preset: CropPreset) => void;
}

export default function CustomSizeForm({ onAddCustomPreset }: CustomSizeFormProps) {
  const [name, setName] = useState('');
  const [width, setWidth] = useState<number | ''>(1000);
  const [height, setHeight] = useState<number | ''>(1000);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!width || width < 100 || width > 4000) {
      setError('Width must be between 100px and 4000px!');
      return;
    }

    if (!height || height < 100 || height > 4000) {
      setError('Height must be between 100px and 4000px!');
      return;
    }

    setError(null);

    const cleanName = name.trim() || `Custom ${width}×${height}`;
    
    const newPreset: CropPreset = {
      id: `custom-${Date.now()}`,
      name: cleanName,
      platform: 'Custom',
      width: Number(width),
      height: Number(height),
      iconName: 'Sliders',
    };

    onAddCustomPreset(newPreset);
    
    // Reset inputs
    setName('');
    setWidth(1000);
    setHeight(1000);
  };

  return (
    <NeoCard bg="bg-[#FF8787]" className="h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 pb-3 border-b-2 border-black mb-4">
          <Sliders className="w-5 h-5 text-black" />
          <h3 className="font-extrabold text-lg text-black uppercase tracking-wider">
            Custom Preset Creator
          </h3>
        </div>

        <p className="text-xs font-bold text-black/80 mb-4 leading-normal">
          Need a specific resolution for a blog post, newsletter, or custom digital screen? Generate customized crop panels on-the-fly!
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Preset Name */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-black uppercase tracking-wider block">
              Label / Preset Name
            </label>
            <input
              type="text"
              placeholder="e.g., Twitch Banner, Email Header"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border-4 border-black p-2.5 rounded-lg text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-black placeholder-black/40"
            />
          </div>

          {/* Width & Height */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-black uppercase tracking-wider block">
                Width (px)
              </label>
              <input
                type="number"
                min="100"
                max="4000"
                value={width}
                onChange={(e) => setWidth(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-white border-4 border-black p-2.5 rounded-lg text-sm font-bold text-black focus:outline-none font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-black uppercase tracking-wider block">
                Height (px)
              </label>
              <input
                type="number"
                min="100"
                max="4000"
                value={height}
                onChange={(e) => setHeight(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-white border-4 border-black p-2.5 rounded-lg text-sm font-bold text-black focus:outline-none font-mono"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-extrabold text-black bg-white/80 p-2 rounded border-2 border-black">
              ⚠️ {error}
            </p>
          )}

          <div className="pt-2">
            <NeoButton
              type="submit"
              variant="yellow"
              className="w-full text-xs font-extrabold uppercase py-2.5"
            >
              <Plus className="w-4 h-4 mr-2 stroke-[3px]" /> Generate Custom Crop
            </NeoButton>
          </div>
        </form>
      </div>
    </NeoCard>
  );
}
