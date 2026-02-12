import { useCallback, useRef } from 'react';

export const useNotificationSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const audioContext = audioContextRef.current;
    
    // Resume if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    return audioContext;
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = getAudioContext();
      const currentTime = audioContext.currentTime;

      // Create a pleasant notification sound (two-tone chime)
      const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (major chord)
      
      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, currentTime);

        // Stagger the notes slightly for a pleasant chime effect
        const noteStart = currentTime + index * 0.1;
        const noteDuration = 0.3;

        gainNode.gain.setValueAtTime(0, noteStart);
        gainNode.gain.linearRampToValueAtTime(0.3, noteStart + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, noteStart + noteDuration);

        oscillator.start(noteStart);
        oscillator.stop(noteStart + noteDuration);
      });

      // Add a final higher note for emphasis
      const finalOsc = audioContext.createOscillator();
      const finalGain = audioContext.createGain();

      finalOsc.connect(finalGain);
      finalGain.connect(audioContext.destination);

      finalOsc.type = 'sine';
      finalOsc.frequency.setValueAtTime(1046.5, currentTime); // C6

      const finalStart = currentTime + 0.35;
      finalGain.gain.setValueAtTime(0, finalStart);
      finalGain.gain.linearRampToValueAtTime(0.25, finalStart + 0.02);
      finalGain.gain.exponentialRampToValueAtTime(0.01, finalStart + 0.4);

      finalOsc.start(finalStart);
      finalOsc.stop(finalStart + 0.4);

    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, [getAudioContext]);

  const playOverdueSound = useCallback(() => {
    try {
      const audioContext = getAudioContext();
      const currentTime = audioContext.currentTime;

      // Create an urgent warning sound (descending alarm tone)
      const frequencies = [880, 698.46, 523.25]; // A5, F5, C5 (descending)
      
      // Play the pattern twice for urgency
      for (let repeat = 0; repeat < 2; repeat++) {
        const repeatOffset = repeat * 0.5;
        
        frequencies.forEach((freq, index) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.type = 'square'; // More urgent/alarm-like tone
          oscillator.frequency.setValueAtTime(freq, currentTime);

          const noteStart = currentTime + repeatOffset + index * 0.12;
          const noteDuration = 0.15;

          gainNode.gain.setValueAtTime(0, noteStart);
          gainNode.gain.linearRampToValueAtTime(0.2, noteStart + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, noteStart + noteDuration);

          oscillator.start(noteStart);
          oscillator.stop(noteStart + noteDuration);
        });
      }

    } catch (error) {
      console.error('Error playing overdue sound:', error);
    }
  }, [getAudioContext]);

  return { playNotificationSound, playOverdueSound };
};
