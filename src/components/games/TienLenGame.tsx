import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trophy, Play, SkipForward, User, Bot, Crown } from "lucide-react";
import { useGameSound } from "@/hooks/useGameSound";
import { useGameLeaderboard } from "@/hooks/useGameLeaderboard";
import LeaderboardDisplay from "./LeaderboardDisplay";
import DifficultySelector, { Difficulty } from "./DifficultySelector";

// Card types
type Suit = "spade" | "club" | "diamond" | "heart";
type Rank = "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2";

interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

type CombinationType = 
  | "single" 
  | "pair" 
  | "triple" 
  | "straight" 
  | "straight_pair" 
  | "four_of_a_kind";

interface Combination {
  type: CombinationType;
  cards: Card[];
  value: number;
}

// Constants
const SUITS: Suit[] = ["spade", "club", "diamond", "heart"];
const RANKS: Rank[] = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"];

const SUIT_SYMBOLS: Record<Suit, string> = {
  spade: "♠",
  club: "♣",
  diamond: "♦",
  heart: "♥",
};

const SUIT_COLORS: Record<Suit, string> = {
  spade: "text-foreground",
  club: "text-foreground",
  diamond: "text-red-500",
  heart: "text-red-500",
};

// Get card value for comparison (3 is lowest, 2 is highest)
const getCardValue = (card: Card): number => {
  const rankValue = RANKS.indexOf(card.rank);
  const suitValue = SUITS.indexOf(card.suit);
  return rankValue * 4 + suitValue;
};

// Create deck
const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}-${suit}` });
    }
  }
  return deck;
};

// Shuffle deck
const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Sort cards by value
const sortCards = (cards: Card[]): Card[] => {
  return [...cards].sort((a, b) => getCardValue(a) - getCardValue(b));
};

// Validate combination
const validateCombination = (cards: Card[]): Combination | null => {
  if (cards.length === 0) return null;
  
  const sorted = sortCards(cards);
  
  // Single
  if (cards.length === 1) {
    return { type: "single", cards: sorted, value: getCardValue(sorted[0]) };
  }
  
  // Pair
  if (cards.length === 2) {
    if (sorted[0].rank === sorted[1].rank) {
      return { type: "pair", cards: sorted, value: getCardValue(sorted[1]) };
    }
    return null;
  }
  
  // Triple
  if (cards.length === 3) {
    if (sorted[0].rank === sorted[1].rank && sorted[1].rank === sorted[2].rank) {
      return { type: "triple", cards: sorted, value: getCardValue(sorted[2]) };
    }
    return null;
  }
  
  // Four of a kind
  if (cards.length === 4) {
    if (sorted.every(c => c.rank === sorted[0].rank)) {
      return { type: "four_of_a_kind", cards: sorted, value: getCardValue(sorted[3]) };
    }
  }
  
  // Straight (3+ consecutive cards)
  if (cards.length >= 3) {
    const rankIndexes = sorted.map(c => RANKS.indexOf(c.rank));
    // Check if consecutive and no 2 in middle
    let isConsecutive = true;
    for (let i = 1; i < rankIndexes.length; i++) {
      if (rankIndexes[i] - rankIndexes[i - 1] !== 1 || sorted[i].rank === "2") {
        isConsecutive = false;
        break;
      }
    }
    if (isConsecutive && sorted[0].rank !== "2") {
      return { type: "straight", cards: sorted, value: getCardValue(sorted[sorted.length - 1]) };
    }
  }
  
  // Straight pairs (3+ consecutive pairs)
  if (cards.length >= 6 && cards.length % 2 === 0) {
    const pairs: Card[][] = [];
    for (let i = 0; i < sorted.length; i += 2) {
      if (sorted[i].rank === sorted[i + 1]?.rank) {
        pairs.push([sorted[i], sorted[i + 1]]);
      } else {
        break;
      }
    }
    if (pairs.length * 2 === cards.length) {
      const pairRanks = pairs.map(p => RANKS.indexOf(p[0].rank));
      let isConsecutive = true;
      for (let i = 1; i < pairRanks.length; i++) {
        if (pairRanks[i] - pairRanks[i - 1] !== 1 || pairs[i][0].rank === "2") {
          isConsecutive = false;
          break;
        }
      }
      if (isConsecutive && pairs[0][0].rank !== "2") {
        return { type: "straight_pair", cards: sorted, value: getCardValue(sorted[sorted.length - 1]) };
      }
    }
  }
  
  return null;
};

// Check if combination can beat another
const canBeat = (newCombo: Combination, lastCombo: Combination | null): boolean => {
  if (!lastCombo) return true;
  
  // Four of a kind or straight pairs can beat a 2
  if (lastCombo.type === "single" && lastCombo.cards[0].rank === "2") {
    if (newCombo.type === "four_of_a_kind") return true;
    if (newCombo.type === "straight_pair" && newCombo.cards.length >= 6) return true;
  }
  
  // Same type, higher value
  if (newCombo.type === lastCombo.type && newCombo.cards.length === lastCombo.cards.length) {
    return newCombo.value > lastCombo.value;
  }
  
  return false;
};

// Find best play for AI
const findBestPlay = (hand: Card[], lastCombo: Combination | null, difficulty: Difficulty): Card[] | null => {
  if (hand.length === 0) return null;
  
  const sorted = sortCards(hand);
  const allCombinations: Combination[] = [];
  
  // Generate all possible combinations
  // Singles
  for (const card of sorted) {
    const combo = validateCombination([card]);
    if (combo && (!lastCombo || canBeat(combo, lastCombo))) {
      allCombinations.push(combo);
    }
  }
  
  // Pairs
  for (let i = 0; i < sorted.length - 1; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const combo = validateCombination([sorted[i], sorted[j]]);
      if (combo && (!lastCombo || canBeat(combo, lastCombo))) {
        allCombinations.push(combo);
      }
    }
  }
  
  // Triples
  for (let i = 0; i < sorted.length - 2; i++) {
    for (let j = i + 1; j < sorted.length - 1; j++) {
      for (let k = j + 1; k < sorted.length; k++) {
        const combo = validateCombination([sorted[i], sorted[j], sorted[k]]);
        if (combo && (!lastCombo || canBeat(combo, lastCombo))) {
          allCombinations.push(combo);
        }
      }
    }
  }
  
  // Straights (3-12 cards)
  for (let len = 3; len <= Math.min(12, sorted.length); len++) {
    for (let i = 0; i <= sorted.length - len; i++) {
      const cards = sorted.slice(i, i + len);
      const combo = validateCombination(cards);
      if (combo && combo.type === "straight" && (!lastCombo || canBeat(combo, lastCombo))) {
        allCombinations.push(combo);
      }
    }
  }
  
  // Four of a kind
  if (sorted.length >= 4) {
    const rankGroups = new Map<Rank, Card[]>();
    for (const card of sorted) {
      const group = rankGroups.get(card.rank) || [];
      group.push(card);
      rankGroups.set(card.rank, group);
    }
    for (const [, cards] of rankGroups) {
      if (cards.length === 4) {
        const combo = validateCombination(cards);
        if (combo && (!lastCombo || canBeat(combo, lastCombo))) {
          allCombinations.push(combo);
        }
      }
    }
  }
  
  if (allCombinations.length === 0) return null;
  
  // AI strategy based on difficulty
  if (difficulty === "easy") {
    // Random play
    const idx = Math.floor(Math.random() * allCombinations.length);
    return allCombinations[idx].cards;
  } else if (difficulty === "medium") {
    // Play lowest valid combination 70% of time
    if (Math.random() < 0.7) {
      allCombinations.sort((a, b) => a.value - b.value);
      return allCombinations[0].cards;
    } else {
      const idx = Math.floor(Math.random() * allCombinations.length);
      return allCombinations[idx].cards;
    }
  } else {
    // Hard: Always play smartest
    allCombinations.sort((a, b) => a.value - b.value);
    // Prefer playing pairs/triples over singles
    const preferredTypes = allCombinations.filter(c => c.type !== "single" || hand.length <= 3);
    if (preferredTypes.length > 0) {
      return preferredTypes[0].cards;
    }
    return allCombinations[0].cards;
  }
};

// Player names
const PLAYER_NAMES = ["Bạn", "Bot 1", "Bot 2", "Bot 3"];

const TienLenGame = () => {
  const [hands, setHands] = useState<Card[][]>([[], [], [], []]);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [lastPlayedCards, setLastPlayedCards] = useState<Card[]>([]);
  const [lastPlayedBy, setLastPlayedBy] = useState<number | null>(null);
  const [passedPlayers, setPassedPlayers] = useState<Set<number>>(new Set());
  const [gamePhase, setGamePhase] = useState<"setup" | "dealing" | "playing" | "ended">("setup");
  const [winner, setWinner] = useState<number | null>(null);
  const [rankings, setRankings] = useState<number[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [dealingCardIndex, setDealingCardIndex] = useState(0);
  const [message, setMessage] = useState("");
  
  const { playSound } = useGameSound();
  const { leaderboard, addScore } = useGameLeaderboard("tienlen" as any);

  // Deal cards with animation
  const dealCards = useCallback(() => {
    setGamePhase("dealing");
    setSelectedCards(new Set());
    setLastPlayedCards([]);
    setLastPlayedBy(null);
    setPassedPlayers(new Set());
    setWinner(null);
    setRankings([]);
    setMessage("");
    setDealingCardIndex(0);
    
    const deck = shuffleDeck(createDeck());
    const newHands: Card[][] = [[], [], [], []];
    
    // Animate dealing
    let cardIndex = 0;
    const dealInterval = setInterval(() => {
      if (cardIndex >= 52) {
        clearInterval(dealInterval);
        // Sort all hands and find first player
        const sortedHands = newHands.map(h => sortCards(h));
        setHands(sortedHands);
        
        // Find player with 3 of spades
        let firstPlayer = 0;
        for (let i = 0; i < 4; i++) {
          if (sortedHands[i].some(c => c.rank === "3" && c.suit === "spade")) {
            firstPlayer = i;
            break;
          }
        }
        setCurrentPlayer(firstPlayer);
        setGamePhase("playing");
        playSound("win");
        return;
      }
      
      const playerIdx = cardIndex % 4;
      newHands[playerIdx].push(deck[cardIndex]);
      setHands([...newHands.map(h => sortCards(h))]);
      setDealingCardIndex(cardIndex);
      playSound("click");
      cardIndex++;
    }, 30);
    
    return () => clearInterval(dealInterval);
  }, [playSound]);

  // Start game handler
  const startGame = () => {
    dealCards();
  };

  // Reset to setup
  const resetToSetup = () => {
    setGamePhase("setup");
    setHands([[], [], [], []]);
    setSelectedCards(new Set());
    setLastPlayedCards([]);
    setLastPlayedBy(null);
    setPassedPlayers(new Set());
    setWinner(null);
    setRankings([]);
    setMessage("");
  };

  // Bot play
  useEffect(() => {
    if (gamePhase !== "playing" || currentPlayer === 0 || winner !== null) return;
    
    const timeout = setTimeout(() => {
      const hand = hands[currentPlayer];
      const lastCombo = lastPlayedCards.length > 0 ? validateCombination(lastPlayedCards) : null;
      
      // Check if this player was the last to play
      if (lastPlayedBy === currentPlayer) {
        setLastPlayedCards([]);
        setLastPlayedBy(null);
        setPassedPlayers(new Set());
      }
      
      const canPlay = lastPlayedBy !== currentPlayer;
      const play = canPlay ? findBestPlay(hand, lastCombo, difficulty) : null;
      
      if (play && play.length > 0) {
        playSound("move");
        const newHand = hand.filter(c => !play.some(p => p.id === c.id));
        const newHands = [...hands];
        newHands[currentPlayer] = newHand;
        setHands(newHands);
        setLastPlayedCards(play);
        setLastPlayedBy(currentPlayer);
        setPassedPlayers(new Set());
        setMessage(`${PLAYER_NAMES[currentPlayer]} đánh ${play.length} lá`);
        
        // Check win
        if (newHand.length === 0) {
          if (winner === null) {
            setWinner(currentPlayer);
            setRankings(prev => [...prev, currentPlayer]);
            playSound("lose");
          }
        }
      } else {
        // Pass
        playSound("click");
        setPassedPlayers(prev => new Set([...prev, currentPlayer]));
        setMessage(`${PLAYER_NAMES[currentPlayer]} bỏ lượt`);
      }
      
      // Next player
      const activePlayers = [0, 1, 2, 3].filter(i => hands[i].length > 0 && !rankings.includes(i));
      if (activePlayers.length <= 1) {
        setGamePhase("ended");
        if (winner === null) {
          setWinner(activePlayers[0] ?? 0);
        }
        return;
      }
      
      let next = (currentPlayer + 1) % 4;
      while (hands[next].length === 0 || rankings.includes(next)) {
        next = (next + 1) % 4;
      }
      setCurrentPlayer(next);
    }, 800 + Math.random() * 400);
    
    return () => clearTimeout(timeout);
  }, [currentPlayer, gamePhase, hands, lastPlayedCards, lastPlayedBy, difficulty, playSound, winner, rankings]);

  // Player actions
  const toggleCard = (cardId: string) => {
    if (currentPlayer !== 0 || gamePhase !== "playing") return;
    
    playSound("click");
    const newSelected = new Set(selectedCards);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      newSelected.add(cardId);
    }
    setSelectedCards(newSelected);
  };

  const playCards = () => {
    if (currentPlayer !== 0 || gamePhase !== "playing") return;
    
    const cards = hands[0].filter(c => selectedCards.has(c.id));
    const combo = validateCombination(cards);
    
    if (!combo) {
      playSound("lose");
      setMessage("Bộ bài không hợp lệ!");
      return;
    }
    
    const lastCombo = lastPlayedCards.length > 0 ? validateCombination(lastPlayedCards) : null;
    
    if (lastPlayedBy !== 0 && !canBeat(combo, lastCombo)) {
      playSound("lose");
      setMessage("Bộ bài không đủ lớn!");
      return;
    }
    
    playSound("move");
    const newHand = hands[0].filter(c => !selectedCards.has(c.id));
    const newHands = [...hands];
    newHands[0] = newHand;
    setHands(newHands);
    setSelectedCards(new Set());
    setLastPlayedCards(cards);
    setLastPlayedBy(0);
    setPassedPlayers(new Set());
    setMessage("");
    
    // Check win
    if (newHand.length === 0) {
      setWinner(0);
      setRankings(prev => [...prev, 0]);
      playSound("win");
      addScore(100);
      setGamePhase("ended");
      return;
    }
    
    // Next player
    let next = 1;
    while (hands[next].length === 0 || rankings.includes(next)) {
      next = (next + 1) % 4;
      if (next === 0) break;
    }
    setCurrentPlayer(next);
  };

  const pass = () => {
    if (currentPlayer !== 0 || gamePhase !== "playing") return;
    if (lastPlayedBy === 0 || lastPlayedCards.length === 0) {
      setMessage("Bạn phải đánh bài!");
      return;
    }
    
    playSound("click");
    setPassedPlayers(prev => new Set([...prev, 0]));
    setSelectedCards(new Set());
    setMessage("");
    
    let next = 1;
    while (hands[next].length === 0 || rankings.includes(next)) {
      next = (next + 1) % 4;
      if (next === 0) break;
    }
    setCurrentPlayer(next);
  };

  // Clear message
  useEffect(() => {
    if (message && gamePhase === "playing") {
      const timer = setTimeout(() => setMessage(""), 2000);
      return () => clearTimeout(timer);
    }
  }, [message, gamePhase]);

  // Render card
  const renderCard = (card: Card, isSelected: boolean, onClick?: () => void, small = false) => {
    const size = small ? "w-8 h-12" : "w-10 h-14";
    const textSize = small ? "text-[10px]" : "text-xs";
    
    return (
      <motion.div
        key={card.id}
        layout
        initial={{ scale: 0, rotateY: 180 }}
        animate={{ 
          scale: 1, 
          rotateY: 0,
          y: isSelected ? -8 : 0,
        }}
        exit={{ scale: 0, opacity: 0 }}
        whileHover={onClick ? { y: -4, scale: 1.05 } : {}}
        whileTap={onClick ? { scale: 0.95 } : {}}
        onClick={onClick}
        className={`${size} rounded-md flex flex-col items-center justify-center cursor-pointer select-none ${
          isSelected 
            ? "bg-primary/20 ring-2 ring-primary" 
            : "bg-card border border-border shadow-sm"
        } ${onClick ? "hover:shadow-md transition-shadow" : ""}`}
      >
        <span className={`${textSize} font-bold ${SUIT_COLORS[card.suit]}`}>
          {card.rank}
        </span>
        <span className={`${textSize} ${SUIT_COLORS[card.suit]}`}>
          {SUIT_SYMBOLS[card.suit]}
        </span>
      </motion.div>
    );
  };

  // Render opponent hand (back of cards)
  const renderOpponentHand = (playerIdx: number) => {
    const count = hands[playerIdx]?.length || 0;
    const isActive = currentPlayer === playerIdx && gamePhase === "playing";
    
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1">
          <Bot className="w-3 h-3 text-muted-foreground" />
          <span className={`text-[10px] ${isActive ? "text-primary font-bold" : "text-muted-foreground"}`}>
            {PLAYER_NAMES[playerIdx]}
          </span>
          {rankings.includes(playerIdx) && (
            <Badge variant="secondary" className="text-[8px] px-1 py-0">
              #{rankings.indexOf(playerIdx) + 1}
            </Badge>
          )}
        </div>
        <div className="flex -space-x-4">
          {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-6 h-9 rounded-sm bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-400/50 shadow-sm"
            />
          ))}
          {count > 8 && (
            <div className="w-6 h-9 rounded-sm bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
              +{count - 8}
            </div>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">{count} lá</span>
      </div>
    );
  };

  // Setup screen
  if (gamePhase === "setup") {
    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto py-4">
        <div className="text-center mb-2">
          <h3 className="text-lg font-bold mb-1">🃏 Tiến Lên Miền Nam</h3>
          <p className="text-xs text-muted-foreground">Đấu với 3 Bot AI</p>
        </div>
        
        <div className="bg-card border rounded-xl p-4 w-full">
          <h4 className="text-sm font-medium mb-3 text-center">Chọn độ khó Bot</h4>
          <DifficultySelector 
            value={difficulty} 
            onChange={setDifficulty} 
          />
        </div>

        <Button
          onClick={startGame}
          className="gap-2 w-full max-w-[200px]"
        >
          <Play className="w-4 h-4" />
          Bắt đầu chơi
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowLeaderboard(true)}
          className="gap-1.5 text-xs"
        >
          <Trophy className="w-3 h-3" />
          Bảng xếp hạng
        </Button>

        <LeaderboardDisplay
          isOpen={showLeaderboard}
          onClose={() => setShowLeaderboard(false)}
          leaderboard={leaderboard}
          title="Bảng xếp hạng Tiến lên"
          scoreLabel="Điểm"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between w-full px-1">
        <DifficultySelector 
          value={difficulty} 
          onChange={setDifficulty} 
          disabled={true}
          compact
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setShowLeaderboard(true)}
        >
          <Trophy className="w-3 h-3" />
        </Button>
      </div>

      {/* Game table */}
      <div className="relative w-full bg-green-800/30 dark:bg-green-900/20 rounded-xl p-3 min-h-[280px]">
        {/* Opponents */}
        <div className="flex justify-between mb-4">
          {renderOpponentHand(1)}
          {renderOpponentHand(2)}
          {renderOpponentHand(3)}
        </div>

        {/* Center - Last played cards */}
        <div className="flex flex-col items-center justify-center min-h-[80px] my-2">
          <AnimatePresence mode="wait">
            {lastPlayedCards.length > 0 && (
              <motion.div
                key={lastPlayedCards.map(c => c.id).join("-")}
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                className="flex gap-1"
              >
                {lastPlayedCards.map(card => renderCard(card, false, undefined, true))}
              </motion.div>
            )}
          </AnimatePresence>
          {lastPlayedBy !== null && (
            <span className="text-[10px] text-muted-foreground mt-1">
              {PLAYER_NAMES[lastPlayedBy]}
            </span>
          )}
        </div>

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/90 px-3 py-1.5 rounded-lg shadow-lg"
            >
              <span className="text-xs font-medium">{message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player hand */}
        <div className="flex flex-col items-center gap-2 mt-4">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 text-primary" />
            <span className={`text-[10px] ${currentPlayer === 0 && gamePhase === "playing" ? "text-primary font-bold" : "text-muted-foreground"}`}>
              {PLAYER_NAMES[0]} • {hands[0]?.length || 0} lá
            </span>
            {currentPlayer === 0 && gamePhase === "playing" && (
              <Badge variant="default" className="text-[8px] px-1 py-0 animate-pulse">
                Lượt của bạn
              </Badge>
            )}
          </div>
          
          <div className="flex flex-wrap justify-center gap-1 max-w-full">
            <AnimatePresence>
              {hands[0]?.map(card => renderCard(
                card,
                selectedCards.has(card.id),
                () => toggleCard(card.id)
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={playCards}
          disabled={currentPlayer !== 0 || gamePhase !== "playing" || selectedCards.size === 0}
          className="gap-1 h-8 text-xs"
        >
          <Play className="w-3 h-3" />
          Đánh ({selectedCards.size})
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={pass}
          disabled={currentPlayer !== 0 || gamePhase !== "playing" || lastPlayedBy === 0 || lastPlayedCards.length === 0}
          className="gap-1 h-8 text-xs"
        >
          <SkipForward className="w-3 h-3" />
          Bỏ lượt
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={resetToSetup}
          className="gap-1 h-8 text-xs"
        >
          <RefreshCw className="w-3 h-3" />
          Ván mới
        </Button>
      </div>

      {/* Game over overlay */}
      <AnimatePresence>
        {gamePhase === "ended" && winner !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-card p-6 rounded-xl shadow-xl text-center"
            >
              <Crown className={`w-12 h-12 mx-auto mb-2 ${winner === 0 ? "text-yellow-500" : "text-muted-foreground"}`} />
              <h3 className="text-lg font-bold mb-1">
                {winner === 0 ? "🎉 Bạn thắng!" : `${PLAYER_NAMES[winner]} thắng!`}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {winner === 0 ? "Xuất sắc! Bạn đã về nhất!" : "Cố gắng hơn ở ván sau nhé!"}
              </p>
              <Button onClick={resetToSetup} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Chơi lại
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dealing animation */}
      <AnimatePresence>
        {gamePhase === "dealing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-xl"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"
              />
              <span className="text-xs text-muted-foreground">Đang chia bài... {dealingCardIndex + 1}/52</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LeaderboardDisplay
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        leaderboard={leaderboard}
        title="Bảng xếp hạng Tiến lên"
        scoreLabel="Điểm"
      />
    </div>
  );
};

export default TienLenGame;
