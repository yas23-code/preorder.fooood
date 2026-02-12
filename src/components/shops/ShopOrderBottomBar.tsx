import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, PartyPopper, CheckCircle, Store } from 'lucide-react';

interface ShopOrderBottomBarProps {
  shopName: string;
  estimatedReadyTime: string;
  orderId?: string;
  orderStatus?: string | null;
  pickupCode?: string;
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

export function ShopOrderBottomBar({ 
  shopName,
  estimatedReadyTime,
  orderId,
  orderStatus,
  pickupCode,
  onOrderCompleted 
}: ShopOrderBottomBarProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

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

      // Celebration fanfare
      const fanfareNotes = [
        { freq: 523.25, start: 0, duration: 0.15 },
        { freq: 659.25, start: 0.12, duration: 0.15 },
        { freq: 783.99, start: 0.24, duration: 0.15 },
        { freq: 1046.5, start: 0.36, duration: 0.4 },
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

  // Handle order completed
  useEffect(() => {
    if (orderStatus === 'completed') {
      clearCelebrationFlag();
      const timeout = setTimeout(() => {
        onOrderCompleted?.();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [orderStatus, onOrderCompleted, clearCelebrationFlag]);

  // Trigger celebration when order is ready
  useEffect(() => {
    if (orderStatus === 'ready' && !hasCelebratedForOrder(orderId)) {
      markCelebrationTriggered(orderId);
      setShowCelebration(true);
      playCelebrationSound();
      
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [orderStatus, orderId, hasCelebratedForOrder, markCelebrationTriggered, playCelebrationSound]);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const targetTime = new Date(estimatedReadyTime).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((targetTime - now) / 1000));
      setTimeRemaining(diff);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [estimatedReadyTime]);

  const getMinutesRemaining = (seconds: number): number => {
    return Math.ceil(seconds / 60);
  };

  const minutesLeft = getMinutesRemaining(timeRemaining);
  const isReady = orderStatus === 'ready';
  const isCompleted = orderStatus === 'completed';
  const isDelayed = timeRemaining <= 0 && !isReady && !isCompleted;

  const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

  const getStatusText = () => {
    if (isCompleted) return 'Picked up';
    if (isReady) return 'Ready!';
    if (isDelayed) return 'Delayed';
    return 'Preparing';
  };

  if (isCompleted) {
    return (
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-center gap-2">
          <CheckCircle className="h-5 w-5 text-white" />
          <span className="text-white text-sm font-bold">Order Completed!</span>
          <span className="text-lg">✅</span>
        </div>
      </div>
    );
  }

  return (
    <>
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

      <div className={`rounded-lg p-3 mb-3 transition-all duration-300 ${
        isReady 
          ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
          : isDelayed
          ? 'bg-gradient-to-r from-amber-500 to-orange-500'
          : 'bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`rounded-full p-1.5 flex-shrink-0 ${
              isReady ? 'bg-white/20' : isDelayed ? 'bg-white/20' : 'bg-primary/10'
            }`}>
              {isReady ? (
                <PartyPopper className="h-4 w-4 text-white" />
              ) : (
                <Store className={`h-4 w-4 ${isDelayed ? 'text-white animate-shake' : 'text-primary'}`} />
              )}
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-sm font-semibold truncate ${isReady || isDelayed ? 'text-white' : 'text-foreground'}`}>
                  {shopName}
                </span>
                <span className={`text-xs ${isReady || isDelayed ? 'text-white/80' : 'text-muted-foreground'}`}>
                  • {getStatusText()}
                </span>
              </div>
              
              {isReady ? (
                <p className="text-white text-sm font-medium flex items-center gap-1">
                  🎊 Ready! Pick up now! 🎊
                </p>
              ) : isDelayed ? (
                <p className="text-white/90 text-sm flex items-center gap-1">
                  😅 Sorry for the wait! Almost ready...
                </p>
              ) : (
                <p className="text-muted-foreground text-sm flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Ready in {minutesLeft} min (approx)
                </p>
              )}
            </div>
          </div>

          {pickupCode && !isCompleted && (
            <div className={`text-center px-3 py-1 rounded-lg ${
              isReady || isDelayed ? 'bg-white/20' : 'bg-primary/10'
            }`}>
              <p className={`text-xs ${isReady || isDelayed ? 'text-white/80' : 'text-muted-foreground'}`}>Code</p>
              <p className={`text-lg font-bold tracking-widest ${isReady || isDelayed ? 'text-white' : 'text-primary'}`}>
                {pickupCode}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
