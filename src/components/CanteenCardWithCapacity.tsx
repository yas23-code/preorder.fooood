import { Link } from 'react-router-dom';
import { MapPin, Clock, ChevronRight } from 'lucide-react';
import { useCanteenOrderStatus } from '@/hooks/useCanteenOrderStatus';
import { OrderCapacityBadge } from '@/components/OrderCapacityBadge';

interface Canteen {
  id: string;
  vendor_id: string;
  name: string;
  location: string;
  image_url: string | null;
  is_open: boolean;
  created_at: string;
  updated_at: string;
}

interface CanteenCardWithCapacityProps {
  canteen: Canteen;
  index: number;
}

export function CanteenCardWithCapacity({ canteen, index }: CanteenCardWithCapacityProps) {
  const { activeOrderCount, orderLimit, isLoading, isAtLimit } = useCanteenOrderStatus(canteen.id);

  return (
    <Link
      to={`/student/canteen/${canteen.id}`}
      className="block bg-white border border-mcd-border rounded-xl md:rounded-2xl overflow-hidden hover:shadow-card-hover transition-all duration-300 shadow-card animate-fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-stretch">
        {/* Image */}
        <div className="relative w-36 h-32 sm:w-44 sm:h-36 md:w-52 md:h-40 flex-shrink-0">
          {canteen.image_url ? (
            <img 
              src={canteen.image_url} 
              alt={canteen.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-mcd-yellow to-yellow-400 flex items-center justify-center">
              <span className="text-3xl md:text-4xl">🍽️</span>
            </div>
          )}
          {/* Full badge overlay when at limit */}
          {isAtLimit && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                Queue Full
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 md:p-4 flex flex-col justify-center min-w-0">
          <h3 className="text-base md:text-lg font-bold text-foreground mb-1 md:mb-1 truncate">
            {canteen.name}
          </h3>
          <div className="flex items-center gap-1.5 md:gap-1.5 text-muted-foreground text-sm md:text-sm mb-2 md:mb-2">
            <MapPin className="h-4 w-4 md:h-4 md:w-4 flex-shrink-0" />
            <span className="truncate">{canteen.location}</span>
          </div>
          <div className="flex items-center gap-3 md:gap-4 text-sm md:text-sm flex-wrap">
            <div className="flex items-center gap-1.5 md:gap-1.5">
              <span className={`w-2 h-2 md:w-2 md:h-2 rounded-full ${canteen.is_open ? 'bg-green-500' : 'bg-mcd-red'}`}></span>
              <span className={`font-medium ${canteen.is_open ? 'text-green-600' : 'text-mcd-red'}`}>
                {canteen.is_open ? 'Open' : 'Closed'}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4 md:h-4 md:w-4" />
              <span>10-15 min</span>
            </div>
          </div>
          {/* Capacity Badge - inline with status */}
          {!isLoading && orderLimit !== null && (
            <OrderCapacityBadge 
              activeOrderCount={activeOrderCount} 
              orderLimit={orderLimit} 
              isLoading={isLoading}
            />
          )}
        </div>

        {/* Arrow */}
        <div className="flex items-center pr-2 md:pr-4">
          <ChevronRight className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}
