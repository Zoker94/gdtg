import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const EMOJIS = ["🎮", "🎯", "🎲", "🎪", "🎨", "🎭", "🎱", "🎸"];

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

  const initGame = () => {
    const shuffled = [...EMOJIS, ...EMOJIS]
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

  useEffect(() => {
    initGame();
  }, []);

  useEffect(() => {
    if (flippedCards.length === 2) {
      const [first, second] = flippedCards;
      
      if (cards[first].emoji === cards[second].emoji) {
        // Match found
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
  }, [flippedCards, cards]);

  useEffect(() => {
    if (cards.length > 0 && cards.every(c => c.isMatched)) {
      setIsComplete(true);
    }
  }, [cards]);

  const handleCardClick = (index: number) => {
    if (
      flippedCards.length >= 2 ||
      cards[index].isFlipped ||
      cards[index].isMatched
    ) return;

    setCards(prev => prev.map((card, i) => 
      i === index ? { ...card, isFlipped: true } : card
    ));
    setFlippedCards(prev => [...prev, index]);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-center">
        {isComplete ? (
          <p className="text-sm font-medium">🎉 Hoàn thành với {moves} lượt!</p>
        ) : (
          <p className="text-xs text-muted-foreground">Lượt: {moves}</p>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1.5">
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

      <Button variant="ghost" size="sm" onClick={initGame} className="gap-1.5 h-7 text-xs">
        <RefreshCw className="w-3 h-3" />
        Chơi lại
      </Button>
    </div>
  );
};

export default MemoryCard;
