import { Users } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

interface OrderCapacityBadgeProps {
  activeOrderCount: number;
  orderLimit: number | null;
  isLoading?: boolean;
}

export function OrderCapacityBadge({ activeOrderCount, orderLimit, isLoading }: OrderCapacityBadgeProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevCountRef = useRef(activeOrderCount);

  useEffect(() => {
    // Only animate if the count actually changed (not on initial render)
    if (prevCountRef.current !== activeOrderCount && prevCountRef.current !== undefined) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 600);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = activeOrderCount;
  }, [activeOrderCount]);

  // Don't show if no limit set or still loading
  if (isLoading || orderLimit === null) return null;

  const remainingSlots = orderLimit - activeOrderCount;
  const isAtLimit = remainingSlots <= 0;
  const isLowCapacity = remainingSlots <= 3 && remainingSlots > 0;

  return (
    <div 
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all duration-300 ${
        isAtLimit 
          ? 'bg-red-100 text-red-700'
          : isLowCapacity
          ? 'bg-amber-100 text-amber-700'
          : 'bg-green-100 text-green-700'
      } ${isAnimating ? 'animate-pulse scale-110' : ''}`}
    >
      <Users className={`h-3 w-3 transition-transform duration-300 ${isAnimating ? 'rotate-12' : ''}`} />
      <span>
        {isAtLimit 
          ? `Full`
          : `${remainingSlots} left`
        }
      </span>
    </div>
  );
}
