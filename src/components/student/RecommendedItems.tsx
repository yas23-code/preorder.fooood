import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecommendedItems } from '@/hooks/useRecommendedItems';
import { Sparkles, ShoppingBag, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface RecommendedItemsProps {
  userId: string | undefined;
}

export function RecommendedItems({ userId }: RecommendedItemsProps) {
  const { items, isLoading } = useRecommendedItems(userId);
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center">
          <Skeleton className="h-12 w-64 rounded-full" />
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Animated toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          group relative mx-auto flex items-center gap-2.5 px-6 py-3 rounded-full
          font-semibold text-sm transition-all duration-300
          shadow-lg hover:shadow-xl active:scale-95
          ${isExpanded
            ? 'bg-white text-foreground border-2 border-mcd-yellow'
            : 'bg-gradient-to-r from-mcd-red to-mcd-yellow text-white border-2 border-transparent'
          }
        `}
      >
        <Sparkles className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'text-mcd-red rotate-12' : 'animate-pulse'}`} />
        <span>🔥 Recommended for You</span>
        <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
      </button>

      {/* Expandable items grid */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Item Image */}
              <div className="relative h-32 bg-muted">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100">
                    <ShoppingBag className="w-10 h-10 text-amber-400" />
                  </div>
                )}
                {/* Canteen badge */}
                <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                  {item.canteen_name}
                </span>
              </div>

              {/* Item Details */}
              <div className="p-3 space-y-2">
                <h3 className="font-semibold text-sm text-foreground truncate">{item.name}</h3>
                <p className="text-mcd-red font-bold text-sm">
                  ₹{item.price % 1 === 0 ? item.price.toFixed(0) : item.price.toFixed(2)}
                </p>
                <Button
                  size="sm"
                  className="w-full bg-mcd-red hover:bg-red-700 text-white text-xs h-9 rounded-lg"
                  onClick={() => navigate(`/student/canteen/${item.canteen_id}`)}
                >
                  Order Now
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
