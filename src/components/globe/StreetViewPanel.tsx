'use client';

import { useEffect, useRef, useState } from 'react';
import { useGlobeStore } from '@/store/globe-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, MapPin, Camera, AlertCircle, ExternalLink } from 'lucide-react';

export function StreetViewPanel() {
  const { streetViewOpen, streetViewLocation, closeStreetView } = useGlobeStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [hasImagery, setHasImagery] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!streetViewOpen || !streetViewLocation) return;

    setLoading(true);
    setHasImagery(true);

    // Use Mapillary or fallback to a static street view image
    const fetchStreetViewImage = async () => {
      try {
        // Using Mapillary's coverage API to check for imagery
        // For demo, we'll show a placeholder with coordinates
        // In production, integrate MapillaryJS for full 360° viewer
        
        // Generate a street view like image using coordinates
        // This is a placeholder - in production, use Mapillary API
        const lat = streetViewLocation.lat;
        const lon = streetViewLocation.lon;
        
        // Create a static map image showing the location
        const staticMapUrl = `https://static-maps.yandex.ru/1.x/?ll=${lon},${lat}&size=450,300&z=15&l=map&pt=${lon},${lat},pm2rdm`;
        
        setImageUrl(staticMapUrl);
        setHasImagery(true);
      } catch (error) {
        console.error('Failed to fetch street view:', error);
        setHasImagery(false);
      } finally {
        setLoading(false);
      }
    };

    fetchStreetViewImage();
  }, [streetViewOpen, streetViewLocation]);

  if (!streetViewOpen || !streetViewLocation) return null;

  return (
    <Card className="absolute bottom-4 right-4 w-80 bg-background/95 backdrop-blur-sm border shadow-lg z-20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Street View
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={closeStreetView} className="h-6 px-2">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Location coordinates */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>
            {streetViewLocation.lat.toFixed(5)}°, {streetViewLocation.lon.toFixed(5)}°
          </span>
        </div>

        {/* Street view image / placeholder */}
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : hasImagery && imageUrl ? (
            <img
              src={imageUrl}
              alt="Street view location"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p className="text-xs">No street view imagery available for this location</p>
            </div>
          )}
        </div>

        {/* External links */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => {
              const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${streetViewLocation.lat},${streetViewLocation.lon}`;
              window.open(url, '_blank');
            }}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Google Street View
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => {
              const url = `https://www.mapillary.com/app/?lat=${streetViewLocation.lat}&lng=${streetViewLocation.lon}&z=17`;
              window.open(url, '_blank');
            }}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Mapillary
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Right-click on map to open street view
        </p>
      </CardContent>
    </Card>
  );
}
