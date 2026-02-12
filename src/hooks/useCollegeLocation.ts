import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGeolocation } from './useGeolocation';
import { calculateDistance } from '@/lib/distance';

// ============================================
// DEVELOPER TEST MODE CONFIGURATION
// Set TEST_MODE to true to enable location simulation
// Change FORCE_LOCATION to simulate different scenarios
// ============================================
export const TEST_MODE = false; // Set to true for testing, false for production
export type ForceLocation = 'college' | 'outside';
export let FORCE_LOCATION: ForceLocation = 'college'; // 'college' or 'outside'

// Function to update FORCE_LOCATION at runtime (used by dev toggle)
export const setForceLocation = (location: ForceLocation) => {
  FORCE_LOCATION = location;
};

interface CollegeConfig {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  campus_radius_meters: number;
  is_active: boolean;
  show_nearby_shops: boolean;
}

interface UseCollegeLocationReturn {
  isInsideCampus: boolean | null;
  isLoading: boolean;
  collegeConfig: CollegeConfig | null;
  userLatitude: number | null;
  userLongitude: number | null;
  distanceToCollege: number | null;
  locationError: string | null;
  isTestMode: boolean;
  forceLocation: ForceLocation;
  showNearbyShops: boolean;
}

export function useCollegeLocation(): UseCollegeLocationReturn {
  const { latitude, longitude, error: locationError, loading: locationLoading, permissionDenied } = useGeolocation();
  const [collegeConfig, setCollegeConfig] = useState<CollegeConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [testForceLocation, setTestForceLocation] = useState<ForceLocation>(FORCE_LOCATION);

  // Listen for changes to FORCE_LOCATION (for dev toggle reactivity)
  useEffect(() => {
    if (TEST_MODE) {
      const interval = setInterval(() => {
        if (FORCE_LOCATION !== testForceLocation) {
          setTestForceLocation(FORCE_LOCATION);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [testForceLocation]);

  // Fetch college config from database
  useEffect(() => {
    async function fetchCollegeConfig() {
      setConfigLoading(true);
      const { data, error } = await supabase
        .from('college_config')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching college config:', error);
      } else if (data) {
        setCollegeConfig(data);
      }
      // If no config exists, collegeConfig remains null - user is treated as outside campus
      setConfigLoading(false);
    }

    fetchCollegeConfig();
  }, []);

  // Calculate distance and determine if user is inside campus
  const { isInsideCampus, distanceToCollege } = useMemo(() => {
    // ============================================
    // TEST MODE: Override location detection
    // ============================================
    if (TEST_MODE) {
      console.log(`[DEV MODE] Simulating location: ${testForceLocation}`);
      return {
        isInsideCampus: testForceLocation === 'college',
        distanceToCollege: testForceLocation === 'college' ? 0 : 10, // Mock distance
      };
    }

    // ============================================
    // PRODUCTION MODE: Real location detection
    // ============================================

    // IMPORTANT: Do NOT determine isInsideCampus until geolocation is resolved
    // While location is still loading, return null (loading state)
    if (locationLoading) {
      console.log('[Location] Still loading geolocation...');
      return { isInsideCampus: null, distanceToCollege: null };
    }

    // If location permission denied or location error occurred, treat as OUTSIDE campus
    // This ensures users can still access nearby shops even without location
    if (permissionDenied || locationError) {
      console.log('[Location] Permission denied or error - treating as outside campus:', {
        permissionDenied,
        locationError,
      });
      return { isInsideCampus: false, distanceToCollege: null };
    }

    // If no college config exists or config is still loading, wait
    if (configLoading) {
      console.log('[Location] Still loading college config...');
      return { isInsideCampus: null, distanceToCollege: null };
    }

    // If no college config, treat as outside campus
    if (!collegeConfig) {
      console.log('[Location] No college config found - treating as outside campus');
      return { isInsideCampus: false, distanceToCollege: null };
    }

    // Skip check if college config has default/invalid coordinates
    if (collegeConfig.latitude === 0 && collegeConfig.longitude === 0) {
      console.log('[Location] Invalid college coordinates (0,0) - treating as outside campus');
      return { isInsideCampus: false, distanceToCollege: null };
    }

    // If location restriction is disabled, show all (treat as inside)
    if (!collegeConfig.is_active) {
      console.log('[Location] College config is inactive - treating as inside campus');
      return { isInsideCampus: true, distanceToCollege: null };
    }

    // If we still don't have coordinates after loading completed, treat as outside
    if (!latitude || !longitude) {
      console.log('[Location] No user coordinates available - treating as outside campus');
      return { isInsideCampus: false, distanceToCollege: null };
    }

    // Calculate distance in kilometers using Haversine formula
    const distanceKm = calculateDistance(
      latitude,
      longitude,
      collegeConfig.latitude,
      collegeConfig.longitude
    );

    // Convert radius from meters to kilometers for comparison
    const radiusKm = collegeConfig.campus_radius_meters / 1000;
    const isInside = distanceKm <= radiusKm;

    // DEBUG LOGGING - temporary for troubleshooting
    console.log('[Location Debug]', {
      userLatitude: latitude,
      userLongitude: longitude,
      collegeLatitude: collegeConfig.latitude,
      collegeLongitude: collegeConfig.longitude,
      distanceKm: distanceKm.toFixed(4),
      radiusKm: radiusKm.toFixed(4),
      campus_radius_meters: collegeConfig.campus_radius_meters,
      isInsideCampus: isInside,
    });

    return {
      isInsideCampus: isInside,
      distanceToCollege: distanceKm,
    };
  }, [latitude, longitude, collegeConfig, testForceLocation, locationLoading, permissionDenied, locationError, configLoading]);

  // Determine overall loading state
  // Loading = true until BOTH geolocation and config have resolved
  const isLoading = TEST_MODE ? false : (locationLoading || configLoading);

  // Determine if nearby shops should be shown
  // Default to true if no config exists or show_nearby_shops is not set
  const showNearbyShops = collegeConfig?.show_nearby_shops ?? true;

  return {
    isInsideCampus,
    isLoading,
    collegeConfig,
    userLatitude: latitude,
    userLongitude: longitude,
    distanceToCollege,
    locationError,
    isTestMode: TEST_MODE,
    forceLocation: testForceLocation,
    showNearbyShops,
  };
}
