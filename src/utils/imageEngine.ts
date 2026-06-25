import JSZip from 'jszip';
import { CropPreset, CropSettings, FocalPoint } from '../types';

/**
 * Automatically calculates a smart focal point by analyzing luminance gradients (edges).
 * This finds the high-contrast/high-detail regions (usually the subject, faces, or text).
 */
export function detectSmartFocalPoint(img: HTMLImageElement): FocalPoint {
  try {
    const canvas = document.createElement('canvas');
    const size = 100; // 100x100 is fast yet detailed enough for local feature density
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { x: 0.5, y: 0.5 };

    ctx.drawImage(img, 0, 0, size, size);
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;

    // 1. Calculate a pixel-level saliency score for each coordinate
    // It is a combination of:
    // - Local luminance gradient (detects sharp borders, text, logos, facial contours)
    // - Skin-tone classification (boosts human faces across all races)
    // - Saturated color detection (boosts graphic icons/logos which usually have rich color profiles)
    const pixelScores = Array.from({ length: size }, () => new Float32Array(size));

    // Helper to get RGB
    const getRGB = (x: number, y: number) => {
      const idx = (y * size + x) * 4;
      if (idx < 0 || idx >= data.length) return { r: 0, g: 0, b: 0 };
      return { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
    };

    // Helper to get luma
    const getLumaValue = (x: number, y: number) => {
      const { r, g, b } = getRGB(x, y);
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };

    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const { r, g, b } = getRGB(x, y);

        // A. Luminance gradients (edges/details)
        const lumaCenter = 0.299 * r + 0.587 * g + 0.114 * b;
        const lumaRight = getLumaValue(x + 1, y);
        const lumaLeft = getLumaValue(x - 1, y);
        const lumaBottom = getLumaValue(x, y + 1);
        const lumaTop = getLumaValue(x, y - 1);

        const gradX = lumaRight - lumaLeft;
        const gradY = lumaBottom - lumaTop;
        const edge = Math.sqrt(gradX * gradX + gradY * gradY);

        // B. Skin tone detection heuristic (boosts human faces of all races)
        // Red is normally dominant, and there are specific skin ratios.
        const maxVal = Math.max(r, g, b);
        const minVal = Math.min(r, g, b);
        const isSkin = r > 60 && g > 35 && b > 25 && r > g && g > b && (r - g) > 12 && (r - b) > 18;

        // C. Saturated color detection (vibrant logos or vector elements)
        const saturation = maxVal > 0 ? (maxVal - minVal) / maxVal : 0;
        const satBonus = saturation * 40; // up to +40 score boost

        // D. Combined pixel score
        pixelScores[y][x] = edge + (isSkin ? 65 : 0) + satBonus;
      }
    }

    // 2. Build a Summed-Area Table (SAT / Integral Image) of pixelScores
    // This allows us to sum any WxW window in O(1) constant time.
    const sat = Array.from({ length: size + 1 }, () => new Float32Array(size + 1));
    for (let y = 1; y <= size; y++) {
      for (let x = 1; x <= size; x++) {
        sat[y][x] = pixelScores[y - 1][x - 1] + sat[y - 1][x] + sat[y][x - 1] - sat[y - 1][x - 1];
      }
    }

    // 3. Sliding Window density search
    // We want to find a window of size W x W that has the maximum total energy.
    // This localized sliding window corresponds to the primary subject / focal area.
    const wSize = 30; // 30% of image dimensions
    let maxScore = -1;
    let bestX = 0;
    let bestY = 0;

    const centerCoord = size / 2;
    const maxDist = Math.sqrt(centerCoord * centerCoord * 2);

    for (let y = 0; y <= size - wSize; y++) {
      for (let x = 0; x <= size - wSize; x++) {
        // Fast O(1) window sum using SAT
        const x1 = x;
        const y1 = y;
        const x2 = x + wSize;
        const y2 = y + wSize;
        const windowSum = sat[y2][x2] - sat[y1][x2] - sat[y2][x1] + sat[y1][x1];

        // Apply a gentle central bias to favor subjects in the center
        // but not strong enough to ignore high-contrast subjects near the edges
        const winCenterX = x + wSize / 2;
        const winCenterY = y + wSize / 2;
        const distFromCenter = Math.sqrt(
          (winCenterX - centerCoord) * (winCenterX - centerCoord) +
          (winCenterY - centerCoord) * (winCenterY - centerCoord)
        );
        const centerBias = 1.0 - 0.25 * (distFromCenter / maxDist);

        const score = windowSum * centerBias;

        if (score > maxScore) {
          maxScore = score;
          bestX = x;
          bestY = y;
        }
      }
    }

    // 4. Find precise localized center of mass within the winning window
    // This allows exact tracking of the most intense point inside the subject box (e.g. eyes/nose, or logo center)
    let sumX = 0;
    let sumY = 0;
    let totalWeight = 0;

    for (let y = bestY; y < bestY + wSize; y++) {
      for (let x = bestX; x < bestX + wSize; x++) {
        const weight = pixelScores[y][x];
        sumX += weight * x;
        sumY += weight * y;
        totalWeight += weight;
      }
    }

    let fx = 0.5;
    let fy = 0.5;

    if (totalWeight > 10) {
      fx = sumX / totalWeight / size;
      fy = sumY / totalWeight / size;
    } else {
      fx = (bestX + wSize / 2) / size;
      fy = (bestY + wSize / 2) / size;
    }

    // Comfortable bounds to prevent placing the crop anchor at extreme outer boundaries
    fx = Math.max(0.12, Math.min(0.88, fx));
    fy = Math.max(0.12, Math.min(0.88, fy));

    return { x: fx, y: fy };

  } catch (e) {
    console.error('Failed to run smart focal point detection:', e);
  }

  return { x: 0.5, y: 0.5 }; // Fallback to center
}

interface DrawOptions {
  ctx: CanvasRenderingContext2D;
  img: HTMLImageElement;
  targetW: number;
  targetH: number;
  focalPoint: FocalPoint;
  settings: CropSettings;
  drawOverlays?: {
    ruleOfThirds?: boolean;
    centerGuide?: boolean;
    safeZone?: 'instagram_story' | 'tiktok' | 'youtube_thumbnail' | 'none';
    grid?: boolean;
  };
}

/**
 * Draws the image cropped according to focal point and settings onto the canvas
 */
export function drawCroppedImage({
  ctx,
  img,
  targetW,
  targetH,
  focalPoint,
  settings,
  drawOverlays,
}: DrawOptions): void {
  const { zoom, panX, panY, fillMode } = settings;
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;

  // Clear canvas
  ctx.clearRect(0, 0, targetW, targetH);

  if (fillMode === 'blur-fill') {
    // 1. DRAW BLURRED COVER BACKGROUND
    ctx.save();
    
    // Setup blurring filter
    ctx.filter = 'blur(24px) brightness(0.85)';
    
    // Scale up slightly to avoid edge leaking
    const bgScale = Math.max(targetW / imgW, targetH / imgH) * 1.1;
    const bgW = imgW * bgScale;
    const bgH = imgH * bgScale;
    const bgX = (targetW - bgW) / 2;
    const bgY = (targetH - bgH) / 2;
    
    ctx.drawImage(img, bgX, bgY, bgW, bgH);
    ctx.restore();

    // 2. DRAW CENTERED ASPECT-FIT IMAGE WITH ZOOM/PAN
    ctx.save();
    const fitScale = Math.min(targetW / imgW, targetH / imgH) * zoom;
    const drawW = imgW * fitScale;
    const drawH = imgH * fitScale;

    // Apply focal offset and user pan
    const baseDX = (targetW - drawW) / 2;
    const baseDY = (targetH - drawH) / 2;
    
    // In fit mode, the focal offset shifts the content slightly inside the bounds if desired,
    // but typically we can let the user freely pan.
    const finalDX = baseDX + panX;
    const finalDY = baseDY + panY;

    // Create a clipping mask to keep fit image within boundaries
    ctx.beginPath();
    ctx.rect(0, 0, targetW, targetH);
    ctx.clip();

    ctx.drawImage(img, finalDX, finalDY, drawW, drawH);
    ctx.restore();

  } else {
    // STANDARD CROP FILL MODE
    ctx.save();
    
    // Base scale to fit completely covering the target
    const baseScale = Math.max(targetW / imgW, targetH / imgH);
    
    // Multiplied by user zoom
    const finalScale = baseScale * zoom;
    const drawW = imgW * finalScale;
    const drawH = imgH * finalScale;

    // Calculate focal center in target coordinates
    const focalCanvasX = focalPoint.x * imgW * finalScale;
    const focalCanvasY = focalPoint.y * imgH * finalScale;

    // Ideal offset to center the focal point in the viewport
    const idealDX = targetW / 2 - focalCanvasX;
    const idealDY = targetH / 2 - focalCanvasY;

    // Base position aligning focal point
    let dx = idealDX + panX;
    let dy = idealDY + panY;

    // Prevent image from leaving canvas bounds
    // The width/height of the drawn image is drawW, drawH.
    // So dx must be within [targetW - drawW, 0] if drawW >= targetW
    if (drawW >= targetW) {
      dx = Math.min(0, Math.max(targetW - drawW, dx));
    } else {
      dx = (targetW - drawW) / 2; // Keep centered if smaller
    }

    if (drawH >= targetH) {
      dy = Math.min(0, Math.max(targetH - drawH, dy));
    } else {
      dy = (targetH - drawH) / 2; // Keep centered if smaller
    }

    // Clip to bounds
    ctx.beginPath();
    ctx.rect(0, 0, targetW, targetH);
    ctx.clip();

    ctx.drawImage(img, dx, dy, drawW, drawH);
    ctx.restore();
  }

  // DRAW OVERLAYS IF REQUESTED
  if (drawOverlays) {
    const { ruleOfThirds, centerGuide, safeZone, grid } = drawOverlays;

    // Use a high-contrast style: thin lines with dark outline for readability on any color
    const setLineStyle = (color: string, width: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 3;
    };

    const resetShadow = () => {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    };

    // Grid (fine helper lines)
    if (grid) {
      ctx.save();
      setLineStyle('rgba(255, 255, 255, 0.25)', 1);
      const cols = 8;
      const rows = 8;
      for (let i = 1; i < cols; i++) {
        const x = (targetW / cols) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, targetH);
        ctx.stroke();
      }
      for (let j = 1; j < rows; j++) {
        const y = (targetH / rows) * j;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(targetW, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Rule of Thirds
    if (ruleOfThirds) {
      ctx.save();
      setLineStyle('#FFD43B', 2); // Warm Yellow for Neo-brutalism feel
      
      // Vertical thirds
      for (let i = 1; i <= 2; i++) {
        const x = (targetW / 3) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, targetH);
        ctx.stroke();
      }

      // Horizontal thirds
      for (let i = 1; i <= 2; i++) {
        const y = (targetH / 3) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(targetW, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Center Guides
    if (centerGuide) {
      ctx.save();
      setLineStyle('#8CE99A', 2); // Soft Green
      
      // Center vertical
      ctx.beginPath();
      ctx.moveTo(targetW / 2, 0);
      ctx.lineTo(targetW / 2, targetH);
      ctx.stroke();

      // Center horizontal
      ctx.beginPath();
      ctx.moveTo(0, targetH / 2);
      ctx.lineTo(targetW, targetH / 2);
      ctx.stroke();

      // Small center crosshair
      resetShadow();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(targetW / 2, targetH / 2, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#8CE99A';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(targetW / 2, targetH / 2, 10, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    // Safe Zones (IG Story, TikTok, YouTube)
    if (safeZone && safeZone !== 'none') {
      ctx.save();
      resetShadow();

      if (safeZone === 'instagram_story') {
        // Safe Zone is generally 250px from top and 250px from bottom on a 1080x1920 canvas
        const topY = (250 / 1920) * targetH;
        const botY = ((1920 - 250) / 1920) * targetH;

        // Draw light red dotted safe zone boundaries
        ctx.strokeStyle = '#FF8787';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        
        ctx.beginPath();
        ctx.moveTo(0, topY);
        ctx.lineTo(targetW, topY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, botY);
        ctx.lineTo(targetW, botY);
        ctx.stroke();

        // Draw labels
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255, 135, 135, 0.25)';
        ctx.fillRect(0, 0, targetW, topY);
        ctx.fillRect(0, botY, targetW, targetH - botY);

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 12px sans-serif';
        // Add a yellow background badge for Neo-brutalist labels
        const textTop = 'RESERVED FOR INSTAGRAM UI (TOP)';
        const textBot = 'RESERVED FOR INSTAGRAM UI (BOTTOM)';
        
        ctx.fillStyle = '#FF8787';
        ctx.fillText(textTop, 15, topY - 10);
        ctx.fillText(textBot, 15, botY + 20);
      }

      if (safeZone === 'tiktok') {
        // TikTok has UI on right (likes, profile, share) and bottom (description, music)
        // Right side: 150px on 1080 width
        const rightX = ((1080 - 150) / 1080) * targetW;
        // Bottom side: 350px on 1920 height
        const botY = ((1920 - 350) / 1920) * targetH;
        // Top side: 150px on 1920 height (search/tab bar)
        const topY = (150 / 1920) * targetH;

        ctx.strokeStyle = '#FF8787';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);

        // Draw lines
        ctx.beginPath();
        ctx.moveTo(rightX, topY);
        ctx.lineTo(rightX, botY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, botY);
        ctx.lineTo(targetW, botY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, topY);
        ctx.lineTo(targetW, topY);
        ctx.stroke();

        // Shading
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255, 135, 135, 0.15)';
        ctx.fillRect(0, 0, targetW, topY); // Top
        ctx.fillRect(rightX, topY, targetW - rightX, botY - topY); // Right
        ctx.fillRect(0, botY, targetW, targetH - botY); // Bottom

        ctx.fillStyle = '#FF8787';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('TIKTOK UI ZONE', 15, topY - 8);
        ctx.fillText('TIKTOK USER INTERFACE', rightX - 160, botY - 10);
        ctx.fillText('TIKTOK DESCRIPTION / CAPTION', 15, botY + 20);
      }

      if (safeZone === 'youtube_thumbnail') {
        // YouTube Thumbnail has a time overlay in bottom right corner (roughly 120x40 on 1280x720)
        const badgeW = (130 / 1280) * targetW;
        const badgeH = (45 / 720) * targetH;
        const badgeX = targetW - badgeW - 15;
        const badgeY = targetH - badgeH - 15;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
        
        ctx.strokeStyle = '#FFD43B';
        ctx.lineWidth = 2;
        ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('14:32', badgeX + badgeW / 2, badgeY + badgeH / 2 - 5);
        ctx.fillStyle = '#FF8787';
        ctx.fillText('TIMESTAMP BLOCK', badgeX + badgeW / 2, badgeY + badgeH / 2 + 8);
        
        // Reset alignment
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      }

      ctx.restore();
    }
  }
}

/**
 * Renders a crop preset to a high-quality blob or data URL for download
 */
export async function renderToBlob(
  img: HTMLImageElement,
  preset: { width: number; height: number },
  focalPoint: FocalPoint,
  settings: CropSettings
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = preset.width;
    canvas.height = preset.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Failed to get 2D canvas context'));
      return;
    }

    // Draw high quality
    drawCroppedImage({
      ctx,
      img,
      targetW: preset.width,
      targetH: preset.height,
      focalPoint,
      settings,
    });

    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas to Blob conversion failed'));
      }
    }, 'image/png');
  });
}

/**
 * Packs all selected crops into a unified ZIP file asynchronously
 */
export async function exportAllToZip(
  img: HTMLImageElement,
  presets: CropPreset[],
  focalPoint: FocalPoint,
  cropSettingsMap: Record<string, CropSettings>,
  onProgress: (percent: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const total = presets.length;

  for (let i = 0; i < total; i++) {
    const p = presets[i];
    const settings = cropSettingsMap[p.id] || { zoom: 1.0, panX: 0, panY: 0, fillMode: 'crop' };

    // Render preset to blob
    const blob = await renderToBlob(img, p, focalPoint, settings);

    // Structure a safe file name
    const cleanName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    zip.file(`framecrop-${cleanName}-${p.width}x${p.height}.png`, blob);

    onProgress(Math.round(((i + 1) / total) * 100));
  }

  return await zip.generateAsync({ type: 'blob' });
}

