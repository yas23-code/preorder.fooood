import { useState, useEffect, Suspense, lazy, Component, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MapPin, Loader2, Save, Navigation, AlertTriangle } from 'lucide-react';

// Local error boundary for the map component
class MapErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-56 rounded-lg bg-muted flex flex-col items-center justify-center border text-muted-foreground">
          <AlertTriangle className="h-6 w-6 mb-2" />
          <p className="text-sm">Map preview unavailable</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy load the map component to avoid SSR issues
const CampusMapPreview = lazy(() => 
  import('./CampusMapPreview').then(mod => ({ default: mod.CampusMapPreview }))
);

interface CollegeConfig {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  campus_radius_meters: number;
  is_active: boolean;
  show_nearby_shops: boolean;
}

export function CollegeConfigManager() {
  const { toast } = useToast();
  const [config, setConfig] = useState<CollegeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radiusMeters, setRadiusMeters] = useState('');
  const [showNearbyShops, setShowNearbyShops] = useState(true);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('college_config')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching college config:', error);
    }

    if (data) {
      setConfig(data);
      setName(data.name);
      setLatitude(data.latitude.toString());
      setLongitude(data.longitude.toString());
      setRadiusMeters(data.campus_radius_meters.toString());
      setIsActive(data.is_active);
      setShowNearbyShops(data.show_nearby_shops ?? true);
    }
    setIsLoading(false);
  }

  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocation not supported',
        description: 'Your browser does not support geolocation.',
        variant: 'destructive',
      });
      return;
    }

    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
        setIsDetecting(false);
        toast({
          title: 'Location detected',
          description: 'Coordinates have been updated.',
        });
      },
      (error) => {
        setIsDetecting(false);
        toast({
          title: 'Location error',
          description: error.message,
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSave = async () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radius = parseInt(radiusMeters, 10);

    if (!name.trim()) {
      toast({
        title: 'Validation error',
        description: 'Please enter a college name.',
        variant: 'destructive',
      });
      return;
    }

    if (isNaN(lat) || lat < -90 || lat > 90) {
      toast({
        title: 'Invalid latitude',
        description: 'Latitude must be between -90 and 90.',
        variant: 'destructive',
      });
      return;
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      toast({
        title: 'Invalid longitude',
        description: 'Longitude must be between -180 and 180.',
        variant: 'destructive',
      });
      return;
    }

    if (isNaN(radius) || radius < 50 || radius > 10000) {
      toast({
        title: 'Invalid radius',
        description: 'Radius must be between 50 and 10000 meters.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      if (config) {
        // Update existing config
        const { error } = await supabase
          .from('college_config')
          .update({
            name: name.trim(),
            latitude: lat,
            longitude: lng,
            campus_radius_meters: radius,
            is_active: isActive,
            show_nearby_shops: showNearbyShops,
          })
          .eq('id', config.id);

        if (error) throw error;
      } else {
        // Insert new config
        const { error } = await supabase
          .from('college_config')
          .insert({
            name: name.trim(),
            latitude: lat,
            longitude: lng,
            campus_radius_meters: radius,
            is_active: isActive,
            show_nearby_shops: showNearbyShops,
          });

        if (error) throw error;
      }

      toast({
        title: 'Configuration saved',
        description: 'College location settings have been updated.',
      });

      fetchConfig();
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast({
        title: 'Save failed',
        description: error.message || 'Unable to save configuration.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isConfigured = config && config.latitude !== 0 && config.longitude !== 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-mcd-red" />
            <CardTitle className="text-lg">College Location Settings</CardTitle>
          </div>
          {isConfigured ? (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
              Configured
            </span>
          ) : (
            <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full font-medium">
              Not Configured
            </span>
          )}
        </div>
        <CardDescription>
          Set the college center location and campus radius. College-type shops will only be visible to users within this radius.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* College Name */}
        <div className="space-y-2">
          <Label htmlFor="collegeName">College Name</Label>
          <Input
            id="collegeName"
            placeholder="e.g., ABC Engineering College"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Coordinates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              placeholder="e.g., 12.9716"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              placeholder="e.g., 77.5946"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>
        </div>

        {/* Detect Location Button */}
        <Button
          type="button"
          variant="outline"
          onClick={detectCurrentLocation}
          disabled={isDetecting}
          className="w-full gap-2"
        >
          {isDetecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          {isDetecting ? 'Detecting...' : 'Use Current Location'}
        </Button>

        {/* Campus Radius */}
        <div className="space-y-2">
          <Label htmlFor="radius">Campus Radius (meters)</Label>
          <Input
            id="radius"
            type="number"
            placeholder="e.g., 500"
            value={radiusMeters}
            onChange={(e) => setRadiusMeters(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Users within this radius will see college-type shops. Recommended: 300-1000 meters.
          </p>
        </div>

        {/* Map Preview */}
        <div className="space-y-2">
          <Label>Campus Boundary Preview</Label>
          <MapErrorBoundary>
            <Suspense fallback={
              <div className="w-full h-56 rounded-lg bg-muted flex items-center justify-center border">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            }>
              <CampusMapPreview
                latitude={parseFloat(latitude) || 0}
                longitude={parseFloat(longitude) || 0}
                radiusMeters={parseInt(radiusMeters, 10) || 500}
                onLocationSelect={(lat, lng) => {
                  setLatitude(lat.toFixed(6));
                  setLongitude(lng.toFixed(6));
                }}
              />
            </Suspense>
          </MapErrorBoundary>
          <p className="text-xs text-muted-foreground">
            The dashed circle shows the campus boundary. College shops outside this area will be hidden.
          </p>
        </div>

        {/* Show Nearby Shops Toggle */}
        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label>Show Nearby Shops</Label>
            <p className="text-xs text-muted-foreground">
              When disabled, students will only see college canteens (no nearby shops).
            </p>
          </div>
          <Switch checked={showNearbyShops} onCheckedChange={setShowNearbyShops} />
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>

        {/* Current Config Summary */}
        {isConfigured && (
          <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
            <p className="font-medium mb-1">Current Configuration:</p>
            <p className="text-muted-foreground">
              Center: {config.latitude.toFixed(6)}, {config.longitude.toFixed(6)}
            </p>
            <p className="text-muted-foreground">
              Radius: {config.campus_radius_meters} meters ({(config.campus_radius_meters / 1000).toFixed(2)} km)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
