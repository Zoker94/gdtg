import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw, Play, Trophy } from "lucide-react";
import { useGameSound } from "@/hooks/useGameSound";
import { useGameLeaderboard } from "@/hooks/useGameLeaderboard";
import LeaderboardDisplay from "./LeaderboardDisplay";
import DifficultySelector, { Difficulty } from "./DifficultySelector";

const GAME_DURATION = 30; // seconds

const WhackAMole = () => {
  const [activeMole, setActiveMole] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  
  const { playSound } = useGameSound();
  const { leaderboard, addScore } = useGameLeaderboard("whack");

  // Mole duration based on difficulty
  const getMoleDuration = useCallback(() => {
    switch (difficulty) {
      case "easy": return 1200;
      case "medium": return 800;
      case "hard": return 500;
    }
  }, [difficulty]);

  // Mole spawn interval based on difficulty
  const getSpawnInterval = useCallback(() => {
    switch (difficulty) {
      case "easy": return 1500;
      case "medium": return 1000;
      case "hard": return 600;
    }
  }, [difficulty]);

  const showRandomMole = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * 9);
    setActiveMole(randomIndex);
    setTimeout(() => setActiveMole(null), getMoleDuration());
  }, [getMoleDuration]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setIsPlaying(true);
    setIsGameOver(false);
    playSound("click");
  };

  // Timer countdown
  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsPlaying(false);
          setIsGameOver(true);
          playSound("lose");
          return 0;
        }
        if (prev <= 5) playSound("tick");
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, playSound]);

  // Save score when game ends
  useEffect(() => {
    if (isGameOver && score > 0) {
      addScore(score);
    }
  }, [isGameOver, score, addScore]);

  // Show moles randomly
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      showRandomMole();
    }, getSpawnInterval());

    return () => clearInterval(interval);
  }, [isPlaying, showRandomMole, getSpawnInterval]);

  const handleWhack = (index: number) => {
    if (index === activeMole) {
      playSound("whack");
      // Points based on difficulty
      const points = difficulty === "hard" ? 15 : difficulty === "medium" ? 10 : 5;
      setScore(s => s + points);
      setActiveMole(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-between w-full px-1">
        <div className="flex items-center gap-4">
          <p className="text-xs text-muted-foreground">Điểm: <span className="font-bold text-foreground">{score}</span></p>
          {isPlaying && (
            <p className="text-xs text-muted-foreground">Thời gian: <span className="font-bold text-foreground">{timeLeft}s</span></p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setShowLeaderboard(true)}
        >
          <Trophy className="w-3 h-3" />
        </Button>
      </div>

      <DifficultySelector 
        value={difficulty} 
        onChange={setDifficulty} 
        disabled={isPlaying}
      />

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

      <LeaderboardDisplay
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        leaderboard={leaderboard}
        title="Bảng xếp hạng Đập chuột"
        scoreLabel="Điểm"
      />
    </div>
  );
};

export default WhackAMole;
