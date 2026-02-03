import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trophy } from "lucide-react";
import { useGameSound } from "@/hooks/useGameSound";
import { useGameLeaderboard } from "@/hooks/useGameLeaderboard";
import LeaderboardDisplay from "./LeaderboardDisplay";
import DifficultySelector, { Difficulty } from "./DifficultySelector";

const EMOJIS_BY_DIFFICULTY: Record<Difficulty, string[]> = {
  easy: ["🎮", "🎯", "🎲", "🎪"], // 4 pairs = 8 cards
  medium: ["🎮", "🎯", "🎲", "🎪", "🎨", "🎭"], // 6 pairs = 12 cards
  hard: ["🎮", "🎯", "🎲", "🎪", "🎨", "🎭", "🎱", "🎸", "🎺", "🎻"], // 10 pairs = 20 cards
};

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const MemoryCard = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  
  const { playSound } = useGameSound();
  const { leaderboard, addScore } = useGameLeaderboard("memory");

  const initGame = (diff: Difficulty = difficulty) => {
    const emojis = EMOJIS_BY_DIFFICULTY[diff];
    const shuffled = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, i) => ({
        id: i,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffled);
    setFlippedCards([]);
    setMoves(0);
    setIsComplete(false);
  };

  const handleDifficultyChange = (newDiff: Difficulty) => {
    setDifficulty(newDiff);
    initGame(newDiff);
  };

  useEffect(() => {
    initGame();
  }, []);

  useEffect(() => {
    if (flippedCards.length === 2) {
      const [first, second] = flippedCards;
      
      if (cards[first].emoji === cards[second].emoji) {
        // Match found
        playSound("match");
        setTimeout(() => {
          setCards(prev => prev.map((card, i) => 
            i === first || i === second ? { ...card, isMatched: true } : card
          ));
          setFlippedCards([]);
        }, 300);
      } else {
        // No match - flip back
        setTimeout(() => {
          setCards(prev => prev.map((card, i) => 
            i === first || i === second ? { ...card, isFlipped: false } : card
          ));
          setFlippedCards([]);
        }, 800);
      }
      setMoves(m => m + 1);
    }
  }, [flippedCards, cards, playSound]);

  useEffect(() => {
    if (cards.length > 0 && cards.every(c => c.isMatched)) {
      playSound("win");
      setIsComplete(true);
      addScore(moves);
    }
  }, [cards, moves, playSound, addScore]);

  const handleCardClick = (index: number) => {
    if (
      flippedCards.length >= 2 ||
      cards[index].isFlipped ||
      cards[index].isMatched
    ) return;

    playSound("click");
    setCards(prev => prev.map((card, i) => 
      i === index ? { ...card, isFlipped: true } : card
    ));
    setFlippedCards(prev => [...prev, index]);
  };

  // Grid columns based on difficulty
  const gridCols = difficulty === "easy" ? 4 : difficulty === "medium" ? 4 : 5;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-between w-full px-1">
        <div className="text-center">
          {isComplete ? (
            <p className="text-sm font-medium">🎉 Hoàn thành với {moves} lượt!</p>
          ) : (
            <p className="text-xs text-muted-foreground">Lượt: {moves}</p>
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
        onChange={handleDifficultyChange} 
        disabled={moves > 0 && !isComplete}
      />

      <div className={`grid gap-1.5`} style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
        {cards.map((card, i) => (
          <motion.button
            key={card.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleCardClick(i)}
            className={`w-10 h-10 rounded-md flex items-center justify-center text-lg transition-all ${
              card.isFlipped || card.isMatched
                ? "bg-card"
                : "bg-primary/20 hover:bg-primary/30"
            } ${card.isMatched ? "opacity-60" : ""}`}
          >
            {(card.isFlipped || card.isMatched) && card.emoji}
          </motion.button>
        ))}
      </div>

      <Button variant="ghost" size="sm" onClick={() => initGame(difficulty)} className="gap-1.5 h-7 text-xs">
        <RefreshCw className="w-3 h-3" />
        Chơi lại
      </Button>

      <LeaderboardDisplay
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        leaderboard={leaderboard}
        title="Bảng xếp hạng Lật thẻ"
        scoreLabel="Lượt"
        lowerIsBetter
      />
    </div>
  );
};

export default MemoryCard;
