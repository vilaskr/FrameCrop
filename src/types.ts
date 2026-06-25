export interface CropPreset {
  id: string;
  name: string;
  platform: 'Instagram' | 'TikTok' | 'YouTube' | 'X' | 'LinkedIn' | 'Pinterest' | 'Facebook' | 'Custom';
  width: number;
  height: number;
  iconName: string; // Used to pick the right Lucide icon
  safeZoneType?: 'instagram_story' | 'tiktok' | 'youtube_thumbnail' | 'none';
}

export interface FocalPoint {
  x: number; // Percentage from left (0 - 1)
  y: number; // Percentage from top (0 - 1)
}

export interface CropSettings {
  zoom: number;      // 1.0 to 3.0
  panX: number;      // Pixel offset from auto-center
  panY: number;      // Pixel offset from auto-center
  fillMode: 'crop' | 'blur-fill'; // 'crop' crops, 'blur-fill' fits and blurs the background
}

export interface ImageCropData {
  presetId: string;
  settings: CropSettings;
}

export interface CustomPreset {
  id: string;
  name: string;
  width: number;
  height: number;
}
