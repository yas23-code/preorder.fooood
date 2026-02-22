import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useCollegeLocation } from '@/hooks/useCollegeLocation';
import { calculateDistance } from '@/lib/distance';
import { ShopCard } from '@/components/shops/ShopCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { MapPin, RefreshCw, Store } from 'lucide-react';

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
}

interface ShopWithDistance extends Shop {
  distance: number;
}

const DEFAULT_RADIUS_KM = 3;

export function NearbyShopsSection() {
  const { showNearbyShops, isInsideCampus, isLoading: collegeLocationLoading } = useCollegeLocation();
  const { latitude, longitude, error: locationError, loading: locationLoading, permissionDenied, retry } = useGeolocation();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);

  // Fetch all shops from database
  useEffect(() => {
    async function fetchShops() {
      setLoadingShops(true);
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching shops:', error);
      } else {
        setShops((data || []) as Shop[]);
      }
      setLoadingShops(false);
    }

    fetchShops();
  }, []);

  // Calculate distances, filter by radius, and apply college visibility logic
  const nearbyShops = useMemo(() => {
    if (!latitude || !longitude || shops.length === 0) {
      return [];
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

    // Filter by radius and sort by distance
    return shopsWithDistance
      .filter(shop => shop.distance <= DEFAULT_RADIUS_KM)
      .sort((a, b) => a.distance - b.distance);
  }, [latitude, longitude, shops, isInsideCampus]);

  // If nearby shops are disabled, don't render anything
  if (!collegeLocationLoading && !showNearbyShops) {
    return null;
  }

  // Loading state
  if (locationLoading || loadingShops || collegeLocationLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <LoadingSpinner />
        <p className="text-muted-foreground text-sm">
          {locationLoading ? 'Getting location...' : 'Finding shops...'}
        </p>
      </div>
    );
  }

  // Location permission denied
  if (permissionDenied || locationError) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 px-4">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <MapPin className="w-6 h-6 text-destructive" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="font-semibold text-sm">Location Required</h3>
          <p className="text-muted-foreground text-xs max-w-xs">
            Enable location to find nearby shops
          </p>
        </div>
        <Button onClick={retry} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-3 h-3" />
          Retry
        </Button>
      </div>
    );
  }

  // No shops found
  if (nearbyShops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 px-4">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Store className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="font-semibold text-sm">No Shops Nearby</h3>
          <p className="text-muted-foreground text-xs max-w-xs">
            No shops within {DEFAULT_RADIUS_KM} km
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {nearbyShops.length} shop{nearbyShops.length !== 1 ? 's' : ''} nearby
      </p>
      <div className="space-y-3">
        {nearbyShops.map(shop => (
          <ShopCard key={shop.id} shop={shop} />
        ))}
      </div>
    </div>
  );
}
