import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trophy } from "lucide-react";
import { useGameSound } from "@/hooks/useGameSound";
import { useGameLeaderboard } from "@/hooks/useGameLeaderboard";
import LeaderboardDisplay from "./LeaderboardDisplay";

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

  // Evaluate board position for AI
  const evaluatePosition = useCallback((b: Player[], pos: number, player: Player): number => {
    if (b[pos] !== null) return -1000;
    
    let score = 0;
    const row = Math.floor(pos / BOARD_SIZE);
    const col = pos % BOARD_SIZE;
    const opponent = player === "O" ? "X" : "O";
    
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    
    for (const [dr, dc] of directions) {
      let playerCount = 0;
      let opponentCount = 0;
      let openEnds = 0;
      
      // Count in both directions
      for (let dir = -1; dir <= 1; dir += 2) {
        let blocked = false;
        for (let i = 1; i <= 4; i++) {
          const nr = row + dr * i * dir;
          const nc = col + dc * i * dir;
          if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) {
            blocked = true;
            break;
          }
          const idx = nr * BOARD_SIZE + nc;
          if (b[idx] === player) playerCount++;
          else if (b[idx] === opponent) {
            opponentCount++;
            blocked = true;
            break;
          }
          else break;
        }
        if (!blocked) openEnds++;
      }
      
      // Score patterns
      if (playerCount >= 4) score += 10000;
      else if (playerCount === 3 && openEnds >= 1) score += 1000;
      else if (playerCount === 2 && openEnds >= 2) score += 100;
      else if (playerCount === 1 && openEnds >= 2) score += 10;
      
      // Defense
      if (opponentCount >= 4) score += 9000;
      else if (opponentCount === 3 && openEnds >= 1) score += 800;
      else if (opponentCount === 2 && openEnds >= 2) score += 50;
    }
    
    // Center preference
    const centerDist = Math.abs(row - BOARD_SIZE/2) + Math.abs(col - BOARD_SIZE/2);
    score += Math.max(0, 10 - centerDist);
    
    return score;
  }, []);

  // Get AI move
  const getAIMove = useCallback((b: Player[]): number => {
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
      
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
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
      
      const score = evaluatePosition(b, i, "O");
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

    // AI move
    setTimeout(() => {
      const aiMove = getAIMove([...newBoard]);
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
    }, 300);
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
