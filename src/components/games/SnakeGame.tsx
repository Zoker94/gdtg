import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Trophy } from "lucide-react";
import { useGameSound } from "@/hooks/useGameSound";
import { useGameLeaderboard } from "@/hooks/useGameLeaderboard";
import LeaderboardDisplay from "./LeaderboardDisplay";
import DifficultySelector, { Difficulty } from "./DifficultySelector";

const GRID_SIZE = 10;
const CELL_SIZE = 18;

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Position = { x: number; y: number };

const SnakeGame = () => {
  const [snake, setSnake] = useState<Position[]>([{ x: 5, y: 5 }]);
  const [food, setFood] = useState<Position>({ x: 7, y: 5 });
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [isRunning, setIsRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  
  const { playSound } = useGameSound();
  const { leaderboard, addScore } = useGameLeaderboard("snake");

  // Speed based on difficulty
  const getSpeed = useCallback(() => {
    switch (difficulty) {
      case "easy": return 250;
      case "medium": return 180;
      case "hard": return 120;
    }
  }, [difficulty]);

  const generateFood = useCallback(() => {
    const newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake([{ x: 5, y: 5 }]);
    setFood(generateFood());
    setDirection("RIGHT");
    setIsRunning(false);
    setGameOver(false);
    setScore(0);
  };

  // Save score when game ends
  useEffect(() => {
    if (gameOver && score > 0) {
      addScore(score);
    }
  }, [gameOver, score, addScore]);

  const moveSnake = useCallback(() => {
    if (!isRunning || gameOver) return;

    setSnake(prevSnake => {
      const head = { ...prevSnake[0] };

      switch (direction) {
        case "UP": head.y -= 1; break;
        case "DOWN": head.y += 1; break;
        case "LEFT": head.x -= 1; break;
        case "RIGHT": head.x += 1; break;
      }

      // Check wall collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        playSound("lose");
        setGameOver(true);
        setIsRunning(false);
        return prevSnake;
      }

      // Check self collision
      if (prevSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        playSound("lose");
        setGameOver(true);
        setIsRunning(false);
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];

      // Check food collision
      if (head.x === food.x && head.y === food.y) {
        playSound("eat");
        setFood(generateFood());
        // Points based on difficulty
        const points = difficulty === "hard" ? 20 : difficulty === "medium" ? 10 : 5;
        setScore(s => s + points);
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, generateFood, isRunning, gameOver, playSound, difficulty]);

  useEffect(() => {
    const interval = setInterval(moveSnake, getSpeed());
    return () => clearInterval(interval);
  }, [moveSnake, getSpeed]);

  const handleDirection = (newDir: Direction) => {
    const opposites: Record<Direction, Direction> = {
      UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT"
    };
    if (opposites[newDir] !== direction) {
      playSound("click");
      setDirection(newDir);
      if (!isRunning && !gameOver) setIsRunning(true);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
        w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT"
      };
      if (keyMap[e.key]) {
        e.preventDefault();
        handleDirection(keyMap[e.key]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [direction, isRunning, gameOver]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-between w-full px-1">
        <div className="text-center">
          {gameOver ? (
            <p className="text-sm font-medium">💀 Game Over! Điểm: {score}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Điểm: {score}</p>
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
        disabled={isRunning}
      />

      <div
        className="bg-muted rounded-lg p-1 relative"
        style={{ width: GRID_SIZE * CELL_SIZE + 8, height: GRID_SIZE * CELL_SIZE + 8 }}
      >
        <div className="relative" style={{ width: GRID_SIZE * CELL_SIZE, height: GRID_SIZE * CELL_SIZE }}>
          {/* Food */}
          <motion.div
            className="absolute bg-destructive rounded-sm"
            style={{
              width: CELL_SIZE - 2,
              height: CELL_SIZE - 2,
              left: food.x * CELL_SIZE,
              top: food.y * CELL_SIZE,
            }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
          />
          
          {/* Snake */}
          {snake.map((segment, i) => (
            <div
              key={i}
              className={`absolute rounded-sm ${i === 0 ? "bg-primary" : "bg-primary/70"}`}
              style={{
                width: CELL_SIZE - 2,
                height: CELL_SIZE - 2,
                left: segment.x * CELL_SIZE,
                top: segment.y * CELL_SIZE,
              }}
            />
          ))}
        </div>

        {/* Start overlay */}
        {!isRunning && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
            <p className="text-xs text-muted-foreground">Nhấn mũi tên để bắt đầu</p>
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div className="grid grid-cols-3 gap-1 w-24">
        <div />
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleDirection("UP")}>
          <ArrowUp className="w-3 h-3" />
        </Button>
        <div />
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleDirection("LEFT")}>
          <ArrowLeft className="w-3 h-3" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleDirection("DOWN")}>
          <ArrowDown className="w-3 h-3" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleDirection("RIGHT")}>
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>

      <Button variant="ghost" size="sm" onClick={resetGame} className="gap-1.5 h-7 text-xs">
        <RefreshCw className="w-3 h-3" />
        Chơi lại
      </Button>

      <LeaderboardDisplay
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        leaderboard={leaderboard}
        title="Bảng xếp hạng Rắn săn mồi"
        scoreLabel="Điểm"
      />
    </div>
  );
};

export default SnakeGame;
