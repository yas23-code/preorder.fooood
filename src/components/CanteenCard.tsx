import { MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Canteen } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface CanteenCardProps {
  canteen: Canteen;
}

export function CanteenCard({ canteen }: CanteenCardProps) {
  const isOpen = canteen.is_open !== false;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  return (
    <Link 
      to={`/student/canteen/${canteen.id}`}
      className="block card-warm overflow-hidden hover:scale-[1.02] transition-all duration-300 group"
    >
      <div className="aspect-[4/3] overflow-hidden bg-muted relative">
        {canteen.image_url && !imageError ? (
          <>
            {!imageLoaded && (
              <Skeleton className="absolute inset-0 w-full h-full" />
            )}
            <img 
              src={canteen.image_url} 
              alt={canteen.name}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={`w-full h-full object-cover group-hover:scale-110 transition-all duration-500 ${!isOpen ? 'grayscale opacity-70' : ''} ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </>
        ) : (
          <div className={`w-full h-full bg-gradient-hero flex items-center justify-center ${!isOpen ? 'grayscale opacity-70' : ''}`}>
            <span className="text-4xl">🍽️</span>
          </div>
        )}
        <Badge 
          className={`absolute top-2 right-2 ${isOpen ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
        >
          {isOpen ? 'Open' : 'Closed'}
        </Badge>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-accent transition-colors">
          {canteen.name}
        </h3>
        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{canteen.location}</span>
        </div>
      </div>
    </Link>
  );
}
