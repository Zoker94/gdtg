import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trophy } from "lucide-react";
import { useGameSound } from "@/hooks/useGameSound";
import { useGameLeaderboard } from "@/hooks/useGameLeaderboard";
import LeaderboardDisplay from "./LeaderboardDisplay";
import DifficultySelector, { Difficulty } from "./DifficultySelector";

type Player = "X" | "O" | null;

const BOARD_SIZE = 10;
const WIN_LENGTH = 5;

const CaroGame = () => {
  const [board, setBoard] = useState<Player[]>(Array(BOARD_SIZE * BOARD_SIZE).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<Player>(null);
  const [winningCells, setWinningCells] = useState<number[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  
  const { playSound } = useGameSound();
  const { leaderboard, addScore } = useGameLeaderboard("caro");

  // Check for winner at position
  const checkWinAtPosition = useCallback((b: Player[], pos: number, player: Player): number[] | null => {
    const row = Math.floor(pos / BOARD_SIZE);
    const col = pos % BOARD_SIZE;
    
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal down-right
      [1, -1],  // diagonal down-left
    ];

    for (const [dr, dc] of directions) {
      const cells: number[] = [pos];
      
      // Check forward
      for (let i = 1; i < WIN_LENGTH; i++) {
        const nr = row + dr * i;
        const nc = col + dc * i;
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) break;
        const idx = nr * BOARD_SIZE + nc;
        if (b[idx] !== player) break;
        cells.push(idx);
      }
      
      // Check backward
      for (let i = 1; i < WIN_LENGTH; i++) {
        const nr = row - dr * i;
        const nc = col - dc * i;
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) break;
        const idx = nr * BOARD_SIZE + nc;
        if (b[idx] !== player) break;
        cells.push(idx);
      }
      
      if (cells.length >= WIN_LENGTH) {
        return cells;
      }
    }
    return null;
  }, []);

  // Evaluate a line pattern for scoring
  const evaluateLine = useCallback((b: Player[], row: number, col: number, dr: number, dc: number, player: Player): { count: number; openEnds: number; blocked: boolean } => {
    let count = 0;
    let openEnds = 0;
    let blocked = false;
    const opponent = player === "O" ? "X" : "O";

    // Check forward
    for (let i = 1; i <= 5; i++) {
      const nr = row + dr * i;
      const nc = col + dc * i;
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) {
        blocked = true;
        break;
      }
      const idx = nr * BOARD_SIZE + nc;
      if (b[idx] === player) count++;
      else if (b[idx] === opponent) {
        blocked = true;
        break;
      } else {
        openEnds++;
        break;
      }
    }

    // Check backward  
    for (let i = 1; i <= 5; i++) {
      const nr = row - dr * i;
      const nc = col - dc * i;
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) {
        blocked = true;
        break;
      }
      const idx = nr * BOARD_SIZE + nc;
      if (b[idx] === player) count++;
      else if (b[idx] === opponent) {
        blocked = true;
        break;
      } else {
        openEnds++;
        break;
      }
    }

    return { count, openEnds, blocked };
  }, []);

  // Evaluate board position for AI - MUCH smarter now
  const evaluatePosition = useCallback((b: Player[], pos: number, player: Player, diff: Difficulty): number => {
    if (b[pos] !== null) return -Infinity;
    
    const row = Math.floor(pos / BOARD_SIZE);
    const col = pos % BOARD_SIZE;
    const opponent = player === "O" ? "X" : "O";
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    
    // Simulate placing piece
    const testBoard = [...b];
    testBoard[pos] = player;
    
    let attackScore = 0;
    let defenseScore = 0;
    
    for (const [dr, dc] of directions) {
      // Check attack potential
      const attack = evaluateLine(testBoard, row, col, dr, dc, player);
      
      // WINNING MOVE - highest priority
      if (attack.count >= 4) attackScore += 100000;
      // Open four (guaranteed win next turn)
      else if (attack.count === 3 && attack.openEnds === 2) attackScore += 50000;
      // Blocked four (can still win if not blocked)
      else if (attack.count === 3 && attack.openEnds === 1) attackScore += 5000;
      // Open three (very strong)
      else if (attack.count === 2 && attack.openEnds === 2) attackScore += 2000;
      // Blocked three
      else if (attack.count === 2 && attack.openEnds === 1) attackScore += 200;
      // Open two
      else if (attack.count === 1 && attack.openEnds === 2) attackScore += 50;
      
      // Check defense - what would opponent get here?
      testBoard[pos] = opponent;
      const defense = evaluateLine(testBoard, row, col, dr, dc, opponent);
      testBoard[pos] = player;
      
      // BLOCK opponent winning move
      if (defense.count >= 4) defenseScore += 90000;
      // Block open four
      else if (defense.count === 3 && defense.openEnds === 2) defenseScore += 40000;
      // Block blocked four  
      else if (defense.count === 3 && defense.openEnds === 1) defenseScore += 4000;
      // Block open three
      else if (defense.count === 2 && defense.openEnds === 2) defenseScore += 1500;
      // Block blocked three
      else if (defense.count === 2 && defense.openEnds === 1) defenseScore += 150;
    }
    
    // Center preference
    const centerDist = Math.abs(row - BOARD_SIZE / 2) + Math.abs(col - BOARD_SIZE / 2);
    const centerBonus = Math.max(0, 20 - centerDist * 2);
    
    // Combine scores based on difficulty
    let finalScore = attackScore + defenseScore + centerBonus;
    
    // Add randomness for easier difficulties  
    if (diff === "easy") {
      finalScore += Math.random() * 3000; // Very random
    } else if (diff === "medium") {
      finalScore += Math.random() * 500; // Slightly random
    }
    // Hard: no randomness, pure strategy
    
    return finalScore;
  }, [evaluateLine]);

  // Get AI move
  const getAIMove = useCallback((b: Player[], diff: Difficulty): number => {
    let bestScore = -Infinity;
    let bestMoves: number[] = [];
    
    // Check if there are any pieces on board
    const hasAnyPiece = b.some(cell => cell !== null);
    if (!hasAnyPiece) {
      // First move: play near center
      return Math.floor(BOARD_SIZE/2) * BOARD_SIZE + Math.floor(BOARD_SIZE/2);
    }
    
    for (let i = 0; i < b.length; i++) {
      if (b[i] !== null) continue;
      
      // Only consider positions near existing pieces
      const row = Math.floor(i / BOARD_SIZE);
      const col = i % BOARD_SIZE;
      let hasNeighbor = false;
      
      const searchRange = diff === "hard" ? 2 : diff === "medium" ? 2 : 1;
      
      for (let dr = -searchRange; dr <= searchRange; dr++) {
        for (let dc = -searchRange; dc <= searchRange; dc++) {
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
            if (b[nr * BOARD_SIZE + nc] !== null) {
              hasNeighbor = true;
              break;
            }
          }
        }
        if (hasNeighbor) break;
      }
      
      if (!hasNeighbor) continue;
      
      const score = evaluatePosition(b, i, "O", diff);
      if (score > bestScore) {
        bestScore = score;
        bestMoves = [i];
      } else if (score === bestScore) {
        bestMoves.push(i);
      }
    }
    
    return bestMoves[Math.floor(Math.random() * bestMoves.length)] ?? -1;
  }, [evaluatePosition]);

  const handleClick = (index: number) => {
    if (board[index] || gameOver || !isPlayerTurn) return;

    playSound("click");
    const newBoard = [...board];
    newBoard[index] = "X";
    setBoard(newBoard);

    const playerWin = checkWinAtPosition(newBoard, index, "X");
    if (playerWin) {
      playSound("win");
      setWinningCells(playerWin);
      setWinner("X");
      setGameOver(true);
      addScore(1);
      return;
    }

    if (newBoard.every(cell => cell !== null)) {
      setGameOver(true);
      return;
    }

    setIsPlayerTurn(false);

    // AI move with delay based on difficulty
    const delay = difficulty === "hard" ? 500 : difficulty === "medium" ? 300 : 150;
    setTimeout(() => {
      const aiMove = getAIMove([...newBoard], difficulty);
      if (aiMove !== -1) {
        playSound("move");
        newBoard[aiMove] = "O";
        setBoard([...newBoard]);

        const aiWin = checkWinAtPosition(newBoard, aiMove, "O");
        if (aiWin) {
          playSound("lose");
          setWinningCells(aiWin);
          setWinner("O");
          setGameOver(true);
        } else if (newBoard.every(cell => cell !== null)) {
          setGameOver(true);
        }
      }
      setIsPlayerTurn(true);
    }, delay);
  };

  const resetGame = () => {
    setBoard(Array(BOARD_SIZE * BOARD_SIZE).fill(null));
    setIsPlayerTurn(true);
    setGameOver(false);
    setWinner(null);
    setWinningCells([]);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-between w-full px-1">
        <div className="text-center">
          {gameOver ? (
            <p className="text-xs font-medium">
              {winner === "X" ? "🎉 Bạn thắng!" : winner === "O" ? "🤖 Máy thắng!" : "🤝 Hòa!"}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              {isPlayerTurn ? "Lượt của bạn (X)" : "Máy đang suy nghĩ..."}
            </p>
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
        disabled={!isPlayerTurn || (!gameOver && board.some(c => c !== null))}
      />

      <div 
        className="bg-muted rounded-lg p-1 overflow-auto max-h-[200px]"
        style={{ touchAction: "pan-x pan-y" }}
      >
        <div 
          className="grid gap-[1px]" 
          style={{ 
            gridTemplateColumns: `repeat(${BOARD_SIZE}, 18px)`,
          }}
        >
          {board.map((cell, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleClick(i)}
              className={`w-[18px] h-[18px] rounded-[2px] flex items-center justify-center text-[10px] font-bold transition-colors ${
                winningCells.includes(i)
                  ? "bg-primary/30"
                  : cell
                  ? "bg-card"
                  : "bg-card hover:bg-accent"
              }`}
            >
              {cell === "X" && <span className="text-primary">X</span>}
              {cell === "O" && <span className="text-destructive">O</span>}
            </motion.button>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">10x10 • 5 liên tiếp để thắng</p>

      <Button variant="ghost" size="sm" onClick={resetGame} className="gap-1.5 h-7 text-xs">
        <RefreshCw className="w-3 h-3" />
        Chơi lại
      </Button>

      <LeaderboardDisplay
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        leaderboard={leaderboard}
        title="Bảng xếp hạng Caro"
        scoreLabel="Thắng"
      />
    </div>
  );
};

export default CaroGame;
