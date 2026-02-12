import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useCollegeLocation } from '@/hooks/useCollegeLocation';
import { calculateDistance } from '@/lib/distance';
import { ShopCard } from './ShopCard';
import { ShopsMapView } from './ShopsMapView';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { MapPin, RefreshCw, AlertCircle, Store, List, Map } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ShopImage {
  id: string;
  image_url: string;
  display_order: number;
}

interface Shop {
  id: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  is_open: boolean;
  image_url: string | null;
  created_at: string;
  shop_type: 'college' | 'public';
  images: ShopImage[];
}

interface ShopWithDistance extends Shop {
  distance: number;
}

const DEFAULT_RADIUS_KM = 3;
const EXPANDED_RADIUS_KM = 5;

type ViewMode = 'list' | 'map';

export function NearbyShopsList() {
  const { latitude, longitude, error: locationError, loading: locationLoading, permissionDenied, retry } = useGeolocation();
  const { isInsideCampus, isLoading: collegeLocationLoading, showNearbyShops } = useCollegeLocation();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [expandedSearch, setExpandedSearch] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Fetch all approved shops from database with their images
  useEffect(() => {
    async function fetchShops() {
      setLoadingShops(true);
      
      // Fetch shops with their images
      const { data: shopsData, error: shopsError } = await supabase
        .from('shops')
        .select('*')
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false });

      if (shopsError) {
        console.error('Error fetching shops:', shopsError);
        setLoadingShops(false);
        return;
      }

      // Fetch all shop images
      const { data: imagesData, error: imagesError } = await supabase
        .from('shop_images')
        .select('*')
        .order('display_order', { ascending: true });

      if (imagesError) {
        console.error('Error fetching shop images:', imagesError);
      }

      // Map images to their shops
      const shopsWithImages = (shopsData || []).map(shop => ({
        ...shop,
        images: (imagesData || [])
          .filter(img => img.shop_id === shop.id)
          .map(img => ({
            id: img.id,
            image_url: img.image_url,
            display_order: img.display_order
          }))
      })) as Shop[];

      setShops(shopsWithImages);
      setLoadingShops(false);
    }

    fetchShops();
  }, []);

  // Calculate distances, filter by radius, and apply college visibility logic
  const { nearbyShops, needsExpansion } = useMemo(() => {
    if (!latitude || !longitude || shops.length === 0) {
      return { nearbyShops: [], needsExpansion: false };
    }

    // Filter shops based on college location visibility
    const visibleShops = shops.filter(shop => {
      // Public shops are always visible
      if (shop.shop_type === 'public') {
        return true;
      }
      // College shops are only visible if user is inside campus
      // If isInsideCampus is null (loading or not configured), show all
      if (isInsideCampus === null || isInsideCampus === true) {
        return true;
      }
      // User is outside campus, hide college shops
      return false;
    });

    // Calculate distance for each visible shop
    const shopsWithDistance: ShopWithDistance[] = visibleShops.map(shop => ({
      ...shop,
      distance: calculateDistance(latitude, longitude, shop.latitude, shop.longitude),
    }));

    // Filter by default radius first
    const defaultRadiusShops = shopsWithDistance.filter(
      shop => shop.distance <= DEFAULT_RADIUS_KM
    );

    // If no shops in default radius, try expanded
    if (defaultRadiusShops.length === 0) {
      const expandedRadiusShops = shopsWithDistance.filter(
        shop => shop.distance <= EXPANDED_RADIUS_KM
      );

      if (expandedRadiusShops.length > 0) {
        return {
          nearbyShops: expandedRadiusShops.sort((a, b) => a.distance - b.distance),
          needsExpansion: true,
        };
      }
    }

    // Sort by distance (nearest first)
    return {
      nearbyShops: defaultRadiusShops.sort((a, b) => a.distance - b.distance),
      needsExpansion: false,
    };
  }, [latitude, longitude, shops, isInsideCampus]);

  // Update expanded search state
  useEffect(() => {
    if (needsExpansion && !expandedSearch) {
      setExpandedSearch(true);
    }
  }, [needsExpansion, expandedSearch]);

  // If nearby shops are disabled by admin, return null (parent handles showing canteens)
  if (!collegeLocationLoading && !showNearbyShops) {
    return null;
  }

  // Loading state
  if (locationLoading || loadingShops || collegeLocationLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <LoadingSpinner />
        <p className="text-muted-foreground">
          {locationLoading ? 'Getting your location...' : 'Finding nearby shops...'}
        </p>
      </div>
    );
  }

  // Location permission denied
  if (permissionDenied || locationError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 px-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-destructive" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-lg">Location Access Required</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            {locationError || 'Please enable location access to find nearby shops.'}
          </p>
        </div>
        <Button onClick={retry} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    );
  }

  // No shops found
  if (nearbyShops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 px-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Store className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-lg">No Shops Nearby</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            We couldn't find any shops within {EXPANDED_RADIUS_KM} km of your location. 
            Check back later or try a different location.
          </p>
        </div>
      </div>
    );
  }

  const userLocation = latitude && longitude ? { lat: latitude, lng: longitude } : null;

  return (
    <div className="space-y-4">
      {/* Expanded search notice */}
      {expandedSearch && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No nearby shops found. Expanding search area to {EXPANDED_RADIUS_KM} km.
          </AlertDescription>
        </Alert>
      )}

      {/* Header with results count and view toggle */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Found {nearbyShops.length} shop{nearbyShops.length !== 1 ? 's' : ''} near you
        </p>
        
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="gap-2 h-8"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">List</span>
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('map')}
            className="gap-2 h-8"
          >
            <Map className="w-4 h-4" />
            <span className="hidden sm:inline">Map</span>
          </Button>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'list' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {nearbyShops.map(shop => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      ) : (
        <ShopsMapView shops={nearbyShops} userLocation={userLocation} />
      )}
    </div>
  );
}
