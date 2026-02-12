import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import preorderLogo from '@/assets/preorder-logo.jpg';

interface SwipeableNotificationProps {
  orderId: string;
  pickupCode: string;
  canteenName: string;
  onDismiss: (orderId: string) => void;
}

export function SwipeableNotification({
  orderId,
  pickupCode,
  canteenName,
  onDismiss,
}: SwipeableNotificationProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  const SWIPE_THRESHOLD = 100;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    
    currentXRef.current = e.touches[0].clientX;
    const diff = currentXRef.current - startXRef.current;
    
    // Only allow swiping right (positive direction)
    if (diff > 0) {
      setTranslateX(diff);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    
    if (translateX > SWIPE_THRESHOLD) {
      // Animate out and dismiss
      setIsExiting(true);
      setTranslateX(window.innerWidth);
      setTimeout(() => {
        onDismiss(orderId);
      }, 200);
    } else {
      // Snap back
      setTranslateX(0);
    }
  }, [translateX, orderId, onDismiss]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startXRef.current = e.clientX;
    currentXRef.current = e.clientX;
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    currentXRef.current = e.clientX;
    const diff = currentXRef.current - startXRef.current;
    
    if (diff > 0) {
      setTranslateX(diff);
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    if (translateX > SWIPE_THRESHOLD) {
      setIsExiting(true);
      setTranslateX(window.innerWidth);
      setTimeout(() => {
        onDismiss(orderId);
      }, 200);
    } else {
      setTranslateX(0);
    }
  }, [isDragging, translateX, orderId, onDismiss]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setTranslateX(0);
    }
  }, [isDragging]);

  const opacity = Math.max(0, 1 - translateX / (SWIPE_THRESHOLD * 2));

  return (
    <div 
      className="relative overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background indicator */}
      <div 
        className="absolute inset-0 bg-green-700 flex items-center pl-4"
        style={{ opacity: translateX > 20 ? 1 : 0 }}
      >
        <span className="text-white text-sm font-medium">← Swipe to dismiss</span>
      </div>

      {/* Notification content */}
      <div
        className={`flex items-center justify-between py-3 border-b border-green-400/30 last:border-b-0 bg-gradient-to-r from-green-500 to-green-600 ${
          !isExiting ? 'animate-fade-in' : ''
        }`}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out',
          opacity,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-3 px-4 select-none">
          <div className="rounded-full overflow-hidden h-10 w-10 flex-shrink-0 animate-pulse ring-2 ring-white/30">
            <img src={preorderLogo} alt="PreOrder" className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="font-semibold text-sm md:text-base">
              🍽️ Your food is ready at {canteenName}!
            </p>
            <p className="text-green-100 text-xs md:text-sm">
              Pickup Code: <span className="font-bold text-white animate-pulse">{pickupCode}</span>
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDismiss(orderId)}
          className="text-white hover:bg-white/20 h-8 w-8 mr-4"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
