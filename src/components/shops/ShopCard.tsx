import { useState, useCallback, useEffect } from 'react';
import { MapPin, Store, Navigation, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistance } from '@/lib/distance';
import { useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';

interface ShopImage {
  id: string;
  image_url: string;
  display_order: number;
}

interface Shop {
  id: string;
  shop_name: string;
  address: string;
  is_open: boolean;
  image_url: string | null;
  distance: number;
  latitude: number;
  longitude: number;
  images?: ShopImage[];
}

interface ShopCardProps {
  shop: Shop;
}

// Calculate estimated walking time based on distance
function getEstimatedWalkTime(distanceKm: number): string {
  const walkingMinutes = Math.ceil(distanceKm * 12);
  if (walkingMinutes < 1) return '<1 min';
  if (walkingMinutes >= 60) {
    const hours = Math.floor(walkingMinutes / 60);
    const mins = walkingMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${walkingMinutes} mins`;
}

export function ShopCard({ shop }: ShopCardProps) {
  const navigate = useNavigate();
  const isOpen = shop.is_open;
  
  // Build images array from shop_images table, fallback to main image_url
  const images = shop.images && shop.images.length > 0 
    ? shop.images.map(img => img.image_url)
    : shop.image_url 
      ? [shop.image_url] 
      : [];
  const hasMultipleImages = images.length > 1;
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    dragFree: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Auto-play functionality with hover pause
  useEffect(() => {
    if (!emblaApi || images.length <= 1 || isHovered) return;
    
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [emblaApi, images.length, isHovered]);

  const handleCardClick = () => {
    if (isOpen) {
      navigate(`/shop/${shop.id}`);
    }
  };

  const handleLocationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <Card 
      className={`overflow-hidden transition-all duration-200 ${
        !isOpen ? 'opacity-60 grayscale' : 'hover:shadow-lg'
      }`}
    >
      {/* Image Carousel Section */}
      <div 
        className="relative aspect-[2/1] bg-muted cursor-pointer"
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {images.length > 0 ? (
          <div className="overflow-hidden h-full" ref={emblaRef}>
            <div className="flex h-full">
              {images.map((imageUrl, index) => (
                <div 
                  key={index} 
                  className="flex-[0_0_100%] min-w-0 h-full"
                >
                  <img
                    src={imageUrl}
                    alt={`${shop.shop_name} - Image ${index + 1}`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Store className="w-16 h-16 text-muted-foreground/50" />
          </div>
        )}
        
        {/* Open/Closed Badge - Top Left */}
        <div className="absolute top-2 left-2 pointer-events-none">
          <Badge 
            className={`px-2 py-1 text-xs font-semibold shadow-md ${
              isOpen 
                ? 'bg-white text-green-600' 
                : 'bg-white text-red-500'
            }`}
          >
            <span className={`w-2 h-2 rounded-full mr-2 ${isOpen ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {isOpen ? 'Open' : 'Closed'}
          </Badge>
        </div>

        {/* Carousel Dots Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none">
          {images.length > 0 ? (
            images.map((_, index) => (
              <div 
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  index === selectedIndex ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))
          ) : (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-white/80"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
            </>
          )}
        </div>
      </div>

      {/* Info Section */}
      <CardContent className="p-3 cursor-pointer" onClick={handleCardClick}>
        <div className="flex items-start gap-2.5">
          {/* Shop Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Store className="w-5 h-5 text-primary" />
          </div>

          {/* Shop Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-foreground truncate text-sm">
                {shop.shop_name}
              </h3>
              {/* Distance Badge - Clickable for directions */}
              <button 
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full shadow-md hover:bg-primary/90 hover:shadow-lg transition-all duration-200 active:scale-95"
                onClick={handleLocationClick}
              >
                <Navigation className="w-4 h-4" />
                <span>{formatDistance(shop.distance)}</span>
              </button>
            </div>

            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{shop.address}</span>
            </div>

            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span>{getEstimatedWalkTime(shop.distance)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
