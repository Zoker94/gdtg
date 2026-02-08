import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface Petal {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  emoji: string;
  swayAmount: number;
}

const PETAL_EMOJIS = ["🌸", "🏵️", "💮"];

// Reduce petals on low-end devices
const getOptimalPetalCount = () => {
  // Check for low-end device indicators
  const isLowEnd = 
    navigator.hardwareConcurrency <= 2 || 
    (navigator as any).deviceMemory <= 2 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  return isLowEnd ? 6 : 10;
};

const FallingPetals = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isPageActive, setIsPageActive] = useState(true);
  const prefersReducedMotion = useReducedMotion();
  
  // Get optimal petal count based on device capability
  const petalCount = useMemo(() => getOptimalPetalCount(), []);

  // Generate petals once on mount
  const petals = useMemo<Petal[]>(() => {
    return Array.from({ length: petalCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 16 + Math.random() * 8, // Slower: 16-24 seconds for less CPU usage
      size: 14 + Math.random() * 8,
      emoji: PETAL_EMOJIS[Math.floor(Math.random() * PETAL_EMOJIS.length)],
      swayAmount: 30 + Math.random() * 40,
    }));
  }, [petalCount]);

  // Hide on scroll for performance
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsVisible(window.scrollY < 300);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Pause animation when page is hidden (tab inactive)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageActive(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Don't render if user prefers reduced motion, page is hidden, or scrolled down
  if (prefersReducedMotion || !isVisible || !isPageActive) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden z-10"
      style={{ willChange: "auto" }} // Hint for GPU acceleration
    >
      {petals.map((petal) => (
        <motion.div
          key={petal.id}
          className="absolute select-none"
          style={{
            left: `${petal.x}%`,
            fontSize: petal.size,
            top: -30,
            willChange: "transform, opacity",
          }}
          animate={{
            y: ["0vh", "110vh"],
            x: [
              0, 
              petal.swayAmount, 
              -petal.swayAmount * 0.7, 
              petal.swayAmount * 0.5, 
              -petal.swayAmount * 0.3,
              0
            ],
            rotate: [0, 180, 360],
            opacity: [0, 0.8, 0.9, 0.8, 0.6, 0],
          }}
          transition={{
            duration: petal.duration,
            delay: petal.delay,
            repeat: Infinity,
            ease: "linear", // Linear is more performant than easeInOut
            x: {
              duration: petal.duration,
              ease: "easeInOut",
            },
          }}
        >
          {petal.emoji}
        </motion.div>
      ))}
    </div>
  );
};

export default FallingPetals;
