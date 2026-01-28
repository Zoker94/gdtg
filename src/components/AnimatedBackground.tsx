import { motion } from "framer-motion";

const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-background" />
      
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full opacity-30 dark:opacity-20"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)",
        }}
        animate={{
          x: [0, 100, 50, 0],
          y: [0, 50, 100, 0],
          scale: [1, 1.2, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full opacity-25 dark:opacity-15"
        style={{
          background: "radial-gradient(circle, hsl(var(--gradient-end) / 0.4) 0%, transparent 70%)",
        }}
        animate={{
          x: [0, -80, -40, 0],
          y: [0, -60, -120, 0],
          scale: [1, 1.3, 1.15, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute top-1/4 right-1/4 w-1/2 h-1/2 rounded-full opacity-20 dark:opacity-10"
        style={{
          background: "radial-gradient(circle, hsl(var(--glow-secondary) / 0.3) 0%, transparent 60%)",
        }}
        animate={{
          x: [0, 60, -30, 0],
          y: [0, -40, 60, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Subtle noise overlay for texture */}
      <div 
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
