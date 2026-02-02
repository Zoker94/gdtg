import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

const GRID_SIZE = 10;
const CELL_SIZE = 18;
const INITIAL_SPEED = 200;

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Position = { x: number; y: number };

const SnakeGame = () => {
  const [snake, setSnake] = useState<Position[]>([{ x: 5, y: 5 }]);
  const [food, setFood] = useState<Position>({ x: 7, y: 5 });
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [isRunning, setIsRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

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
        setGameOver(true);
        setIsRunning(false);
        return prevSnake;
      }

      // Check self collision
      if (prevSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        setGameOver(true);
        setIsRunning(false);
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];

      // Check food collision
      if (head.x === food.x && head.y === food.y) {
        setFood(generateFood());
        setScore(s => s + 10);
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, generateFood, isRunning, gameOver]);

  useEffect(() => {
    const interval = setInterval(moveSnake, INITIAL_SPEED);
    return () => clearInterval(interval);
  }, [moveSnake]);

  const handleDirection = (newDir: Direction) => {
    const opposites: Record<Direction, Direction> = {
      UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT"
    };
    if (opposites[newDir] !== direction) {
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
      <div className="text-center">
        {gameOver ? (
          <p className="text-sm font-medium">💀 Game Over! Điểm: {score}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Điểm: {score}</p>
        )}
      </div>

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
    </div>
  );
};

export default SnakeGame;
