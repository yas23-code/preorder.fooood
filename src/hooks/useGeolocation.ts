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

export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
    permissionDenied: false,
  });

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

    // Check permission state first using Permissions API
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        console.log('[Geolocation] Permission state:', result.state);
        if (result.state === 'denied') {
          setState({
            latitude: null,
            longitude: null,
            error: 'Location permission denied. Please enable location access in your browser settings.',
            loading: false,
            permissionDenied: true,
          });
          return;
        }
        // If prompt or granted, proceed with getCurrentPosition
        requestPosition();
      }).catch(() => {
        // Permissions API not available, fall through to getCurrentPosition
        requestPosition();
      });
    } else {
      requestPosition();
    }
  }, []);

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

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  return {
    ...state,
    requestLocation: getLocation,
    retry: getLocation,
  };
}
