import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gamepad2, Grid3X3, Brain, Bug, Target, ChevronLeft, ChevronRight, Crown, Circle } from "lucide-react";
import CaroGame from "./CaroGame";
import MemoryCard from "./MemoryCard";
import SnakeGame from "./SnakeGame";
import WhackAMole from "./WhackAMole";
import ChineseChess from "./ChineseChess";
import Pool8Ball from "./Pool8Ball";

type GameType = "caro" | "memory" | "snake" | "whack" | "chess" | "pool";

const GAMES: { id: GameType; name: string; icon: React.ElementType; component: React.ComponentType }[] = [
  { id: "caro", name: "Cờ Caro", icon: Grid3X3, component: CaroGame },
  { id: "chess", name: "Cờ Tướng", icon: Crown, component: ChineseChess },
  { id: "pool", name: "Bida 8 bóng", icon: Circle, component: Pool8Ball },
  { id: "memory", name: "Lật thẻ", icon: Brain, component: MemoryCard },
  { id: "snake", name: "Rắn săn mồi", icon: Bug, component: SnakeGame },
  { id: "whack", name: "Đập chuột", icon: Target, component: WhackAMole },
];

const GameSelector = () => {
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const currentGame = GAMES[currentGameIndex];
  const GameComponent = currentGame.component;

  const nextGame = () => {
    setCurrentGameIndex((prev) => (prev + 1) % GAMES.length);
  };

  const prevGame = () => {
    setCurrentGameIndex((prev) => (prev - 1 + GAMES.length) % GAMES.length);
  };

  if (!isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="gap-2 h-8 text-xs border-dashed"
        >
          <Gamepad2 className="w-3.5 h-3.5" />
          Chơi game giải trí
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full"
    >
      <Card className="border-primary/20">
        <CardHeader className="py-2 px-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={prevGame}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center gap-1.5">
                <currentGame.icon className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm">{currentGame.name}</CardTitle>
              </div>

              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={nextGame}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="h-6 text-xs text-muted-foreground"
            >
              Thu gọn
            </Button>
          </div>

          {/* Game indicators */}
          <div className="flex justify-center gap-1 mt-1">
            {GAMES.map((game, i) => (
              <button
                key={game.id}
                onClick={() => setCurrentGameIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentGameIndex ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="pb-3 pt-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentGame.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <GameComponent />
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default GameSelector;
