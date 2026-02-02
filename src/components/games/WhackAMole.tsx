import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw, Play } from "lucide-react";

const GAME_DURATION = 30; // seconds
const MOLE_DURATION = 800; // ms

const WhackAMole = () => {
  const [activeMole, setActiveMole] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const showRandomMole = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * 9);
    setActiveMole(randomIndex);
    setTimeout(() => setActiveMole(null), MOLE_DURATION);
  }, []);

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setIsPlaying(true);
    setIsGameOver(false);
  };

  // Timer countdown
  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsPlaying(false);
          setIsGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying]);

  // Show moles randomly
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      showRandomMole();
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, showRandomMole]);

  const handleWhack = (index: number) => {
    if (index === activeMole) {
      setScore(s => s + 10);
      setActiveMole(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-center flex items-center gap-4">
        <p className="text-xs text-muted-foreground">Điểm: <span className="font-bold text-foreground">{score}</span></p>
        {isPlaying && (
          <p className="text-xs text-muted-foreground">Thời gian: <span className="font-bold text-foreground">{timeLeft}s</span></p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 bg-muted rounded-lg p-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleWhack(i)}
            className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl transition-colors ${
              activeMole === i ? "bg-amber-500" : "bg-card hover:bg-accent"
            }`}
            disabled={!isPlaying}
          >
            <AnimatePresence>
              {activeMole === i && (
                <motion.span
                  initial={{ scale: 0, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0, y: 10 }}
                >
                  🐹
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>

      {isGameOver && (
        <p className="text-sm font-medium">🎉 Kết thúc! Bạn đạt {score} điểm</p>
      )}

      <Button 
        variant={isPlaying ? "ghost" : "default"} 
        size="sm" 
        onClick={startGame} 
        className="gap-1.5 h-7 text-xs"
        disabled={isPlaying}
      >
        {isPlaying ? (
          <>Đang chơi...</>
        ) : isGameOver ? (
          <>
            <RefreshCw className="w-3 h-3" />
            Chơi lại
          </>
        ) : (
          <>
            <Play className="w-3 h-3" />
            Bắt đầu
          </>
        )}
      </Button>
    </div>
  );
};

export default WhackAMole;
