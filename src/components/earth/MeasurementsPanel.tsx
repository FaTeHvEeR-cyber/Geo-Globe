'use client';

import { useEarthStore } from '@/store/earth';
import { formatArea, formatDistance, measure } from '@/lib/earth/measurements';

export default function MeasurementsPanel() {
  const { tool, points, cursor, completed, startTool, complete, clearMeasurement } = useEarthStore();
  const active = tool === 'distance' || tool === 'area';
  const preview = active && !completed && cursor && points.length ? [...points, cursor] : points;
  const result = measure(preview, tool === 'area');
  const buttonClass = 'border border-[#39FF14]/30 bg-[#262626] px-3 py-2 text-[10px] uppercase text-[#39FF14] hover:bg-[#39FF14]/10 disabled:opacity-40';

  return <section className="space-y-3 text-xs text-neutral-300" aria-label="Measurement tools">
    <div className="flex gap-2">
      <button type="button" className={buttonClass} aria-pressed={tool === 'distance'} onClick={() => startTool('distance')}>Distance</button>
      <button type="button" className={buttonClass} aria-pressed={tool === 'area'} onClick={() => startTool('area')}>Area</button>
    </div>
    <p className="text-[11px] leading-relaxed text-neutral-400">Click on the globe to add points. Double-click or press Enter to finish. Press Esc to cancel while the globe is focused.</p>
    {active && <>
      <div className="border border-[#39FF14]/20 bg-black/40 p-3 font-mono" aria-live="polite">
        <p className="mb-2 text-[#39FF14]">{completed ? 'COMPLETE' : 'DRAWING'} · {points.length} points</p>
        <p>{tool === 'area' ? formatArea(result.squareMeters) : formatDistance(result.meters)}</p>
        {tool === 'area' && <p className="mt-1 text-neutral-400">Perimeter: {formatDistance(result.meters)}</p>}
      </div>
      <div className="flex gap-2">
        <button type="button" className={buttonClass} disabled={completed || points.length < (tool === 'area' ? 3 : 2)} onClick={complete}>Complete</button>
        <button type="button" className={buttonClass} onClick={clearMeasurement}>{completed ? 'Clear' : 'Cancel'}</button>
      </div>
    </>}
    <p className="text-[10px] text-neutral-500">WGS84 surface distance and area; terrain height is excluded.</p>
  </section>;
}
