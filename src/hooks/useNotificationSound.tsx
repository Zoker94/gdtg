import { useCallback, useRef } from "react";

// Simple notification sound using Web Audio API
export const useNotificationSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      // Create AudioContext lazily (required for browser autoplay policies)
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      
      // Create a pleasant notification tone
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Use a pleasant frequency (G5 note)
      oscillator.frequency.setValueAtTime(784, ctx.currentTime);
      oscillator.type = "sine";
      
      // Quick fade in/out for a gentle "ding"
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
      
      // Play a second higher tone for a more complete notification
      const oscillator2 = ctx.createOscillator();
      const gainNode2 = ctx.createGain();
      
      oscillator2.connect(gainNode2);
      gainNode2.connect(ctx.destination);
      
      // Higher note (B5)
      oscillator2.frequency.setValueAtTime(988, ctx.currentTime + 0.1);
      oscillator2.type = "sine";
      
      gainNode2.gain.setValueAtTime(0, ctx.currentTime + 0.1);
      gainNode2.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.15);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      oscillator2.start(ctx.currentTime + 0.1);
      oscillator2.stop(ctx.currentTime + 0.4);
      
    } catch (error) {
      console.warn("Could not play notification sound:", error);
    }
  }, []);

  return { playNotificationSound };
};
