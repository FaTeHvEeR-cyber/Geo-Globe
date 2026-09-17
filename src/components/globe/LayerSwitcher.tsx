'use client';

import { useGlobeStore } from '@/store/globe-store';
import { IMAGERY_LAYERS } from '@/lib/cesium-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Map, Satellite, Mountain, Contrast, Globe, Layers, Eye, Building, Moon, Sun } from 'lucide-react';

const layerIcons = {
  osm: Map,
  satellite: Satellite,
  terrain: Mountain,
  toner: Contrast,
  hybrid: Globe,
};

export function LayerSwitcher() {
  const { imageryLayer, setImageryLayer, showTerrain, toggleTerrain, show3DBuildings, toggle3DBuildings, showNightLights, toggleNightLights, showDayNightTerminator, toggleDayNightTerminator } = useGlobeStore();

  return (
    <Card className="bg-background/95 backdrop-blur-sm border shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Map Layers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Base Imagery Layers */}
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Base Map</span>
          <div className="grid grid-cols-1 gap-1.5">
            {IMAGERY_LAYERS.map((layer) => {
              const Icon = layerIcons[layer.id];
              return (
                <Button
                  key={layer.id}
                  variant={imageryLayer === layer.id ? 'default' : 'ghost'}
                  size="sm"
                  className={`w-full justify-start h-auto py-2 px-3 ${
                    imageryLayer === layer.id ? 'bg-primary text-primary-foreground' : ''
                  }`}
                  onClick={() => setImageryLayer(layer.id)}
                >
                  <Icon className="h-4 w-4 mr-2 shrink-0" />
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-xs">{layer.name}</span>
                    <span className="text-[10px] opacity-70">{layer.description}</span>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Overlays */}
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Overlays</span>
          <div className="space-y-1.5">
            <Button
              variant={showTerrain ? 'default' : 'ghost'}
              size="sm"
              className={`w-full justify-start ${showTerrain ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={toggleTerrain}
            >
              <Mountain className="h-4 w-4 mr-2" />
              <span className="text-xs">3D Terrain</span>
            </Button>
            <Button
              variant={show3DBuildings ? 'default' : 'ghost'}
              size="sm"
              className={`w-full justify-start ${show3DBuildings ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={toggle3DBuildings}
            >
              <Building className="h-4 w-4 mr-2" />
              <span className="text-xs">3D Buildings</span>
            </Button>
            <Button
              variant={showNightLights ? 'default' : 'ghost'}
              size="sm"
              className={`w-full justify-start ${showNightLights ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={toggleNightLights}
            >
              <Moon className="h-4 w-4 mr-2" />
              <span className="text-xs">Night Lights</span>
            </Button>
            <Button
              variant={showDayNightTerminator ? 'default' : 'ghost'}
              size="sm"
              className={`w-full justify-start ${showDayNightTerminator ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={toggleDayNightTerminator}
            >
              <Sun className="h-4 w-4 mr-2" />
              <span className="text-xs">Day/Night</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
