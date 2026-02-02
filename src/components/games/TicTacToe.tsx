import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

type Player = "X" | "O" | null;

const TicTacToe = () => {
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<Player>(null);

  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6] // diagonals
  ];

  const checkWinner = (newBoard: Player[]): Player => {
    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
        return newBoard[a];
      }
    }
    return null;
  };

  const getEmptyCells = (board: Player[]) => 
    board.map((cell, i) => cell === null ? i : -1).filter(i => i !== -1);

  const minimax = (board: Player[], isMaximizing: boolean): number => {
    const winner = checkWinner(board);
    if (winner === "O") return 10;
    if (winner === "X") return -10;
    if (getEmptyCells(board).length === 0) return 0;

    if (isMaximizing) {
      let best = -Infinity;
      for (const i of getEmptyCells(board)) {
        board[i] = "O";
        best = Math.max(best, minimax(board, false));
        board[i] = null;
      }
      return best;
    } else {
      let best = Infinity;
      for (const i of getEmptyCells(board)) {
        board[i] = "X";
        best = Math.min(best, minimax(board, true));
        board[i] = null;
      }
      return best;
    }
  };

  const getBestMove = (board: Player[]): number => {
    let bestScore = -Infinity;
    let bestMove = -1;
    
    for (const i of getEmptyCells(board)) {
      board[i] = "O";
      const score = minimax(board, false);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
    return bestMove;
  };

  const handleClick = (index: number) => {
    if (board[index] || gameOver || !isPlayerTurn) return;

    const newBoard = [...board];
    newBoard[index] = "X";
    setBoard(newBoard);

    const playerWin = checkWinner(newBoard);
    if (playerWin) {
      setWinner(playerWin);
      setGameOver(true);
      return;
    }

    if (getEmptyCells(newBoard).length === 0) {
      setGameOver(true);
      return;
    }

    setIsPlayerTurn(false);

    // AI move
    setTimeout(() => {
      const aiMove = getBestMove([...newBoard]);
      if (aiMove !== -1) {
        newBoard[aiMove] = "O";
        setBoard([...newBoard]);

        const aiWin = checkWinner(newBoard);
        if (aiWin) {
          setWinner(aiWin);
          setGameOver(true);
        } else if (getEmptyCells(newBoard).length === 0) {
          setGameOver(true);
        }
      }
      setIsPlayerTurn(true);
    }, 300);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsPlayerTurn(true);
    setGameOver(false);
    setWinner(null);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-center">
        {gameOver ? (
          <p className="text-sm font-medium">
            {winner === "X" ? "🎉 Bạn thắng!" : winner === "O" ? "🤖 Máy thắng!" : "🤝 Hòa!"}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {isPlayerTurn ? "Lượt của bạn (X)" : "Máy đang suy nghĩ..."}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5 bg-muted rounded-lg p-1.5">
        {board.map((cell, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: cell ? 1 : 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleClick(i)}
            className={`w-12 h-12 rounded-md flex items-center justify-center text-xl font-bold transition-colors ${
              cell ? "bg-card" : "bg-card hover:bg-accent"
            }`}
          >
            {cell === "X" && <span className="text-primary">X</span>}
            {cell === "O" && <span className="text-destructive">O</span>}
          </motion.button>
        ))}
      </div>

      <Button variant="ghost" size="sm" onClick={resetGame} className="gap-1.5 h-7 text-xs">
        <RefreshCw className="w-3 h-3" />
        Chơi lại
      </Button>
    </div>
  );
};

export default TicTacToe;
