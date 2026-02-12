import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, ChevronDown, PartyPopper, CheckCircle } from 'lucide-react';

interface OrderCountdownTimerProps {
  pickupCode: string;
  estimatedReadyTime: string;
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
      className="absolute w-3 h-3 rounded-sm animate-confetti opacity-0"
      style={style}
    />
  );
}

export function OrderCountdownTimer({ 
  pickupCode, 
  estimatedReadyTime, 
  orderStatus,
  onOrderCompleted 
}: OrderCountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasTriggeredCelebration, setHasTriggeredCelebration] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

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
    if (orderStatus === 'completed') {
      // Show completed state briefly, then dismiss
      const timeout = setTimeout(() => {
        onOrderCompleted?.();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [orderStatus, onOrderCompleted]);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const targetTime = new Date(estimatedReadyTime).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((targetTime - now) / 1000));
      setTimeRemaining(diff);
      
      // Trigger celebration when timer reaches zero (or order is ready)
      if ((diff === 0 || orderStatus === 'ready') && !hasTriggeredCelebration) {
        setHasTriggeredCelebration(true);
        setShowCelebration(true);
        playCelebrationSound();
        
        // Hide confetti after animation
        setTimeout(() => setShowCelebration(false), 3000);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [estimatedReadyTime, hasTriggeredCelebration, playCelebrationSound, orderStatus]);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return { minutes: '00', seconds: '00' };
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return {
      minutes: mins.toString().padStart(2, '0'),
      seconds: secs.toString().padStart(2, '0'),
    };
  };

  const { minutes, seconds } = formatTime(timeRemaining);
  const isReady = timeRemaining <= 0 || orderStatus === 'ready';
  const isCompleted = orderStatus === 'completed';

  // Confetti colors
  const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

  // Completed state
  if (isCompleted) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 rounded-xl shadow-lg overflow-hidden bg-gradient-to-r from-green-500 to-emerald-500">
        <div className="p-3">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="h-4 w-4 text-white" />
            <span className="text-white text-sm font-bold">Order Completed!</span>
            <span className="text-base">✅</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`fixed bottom-20 right-4 z-50 rounded-full p-2 shadow-lg transition-transform hover:scale-105 ${
          isReady 
            ? 'bg-gradient-to-r from-green-500 to-emerald-500 animate-bounce' 
            : 'bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse hover:animate-none'
        }`}
      >
        {isReady ? <PartyPopper className="h-4 w-4 text-white" /> : <Clock className="h-4 w-4 text-white" />}
      </button>
    );
  }

  return (
    <>
      {/* Confetti overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <ConfettiParticle 
              key={i} 
              delay={i * 50} 
              color={confettiColors[i % confettiColors.length]} 
            />
          ))}
        </div>
      )}

      <div className={`fixed bottom-20 left-4 right-4 z-50 rounded-xl shadow-lg overflow-hidden transition-all duration-500 ${
        isReady 
          ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
          : 'bg-gradient-to-r from-amber-500 to-orange-500'
      }`}>
        <div className="p-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className={`rounded-full p-1 ${isReady ? 'bg-white/30 animate-pulse' : 'bg-white/20'}`}>
                {isReady ? <PartyPopper className="h-3 w-3 text-white" /> : <Clock className="h-3 w-3 text-white" />}
              </div>
              {isReady ? (
                <div className="flex items-center gap-1">
                  <span className="text-base">🎊</span>
                  <span className="text-white text-sm font-bold">Pick up now!</span>
                  <span className="text-base">🎊</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-white/80 text-xs">Ready in</span>
                  <span className="text-white text-lg font-bold font-mono">{minutes}:{seconds}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-white/80 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {!isReady && (
            <div className="mt-2">
              <div className="bg-white/20 rounded-full h-1 overflow-hidden">
                <div 
                  className="bg-white h-full rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${Math.max(0, 100 - (timeRemaining / 1800) * 100)}%` 
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
