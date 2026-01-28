import { motion } from "framer-motion";

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen = ({ message = "Đang tải..." }: LoadingScreenProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      {/* Animated logo/spinner */}
      <div className="relative">
        {/* Outer ring */}
        <motion.div
          className="w-20 h-20 rounded-full border-4 border-primary/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Inner spinning arc */}
        <motion.div
          className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Center pulsing dot */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/60" />
        </motion.div>
      </div>

      {/* Loading dots */}
      <div className="mt-8 flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-3 h-3 rounded-full bg-primary"
            animate={{
              y: [0, -10, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Message */}
      <motion.p
        className="mt-4 text-muted-foreground text-sm font-medium"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {message}
      </motion.p>

      {/* Progress bar */}
      <motion.div
        className="mt-6 w-48 h-1 bg-muted rounded-full overflow-hidden"
      >
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary rounded-full"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>
    </motion.div>
  );
};

export default LoadingScreen;
