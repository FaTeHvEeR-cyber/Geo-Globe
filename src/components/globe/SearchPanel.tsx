'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

interface SearchPanelProps {
  onLocationSelect: (lon: number, lat: number, name: string) => void;
}

export function SearchPanel({ onLocationSelect }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchLocation = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Using Nominatim (OpenStreetMap) for free geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setResults(data);
      setIsOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      searchLocation(query);
    }
  };

  const handleSelect = (result: SearchResult) => {
    const lon = parseFloat(result.lon);
    const lat = parseFloat(result.lat);
    onLocationSelect(lon, lat, result.display_name);
    setQuery(result.display_name.split(',')[0]);
    setIsOpen(false);
    setResults([]);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setError(null);
  };

  return (
    <div className="relative w-full max-w-sm">
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Search for a location..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10 bg-background/95 backdrop-blur-sm shadow-lg"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 h-7 w-7 p-0"
            onClick={clearSearch}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Search results dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg z-50">
          <ScrollArea className="max-h-64">
            <ul className="py-1">
              {results.map((result) => (
                <li key={result.place_id}>
                  <button
                    type="button"
                    className="w-full px-4 py-2 text-left hover:bg-muted/50 flex items-start gap-3 transition-colors"
                    onClick={() => handleSelect(result)}
                  >
                    <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {result.display_name.split(',')[0]}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {result.display_name.split(',').slice(1, 3).join(',')}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-1 p-3 bg-destructive/10 text-destructive text-xs rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}
