import type { Viewer } from 'cesium';

// Extracted from the legacy screenshot utility; always include visible attribution.
export function captureGlobe(viewer: Viewer, report: (message: string) => void) {
  try {
    viewer.scene.requestRender();
    viewer.render();
    const image = document.createElement('canvas');
    image.width = viewer.canvas.width;
    image.height = viewer.canvas.height + 40;
    const context = image.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.fillStyle = '#090d10'; context.fillRect(0, 0, image.width, image.height);
    context.drawImage(viewer.canvas, 0, 0);
    context.fillStyle = '#fff'; context.font = '14px sans-serif';
    const attribution = viewer.cesiumWidget.creditContainer.textContent?.replace('Data attribution', '').trim();
    context.fillText(`Cesium | ${attribution || 'Natural Earth'}`, 12, image.height - 14);
    image.toBlob(blob => {
      if (!blob) { report('Screenshot could not be created.'); return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = 'geo-globe.png'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  } catch { report('Screenshot unavailable for this imagery provider.'); }
}
