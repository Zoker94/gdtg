import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  emoji: string;
  duration: number;
  delay: number;
  size: number;
}

const effectEmojis: Record<string, string[]> = {
  sparkle: ["✨", "⭐", "💫", "🌟"],
  hearts: ["💖", "💕", "💗", "❤️"],
  stars: ["⭐", "🌟", "✨", "💛"],
  confetti: ["🎊", "🎉", "🟡", "🔴", "🔵", "🟢", "🟣"],
  snow: ["❄️", "🌨️", "❅", "❆"],
  fireflies: ["🌟", "✨", "💛", "💚"],
};

export const ProfileEffects = ({ effectId }: { effectId: string }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!effectId || effectId === "default") return;

    const emojis = effectEmojis[effectId] || effectEmojis.sparkle;
    const count = effectId === "confetti" ? 15 : 10;
    const generated: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 3,
      size: effectId === "fireflies" ? 10 : 12 + Math.random() * 8,
    }));
    setParticles(generated);
  }, [effectId]);

  if (!effectId || effectId === "default") return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-20">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className="fixed select-none"
            style={{ left: `${p.x}%`, fontSize: p.size }}
            initial={{ top: "-5vh", opacity: 0 }}
            animate={{
              top: ["0vh", "100vh"],
              left: [
                `${p.x}%`,
                `${p.x + (Math.random() - 0.5) * 15}%`,
                `${p.x}%`,
              ],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {p.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
};
