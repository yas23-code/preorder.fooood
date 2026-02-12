import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistance } from '@/lib/distance';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Shop {
  id: string;
  shop_name: string;
  address: string;
  latitude: number;
  longitude: number;
  is_open: boolean;
  image_url: string | null;
  distance: number;
}

interface ShopsMapViewProps {
  shops: Shop[];
  userLocation: { lat: number; lng: number } | null;
}

// Component to recenter map when user location changes
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView([lat, lng], 14);
  }, [map, lat, lng]);
  
  return null;
}

// Custom user location marker
const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#3b82f6" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// Custom shop marker
const createShopIcon = (isOpen: boolean) => new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="40">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
            fill="${isOpen ? '#22c55e' : '#6b7280'}" 
            stroke="white" 
            stroke-width="1.5"/>
      <circle cx="12" cy="9" r="3" fill="white"/>
    </svg>
  `),
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
});

export function ShopsMapView({ shops, userLocation }: ShopsMapViewProps) {
  const navigate = useNavigate();
  
  const defaultCenter: [number, number] = userLocation 
    ? [userLocation.lat, userLocation.lng] 
    : [28.6139, 77.2090]; // Default to Delhi if no location

  return (
    <div className="w-full h-[60vh] min-h-[400px] rounded-lg overflow-hidden border">
      <MapContainer
        center={defaultCenter}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {userLocation && (
          <>
            <RecenterMap lat={userLocation.lat} lng={userLocation.lng} />
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
              <Popup>
                <div className="text-center p-1">
                  <strong>Your Location</strong>
                </div>
              </Popup>
            </Marker>
          </>
        )}
        
        {shops.map((shop) => (
          <Marker 
            key={shop.id} 
            position={[shop.latitude, shop.longitude]}
            icon={createShopIcon(shop.is_open)}
          >
            <Popup>
              <div className="p-2 min-w-[180px]">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-sm">{shop.shop_name}</h3>
                  <Badge 
                    variant={shop.is_open ? 'default' : 'secondary'}
                    className={`text-xs ${shop.is_open ? 'bg-green-500' : ''}`}
                  >
                    {shop.is_open ? 'Open' : 'Closed'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{shop.address}</p>
                <p className="text-xs text-muted-foreground mb-3">
                  📍 {formatDistance(shop.distance)} away
                </p>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={!shop.is_open}
                  onClick={() => navigate(`/shop/${shop.id}`)}
                >
                  {shop.is_open ? 'View Menu' : 'Closed'}
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
