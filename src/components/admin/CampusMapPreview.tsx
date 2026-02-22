import { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface CampusMapPreviewProps {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  onLocationSelect?: (lat: number, lng: number) => void;
}

// Component to handle map click events
function MapClickHandler({ onLocationSelect }: { onLocationSelect?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Component to recenter map when coordinates change
function MapUpdater({ latitude, longitude, radiusMeters }: Omit<CampusMapPreviewProps, 'onLocationSelect'>) {
  const map = useMap();

  useEffect(() => {
    if (latitude && longitude) {
      // Calculate zoom level based on radius
      const radiusKm = radiusMeters / 1000;
      let zoom = 16;
      if (radiusKm > 2) zoom = 13;
      else if (radiusKm > 1) zoom = 14;
      else if (radiusKm > 0.5) zoom = 15;

      map.setView([latitude, longitude], zoom);
    }
  }, [latitude, longitude, radiusMeters, map]);

  return null;
}

// Custom college marker icon
const collegeIcon = L.divIcon({
  className: 'custom-college-marker',
  html: `
    <div style="
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #ea580c, #c2410c);
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export function CampusMapPreview({ latitude, longitude, radiusMeters, onLocationSelect }: CampusMapPreviewProps) {
  const hasValidCoords = latitude !== 0 || longitude !== 0;
  
  // Default center (India) when no coordinates set
  const defaultCenter: [number, number] = [20.5937, 78.9629];
  const defaultZoom = 4;

  const center: [number, number] = hasValidCoords ? [latitude, longitude] : defaultCenter;
  const zoom = hasValidCoords ? 15 : defaultZoom;

  return (
    <div className="space-y-2">
      <div className="w-full h-56 rounded-lg overflow-hidden border relative">
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Click handler for setting location */}
          <MapClickHandler onLocationSelect={onLocationSelect} />
          
          {hasValidCoords && (
            <>
              {/* Campus boundary circle */}
              <Circle
                center={[latitude, longitude]}
                radius={radiusMeters}
                pathOptions={{
                  color: '#ea580c',
                  fillColor: '#ea580c',
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: '5, 5',
                }}
              />
              
              {/* College center marker */}
              <Marker position={[latitude, longitude]} icon={collegeIcon} />
              
              {/* Map updater for dynamic changes */}
              <MapUpdater 
                latitude={latitude} 
                longitude={longitude} 
                radiusMeters={radiusMeters} 
              />
            </>
          )}
        </MapContainer>
        
        {/* Click instruction overlay */}
        <div className="absolute bottom-2 left-2 right-2 z-[1000] pointer-events-none">
          <div className="bg-background/90 backdrop-blur-sm text-xs text-center py-1.5 px-3 rounded-md shadow-sm">
            👆 Click on the map to set college center
          </div>
        </div>
      </div>
    </div>
  );
}
