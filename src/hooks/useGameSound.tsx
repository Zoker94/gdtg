import { useCallback, useRef } from "react";

type SoundType = "click" | "match" | "win" | "lose" | "eat" | "whack" | "tick" | "move";

export const useGameSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback((type: SoundType) => {
    try {
      const ctx = getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Different sounds for different events
      switch (type) {
        case "click":
          oscillator.frequency.setValueAtTime(600, ctx.currentTime);
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.1);
          break;
          
        case "match":
          oscillator.frequency.setValueAtTime(523, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
          
        case "win":
          // Victory fanfare
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          const gain2 = ctx.createGain();
          
          osc1.connect(gain1);
          osc2.connect(gain2);
          gain1.connect(ctx.destination);
          gain2.connect(ctx.destination);
          
          osc1.frequency.setValueAtTime(523, ctx.currentTime);
          osc1.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
          osc1.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
          osc1.type = "sine";
          
          osc2.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
          osc2.frequency.setValueAtTime(1047, ctx.currentTime + 0.45);
          osc2.type = "sine";
          
          gain1.gain.setValueAtTime(0.2, ctx.currentTime);
          gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          gain2.gain.setValueAtTime(0, ctx.currentTime);
          gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.3);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
          
          osc1.start(ctx.currentTime);
          osc1.stop(ctx.currentTime + 0.5);
          osc2.start(ctx.currentTime + 0.3);
          osc2.stop(ctx.currentTime + 0.6);
          return;
          
        case "lose":
          oscillator.frequency.setValueAtTime(400, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
          oscillator.type = "sawtooth";
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
          
        case "eat":
          oscillator.frequency.setValueAtTime(400, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
          oscillator.type = "square";
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.1);
          break;
          
        case "whack":
          oscillator.frequency.setValueAtTime(300, ctx.currentTime);
          oscillator.type = "triangle";
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.15);
          break;
          
        case "tick":
          oscillator.frequency.setValueAtTime(1000, ctx.currentTime);
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.05);
          break;
          
        case "move":
          oscillator.frequency.setValueAtTime(440, ctx.currentTime);
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.08);
          break;
      }
    } catch (error) {
      console.warn("Could not play game sound:", error);
    }
  }, [getContext]);

  return { playSound };
};
