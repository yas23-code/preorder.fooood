import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  permissionDenied: boolean;
}

interface UseGeolocationReturn extends GeolocationState {
  requestLocation: () => void;
  retry: () => void;
}

export function useGeolocation(autoStart: boolean = true): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: autoStart,
    permissionDenied: false,
  });

  // Define requestPosition FIRST so getLocation can reference it
  const requestPosition = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('[Geolocation] Position obtained:', position.coords.latitude, position.coords.longitude);
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
          permissionDenied: false,
        });
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location';
        let permissionDenied = false;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
            permissionDenied = true;
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }

        console.log('[Geolocation] Error:', errorMessage);
        setState({
          latitude: null,
          longitude: null,
          error: errorMessage,
          loading: false,
          permissionDenied,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  }, []);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        loading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null, permissionDenied: false }));

    // Always call getCurrentPosition() directly.
    // On Android, this is what triggers the system-level "Turn on location" dialog.
    // The Permissions API pre-check was incorrectly treating "location services OFF"
    // as "permanently denied" and skipping the prompt entirely.
    console.log('[Geolocation] Requesting position via getCurrentPosition...');
    requestPosition();
  }, [requestPosition]);

  useEffect(() => {
    if (autoStart) {
      getLocation();
    }
  }, [getLocation, autoStart]);

  return {
    ...state,
    requestLocation: getLocation,
    retry: getLocation,
  };
}
