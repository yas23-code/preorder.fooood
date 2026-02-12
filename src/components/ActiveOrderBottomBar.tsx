import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronUp, PartyPopper, CheckCircle, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActiveOrderBottomBarProps {
  canteenName: string;
  estimatedReadyTime: string | null; // Can be null until vendor accepts
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

// Celebration overlay component
function CelebrationOverlay({ onAnimationEnd }: { onAnimationEnd: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onAnimationEnd, 3500);
    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {/* Radial glow background */}
      <div 
        className="absolute inset-0 animate-pulse"
        style={{
          background: 'radial-gradient(circle at center, rgba(34, 197, 94, 0.3) 0%, transparent 70%)'
        }}
      />
      
      {/* Confetti particles */}
      {Array.from({ length: 60 }).map((_, i) => (
        <ConfettiParticle 
          key={i} 
          delay={i * 40} 
          color={['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#00D26A', '#FF9F43'][i % 10]} 
        />
      ))}
      
      {/* Center celebration message */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
        <div className="animate-celebration-bounce">
          <div 
            className="px-8 py-6 rounded-2xl shadow-2xl animate-scale-in text-white"
            style={{
              background: 'linear-gradient(to right, #22c55e, #10b981)'
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="text-5xl animate-bounce">🎉</div>
              <h2 className="text-3xl font-bold tracking-tight">Order Ready!</h2>
              <p className="text-white/90 text-sm">Pick up your order now 🏃</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sparkle effects */}
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={`sparkle-${i}`}
          className="absolute text-2xl animate-sparkle"
          style={{
            left: `${5 + Math.random() * 90}%`,
            top: `${5 + Math.random() * 90}%`,
            animationDelay: `${i * 120}ms`,
          }}
        >
          ✨
        </div>
      ))}
    </div>
  );
}

// Animated dots for awaiting state
function AnimatedDots() {
  return (
    <span className="inline-flex ml-0.5">
      <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
      <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce ml-0.5" style={{ animationDelay: '150ms', animationDuration: '1s' }} />
      <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce ml-0.5" style={{ animationDelay: '300ms', animationDuration: '1s' }} />
    </span>
  );
}

const CELEBRATION_STORAGE_KEY = 'celebrationTriggered';

export function ActiveOrderBottomBar({ 
  canteenName,
  estimatedReadyTime,
  orderId,
  orderStatus,
  onOrderCompleted 
}: ActiveOrderBottomBarProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const navigate = useNavigate();

  // Determine order states first - before any other logic
  const isReady = orderStatus === 'ready';
  const isCompleted = orderStatus === 'completed';
  const isAwaitingAcceptance = orderStatus === 'pending';
  const isAccepted = orderStatus === 'accepted';

  // Check if celebration was already triggered for this order
  const hasCelebratedForOrder = useCallback((id?: string) => {
    if (!id) return false;
    const stored = localStorage.getItem(CELEBRATION_STORAGE_KEY);
    return stored === id;
  }, []);

  // Mark celebration as triggered for this order
  const markCelebrationTriggered = useCallback((id?: string) => {
    if (id) {
      localStorage.setItem(CELEBRATION_STORAGE_KEY, id);
    }
  }, []);

  // Clear celebration flag when order is completed
  const clearCelebrationFlag = useCallback(() => {
    localStorage.removeItem(CELEBRATION_STORAGE_KEY);
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

  // Trigger celebration when order becomes ready (either via realtime update or initial load)
  useEffect(() => {
    console.log('[Celebration] Status check:', { isReady, orderId, hasCelebrated: hasCelebratedForOrder(orderId) });
    if (isReady && orderId && !hasCelebratedForOrder(orderId)) {
      console.log('[Celebration] Triggering celebration for order:', orderId);
      markCelebrationTriggered(orderId);
      setShowCelebration(true);
      playCelebrationSound();
      
      // Hide overlay after animation completes
      const timer = setTimeout(() => {
        console.log('[Celebration] Hiding celebration overlay');
        setShowCelebration(false);
      }, 3500);
      
      return () => clearTimeout(timer);
    }
  }, [isReady, orderId, hasCelebratedForOrder, markCelebrationTriggered, playCelebrationSound]);

  useEffect(() => {
    // Only calculate time if we have an ETA AND order is still being prepared (not ready/completed)
    if (!estimatedReadyTime || isReady || isCompleted) {
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
  // Only show delayed state when order is accepted but timer has run out (NOT for ready/completed orders)
  const isDelayed = timeRemaining <= 0 && !isReady && !isCompleted && !isAwaitingAcceptance && isAccepted && estimatedReadyTime;

  // Confetti colors
  const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

  // Get status text
  const getStatusText = () => {
    if (isCompleted) return 'Picked up';
    if (isReady) return 'Ready!';
    if (isDelayed) return 'Delayed';
    if (isAwaitingAcceptance) return 'Awaiting confirmation';
    if (isAccepted) return 'Preparing';
    return 'Pending';
  };

  // Completed state
  if (isCompleted) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="h-5 w-5 text-white" />
            <span className="text-white text-sm font-bold">Order Completed!</span>
            <span className="text-lg">✅</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Celebration overlay */}
      {showCelebration && (
        <CelebrationOverlay onAnimationEnd={() => setShowCelebration(false)} />
      )}

      <div className={`fixed bottom-0 left-0 right-0 z-50 shadow-lg transition-all duration-300 ${
        isReady 
          ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
          : isDelayed
          ? 'bg-gradient-to-r from-amber-500 to-orange-500'
          : isAwaitingAcceptance
          ? 'bg-white border-t border-amber-200'
          : 'bg-white border-t border-mcd-border'
      }`}>
        <div className="container mx-auto px-3.5 py-2">
          <div className="flex items-center justify-between gap-2.5">
            {/* Left side - Canteen info and status */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={`rounded-full p-1.5 flex-shrink-0 ${
                isReady ? 'bg-white/20' : isDelayed ? 'bg-white/20' : isAwaitingAcceptance ? 'bg-amber-100 animate-pulse' : 'bg-amber-100'
              }`}>
                {isReady ? (
                  <PartyPopper className="h-4.5 w-4.5 text-white" />
                ) : isAwaitingAcceptance ? (
                  <Clock className="h-4.5 w-4.5 text-amber-600" />
                ) : (
                  <UtensilsCrossed className={`h-4.5 w-4.5 ${isDelayed ? 'text-white animate-shake' : 'text-amber-600'}`} />
                )}
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[13px] font-semibold truncate ${isReady || isDelayed ? 'text-white' : 'text-foreground'}`}>
                    🍽 {canteenName}
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
                ) : isAwaitingAcceptance ? (
                  <p className="text-amber-600 text-[13px] flex items-center gap-1">
                    <Clock className="h-3 w-3 animate-spin" style={{ animationDuration: '3s' }} />
                    Waiting for vendor to confirm<AnimatedDots />
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
              onClick={() => navigate('/student/orders')}
              size="sm"
              className={`flex-shrink-0 text-[13px] px-3 py-1 h-7 ${
                isReady 
                  ? 'bg-white text-green-600 hover:bg-white/90' 
                  : 'bg-mcd-red text-white hover:bg-red-600'
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
