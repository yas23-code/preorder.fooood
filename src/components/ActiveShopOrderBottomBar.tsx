import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, PartyPopper, CheckCircle, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActiveShopOrderBottomBarProps {
  shopName: string;
  estimatedReadyTime: string;
  orderId?: string;
  orderStatus?: string | null;
  onOrderCompleted?: () => void;
}

// Confetti particle component
function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  const style = {
    left: `${Math.random() * 100}%`,
    animationDelay: `${delay}ms`,
    backgroundColor: color,
  };
  
  return (
    <div 
      className="absolute w-2 h-2 rounded-sm animate-confetti opacity-0"
      style={style}
    />
  );
}

const SHOP_CELEBRATION_STORAGE_KEY = 'shopCelebrationTriggered';

export function ActiveShopOrderBottomBar({ 
  shopName,
  estimatedReadyTime,
  orderId,
  orderStatus,
  onOrderCompleted 
}: ActiveShopOrderBottomBarProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const navigate = useNavigate();

  // Determine order states first - before any other logic
  const isReady = orderStatus === 'ready';
  const isCompleted = orderStatus === 'completed';

  // Check if celebration was already triggered for this order
  const hasCelebratedForOrder = useCallback((id?: string) => {
    if (!id) return false;
    const stored = localStorage.getItem(SHOP_CELEBRATION_STORAGE_KEY);
    return stored === id;
  }, []);

  // Mark celebration as triggered for this order
  const markCelebrationTriggered = useCallback((id?: string) => {
    if (id) {
      localStorage.setItem(SHOP_CELEBRATION_STORAGE_KEY, id);
    }
  }, []);

  // Clear celebration flag when order is completed
  const clearCelebrationFlag = useCallback(() => {
    localStorage.removeItem(SHOP_CELEBRATION_STORAGE_KEY);
  }, []);

  // Play celebration sound
  const playCelebrationSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const audioContext = audioContextRef.current;

      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const currentTime = audioContext.currentTime;

      // Celebration fanfare - ascending notes with harmony
      const fanfareNotes = [
        { freq: 523.25, start: 0, duration: 0.15 },    // C5
        { freq: 659.25, start: 0.12, duration: 0.15 }, // E5
        { freq: 783.99, start: 0.24, duration: 0.15 }, // G5
        { freq: 1046.5, start: 0.36, duration: 0.4 },  // C6 (hold)
      ];

      fanfareNotes.forEach(({ freq, start, duration }) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, currentTime + start);

        gainNode.gain.setValueAtTime(0, currentTime + start);
        gainNode.gain.linearRampToValueAtTime(0.3, currentTime + start + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + start + duration);

        oscillator.start(currentTime + start);
        oscillator.stop(currentTime + start + duration);
      });

      // Add sparkle sounds
      for (let i = 0; i < 3; i++) {
        const sparkleOsc = audioContext.createOscillator();
        const sparkleGain = audioContext.createGain();

        sparkleOsc.connect(sparkleGain);
        sparkleGain.connect(audioContext.destination);

        sparkleOsc.type = 'sine';
        const sparkleFreq = 2000 + Math.random() * 1000;
        sparkleOsc.frequency.setValueAtTime(sparkleFreq, currentTime + 0.5 + i * 0.1);

        sparkleGain.gain.setValueAtTime(0, currentTime + 0.5 + i * 0.1);
        sparkleGain.gain.linearRampToValueAtTime(0.15, currentTime + 0.52 + i * 0.1);
        sparkleGain.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.7 + i * 0.1);

        sparkleOsc.start(currentTime + 0.5 + i * 0.1);
        sparkleOsc.stop(currentTime + 0.8 + i * 0.1);
      }
    } catch (error) {
      console.error('Error playing celebration sound:', error);
    }
  }, []);

  // Handle order completed - auto-dismiss after showing completion message
  useEffect(() => {
    if (isCompleted) {
      clearCelebrationFlag();
      const timeout = setTimeout(() => {
        onOrderCompleted?.();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isCompleted, onOrderCompleted, clearCelebrationFlag]);

  // Trigger celebration only when vendor marks order as ready
  useEffect(() => {
    if (isReady && !hasCelebratedForOrder(orderId)) {
      markCelebrationTriggered(orderId);
      setShowCelebration(true);
      playCelebrationSound();
      
      // Hide confetti after animation
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [isReady, orderId, hasCelebratedForOrder, markCelebrationTriggered, playCelebrationSound]);

  useEffect(() => {
    // Don't calculate time for ready/completed orders
    if (isReady || isCompleted) {
      setTimeRemaining(0);
      return;
    }

    const calculateTimeRemaining = () => {
      const targetTime = new Date(estimatedReadyTime).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((targetTime - now) / 1000));
      setTimeRemaining(diff);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [estimatedReadyTime, isReady, isCompleted]);

  const getMinutesRemaining = (seconds: number): number => {
    return Math.ceil(seconds / 60);
  };

  const minutesLeft = getMinutesRemaining(timeRemaining);
  // Only show delayed state when order is NOT ready/completed
  const isDelayed = timeRemaining <= 0 && !isReady && !isCompleted;

  // Confetti colors
  const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

  // Get status text
  const getStatusText = () => {
    if (isCompleted) return 'Picked up';
    if (isReady) return 'Ready!';
    if (isDelayed) return 'Delayed';
    return 'Preparing';
  };

  // Completed state
  if (isCompleted) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="h-5 w-5 text-white" />
            <span className="text-white text-sm font-bold">Shop Order Completed!</span>
            <span className="text-lg">✅</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Confetti overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <ConfettiParticle 
              key={i} 
              delay={i * 50} 
              color={confettiColors[i % confettiColors.length]} 
            />
          ))}
        </div>
      )}

      <div className={`fixed bottom-0 left-0 right-0 z-50 shadow-lg transition-all duration-300 ${
        isReady 
          ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
          : isDelayed
          ? 'bg-gradient-to-r from-amber-500 to-orange-500'
          : 'bg-white border-t border-mcd-border'
      }`}>
        <div className="container mx-auto px-3.5 py-2">
          <div className="flex items-center justify-between gap-2.5">
            {/* Left side - Shop info and status */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={`rounded-full p-1.5 flex-shrink-0 ${
                isReady ? 'bg-white/20' : isDelayed ? 'bg-white/20' : 'bg-blue-100'
              }`}>
                {isReady ? (
                  <PartyPopper className="h-4.5 w-4.5 text-white" />
                ) : (
                  <Store className={`h-4.5 w-4.5 ${isDelayed ? 'text-white animate-shake' : 'text-blue-600'}`} />
                )}
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[13px] font-semibold truncate ${isReady || isDelayed ? 'text-white' : 'text-foreground'}`}>
                    🛍️ {shopName}
                  </span>
                  <span className={`text-[11px] ${isReady || isDelayed ? 'text-white/80' : 'text-muted-foreground'}`}>
                    • {getStatusText()}
                  </span>
                </div>
                
                {isReady ? (
                  <p className="text-white text-[13px] font-medium flex items-center gap-1">
                    🎊 Ready! Pick up now! 🎊
                  </p>
                ) : isDelayed ? (
                  <p className="text-white/90 text-[13px] flex items-center gap-1">
                    😅 Sorry for the wait! Almost ready...
                  </p>
                ) : (
                  <p className="text-muted-foreground text-[13px] flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Ready in {minutesLeft} min (approx)
                  </p>
                )}
              </div>
            </div>

            {/* Right side - View Order button */}
            <Button
              onClick={() => navigate('/student/orders?tab=shop')}
              size="sm"
              className={`flex-shrink-0 text-[13px] px-3 py-1 h-7 ${
                isReady 
                  ? 'bg-white text-green-600 hover:bg-white/90' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              View Order
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
