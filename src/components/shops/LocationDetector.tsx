import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2, Check } from 'lucide-react';

interface LocationDetectorProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
}

export function LocationDetector({ 
  latitude, 
  longitude, 
  onLocationChange 
}: LocationDetectorProps) {
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  // Sync manual inputs with props
  useEffect(() => {
    if (latitude !== null) setManualLat(latitude.toString());
    if (longitude !== null) setManualLng(longitude.toString());
  }, [latitude, longitude]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setDetecting(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocationChange(position.coords.latitude, position.coords.longitude);
        setDetecting(false);
      },
      (err) => {
        setError('Unable to detect location. Please enter manually.');
        setDetecting(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  const handleManualChange = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      onLocationChange(lat, lng);
    }
  };

  const hasValidLocation = latitude !== null && longitude !== null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={detectLocation}
          disabled={detecting}
          className="gap-2"
        >
          {detecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : hasValidLocation ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <MapPin className="w-4 h-4" />
          )}
          {detecting ? 'Detecting...' : hasValidLocation ? 'Location Detected' : 'Detect My Location'}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            type="number"
            step="any"
            placeholder="e.g., 28.6139"
            value={manualLat}
            onChange={(e) => {
              setManualLat(e.target.value);
            }}
            onBlur={handleManualChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            type="number"
            step="any"
            placeholder="e.g., 77.2090"
            value={manualLng}
            onChange={(e) => {
              setManualLng(e.target.value);
            }}
            onBlur={handleManualChange}
          />
        </div>
      </div>

      {hasValidLocation && (
        <p className="text-sm text-muted-foreground">
          📍 Location set: {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
        </p>
      )}
    </div>
  );
}
