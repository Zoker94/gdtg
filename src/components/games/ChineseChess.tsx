import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trophy } from "lucide-react";
import { useGameSound } from "@/hooks/useGameSound";
import { useGameLeaderboard } from "@/hooks/useGameLeaderboard";
import LeaderboardDisplay from "./LeaderboardDisplay";
import DifficultySelector, { Difficulty } from "./DifficultySelector";

// Piece types
type PieceType = "general" | "advisor" | "elephant" | "horse" | "chariot" | "cannon" | "soldier";
type PieceColor = "red" | "black";

interface Piece {
  type: PieceType;
  color: PieceColor;
}

type Board = (Piece | null)[][];

const PIECE_CHARS: Record<PieceColor, Record<PieceType, string>> = {
  red: {
    general: "帥",
    advisor: "仕",
    elephant: "相",
    horse: "馬",
    chariot: "車",
    cannon: "炮",
    soldier: "兵",
  },
  black: {
    general: "將",
    advisor: "士",
    elephant: "象",
    horse: "馬",
    chariot: "車",
    cannon: "砲",
    soldier: "卒",
  },
};

const createInitialBoard = (): Board => {
  const board: Board = Array(10).fill(null).map(() => Array(9).fill(null));
  
  // Black pieces (top)
  board[0][0] = { type: "chariot", color: "black" };
  board[0][1] = { type: "horse", color: "black" };
  board[0][2] = { type: "elephant", color: "black" };
  board[0][3] = { type: "advisor", color: "black" };
  board[0][4] = { type: "general", color: "black" };
  board[0][5] = { type: "advisor", color: "black" };
  board[0][6] = { type: "elephant", color: "black" };
  board[0][7] = { type: "horse", color: "black" };
  board[0][8] = { type: "chariot", color: "black" };
  board[2][1] = { type: "cannon", color: "black" };
  board[2][7] = { type: "cannon", color: "black" };
  board[3][0] = { type: "soldier", color: "black" };
  board[3][2] = { type: "soldier", color: "black" };
  board[3][4] = { type: "soldier", color: "black" };
  board[3][6] = { type: "soldier", color: "black" };
  board[3][8] = { type: "soldier", color: "black" };
  
  // Red pieces (bottom)
  board[9][0] = { type: "chariot", color: "red" };
  board[9][1] = { type: "horse", color: "red" };
  board[9][2] = { type: "elephant", color: "red" };
  board[9][3] = { type: "advisor", color: "red" };
  board[9][4] = { type: "general", color: "red" };
  board[9][5] = { type: "advisor", color: "red" };
  board[9][6] = { type: "elephant", color: "red" };
  board[9][7] = { type: "horse", color: "red" };
  board[9][8] = { type: "chariot", color: "red" };
  board[7][1] = { type: "cannon", color: "red" };
  board[7][7] = { type: "cannon", color: "red" };
  board[6][0] = { type: "soldier", color: "red" };
  board[6][2] = { type: "soldier", color: "red" };
  board[6][4] = { type: "soldier", color: "red" };
  board[6][6] = { type: "soldier", color: "red" };
  board[6][8] = { type: "soldier", color: "red" };
  
  return board;
};

const ChineseChess = () => {
  const [board, setBoard] = useState<Board>(createInitialBoard);
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<PieceColor | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  
  const { playSound } = useGameSound();
  const { leaderboard, addScore } = useGameLeaderboard("chess");

  // Get valid moves for a piece
  const getValidMoves = useCallback((b: Board, row: number, col: number): [number, number][] => {
    const piece = b[row][col];
    if (!piece) return [];
    
    const moves: [number, number][] = [];
    const { type, color } = piece;
    const isRed = color === "red";
    
    const inBounds = (r: number, c: number) => r >= 0 && r < 10 && c >= 0 && c < 9;
    const isEnemy = (r: number, c: number) => b[r][c] && b[r][c]!.color !== color;
    const isEmpty = (r: number, c: number) => !b[r][c];
    const canMoveTo = (r: number, c: number) => inBounds(r, c) && (isEmpty(r, c) || isEnemy(r, c));
    
    // Palace boundaries
    const inPalace = (r: number, c: number, forColor: PieceColor) => {
      if (c < 3 || c > 5) return false;
      if (forColor === "red") return r >= 7 && r <= 9;
      return r >= 0 && r <= 2;
    };
    
    switch (type) {
      case "general":
        [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
          const nr = row + dr;
          const nc = col + dc;
          if (inPalace(nr, nc, color) && canMoveTo(nr, nc)) {
            moves.push([nr, nc]);
          }
        });
        break;
        
      case "advisor":
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => {
          const nr = row + dr;
          const nc = col + dc;
          if (inPalace(nr, nc, color) && canMoveTo(nr, nc)) {
            moves.push([nr, nc]);
          }
        });
        break;
        
      case "elephant":
        [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(([dr, dc]) => {
          const nr = row + dr;
          const nc = col + dc;
          const blockR = row + dr / 2;
          const blockC = col + dc / 2;
          const inOwnSide = isRed ? nr >= 5 : nr <= 4;
          if (inBounds(nr, nc) && inOwnSide && isEmpty(blockR, blockC) && canMoveTo(nr, nc)) {
            moves.push([nr, nc]);
          }
        });
        break;
        
      case "horse":
        const horseMoves: [number, number, number, number][] = [
          [-2, -1, -1, 0], [-2, 1, -1, 0],
          [2, -1, 1, 0], [2, 1, 1, 0],
          [-1, -2, 0, -1], [1, -2, 0, -1],
          [-1, 2, 0, 1], [1, 2, 0, 1],
        ];
        horseMoves.forEach(([dr, dc, blockR, blockC]) => {
          const nr = row + dr;
          const nc = col + dc;
          if (inBounds(nr, nc) && isEmpty(row + blockR, col + blockC) && canMoveTo(nr, nc)) {
            moves.push([nr, nc]);
          }
        });
        break;
        
      case "chariot":
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          for (let i = 1; i < 10; i++) {
            const nr = row + dr * i;
            const nc = col + dc * i;
            if (!inBounds(nr, nc)) break;
            if (isEmpty(nr, nc)) {
              moves.push([nr, nc]);
            } else if (isEnemy(nr, nc)) {
              moves.push([nr, nc]);
              break;
            } else {
              break;
            }
          }
        }
        break;
        
      case "cannon":
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          let jumped = false;
          for (let i = 1; i < 10; i++) {
            const nr = row + dr * i;
            const nc = col + dc * i;
            if (!inBounds(nr, nc)) break;
            if (!jumped) {
              if (isEmpty(nr, nc)) {
                moves.push([nr, nc]);
              } else {
                jumped = true;
              }
            } else {
              if (!isEmpty(nr, nc)) {
                if (isEnemy(nr, nc)) moves.push([nr, nc]);
                break;
              }
            }
          }
        }
        break;
        
      case "soldier":
        const forward = isRed ? -1 : 1;
        const crossedRiver = isRed ? row <= 4 : row >= 5;
        
        if (inBounds(row + forward, col) && canMoveTo(row + forward, col)) {
          moves.push([row + forward, col]);
        }
        if (crossedRiver) {
          if (inBounds(row, col - 1) && canMoveTo(row, col - 1)) moves.push([row, col - 1]);
          if (inBounds(row, col + 1) && canMoveTo(row, col + 1)) moves.push([row, col + 1]);
        }
        break;
    }
    
    return moves;
  }, []);

  // Check if general is in check
  const isInCheck = useCallback((b: Board, color: PieceColor): boolean => {
    let generalPos: [number, number] | null = null;
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r][c]?.type === "general" && b[r][c]?.color === color) {
          generalPos = [r, c];
          break;
        }
      }
    }
    if (!generalPos) return true;
    
    const enemyColor = color === "red" ? "black" : "red";
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r][c]?.color === enemyColor) {
          const moves = getValidMoves(b, r, c);
          if (moves.some(([mr, mc]) => mr === generalPos![0] && mc === generalPos![1])) {
            return true;
          }
        }
      }
    }
    return false;
  }, [getValidMoves]);

  // Evaluate board for AI
  const evaluateBoard = useCallback((b: Board, diff: Difficulty): number => {
    const pieceValues: Record<PieceType, number> = {
      general: 10000,
      advisor: 20,
      elephant: 20,
      horse: 40,
      chariot: 90,
      cannon: 45,
      soldier: 10,
    };
    
    let score = 0;
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = b[r][c];
        if (piece) {
          let value = pieceValues[piece.type];
          
          // Position bonus for harder difficulties
          if (diff === "hard" || diff === "medium") {
            // Soldiers are more valuable after crossing river
            if (piece.type === "soldier") {
              const crossed = piece.color === "black" ? r >= 5 : r <= 4;
              if (crossed) value += 5;
            }
            // Central control bonus
            if (c >= 3 && c <= 5) value += 2;
          }
          
          score += piece.color === "black" ? value : -value;
        }
      }
    }
    return score;
  }, []);

  // AI move with difficulty
  const getAIMove = useCallback((b: Board, diff: Difficulty): [[number, number], [number, number]] | null => {
    const moves: { from: [number, number]; to: [number, number]; score: number }[] = [];
    
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r][c]?.color === "black") {
          const validMoves = getValidMoves(b, r, c);
          for (const [tr, tc] of validMoves) {
            const newBoard = b.map(row => [...row]);
            const captured = newBoard[tr][tc];
            newBoard[tr][tc] = newBoard[r][c];
            newBoard[r][c] = null;
            
            if (isInCheck(newBoard, "black")) continue;
            
            let score = evaluateBoard(newBoard, diff);
            
            if (captured) score += 50;
            if (isInCheck(newBoard, "red")) score += 30;
            
            // Add randomness based on difficulty
            if (diff === "easy") {
              score += Math.random() * 200 - 100;
            } else if (diff === "medium") {
              score += Math.random() * 50 - 25;
            }
            
            moves.push({ from: [r, c], to: [tr, tc], score });
          }
        }
      }
    }
    
    if (moves.length === 0) return null;
    
    moves.sort((a, b) => b.score - a.score);
    
    // Pick from top moves based on difficulty
    const topCount = diff === "easy" ? Math.min(10, moves.length) : diff === "medium" ? Math.min(5, moves.length) : Math.min(3, moves.length);
    const topMoves = moves.slice(0, topCount);
    const chosen = topMoves[Math.floor(Math.random() * topMoves.length)];
    
    return [chosen.from, chosen.to];
  }, [getValidMoves, evaluateBoard, isInCheck]);

  const handleClick = (row: number, col: number) => {
    if (gameOver || !isPlayerTurn) return;
    
    const piece = board[row][col];
    
    if (piece?.color === "red") {
      playSound("click");
      setSelectedPos([row, col]);
      setValidMoves(getValidMoves(board, row, col));
      return;
    }
    
    if (selectedPos) {
      const isValid = validMoves.some(([r, c]) => r === row && c === col);
      if (isValid) {
        const newBoard = board.map(r => [...r]);
        const captured = newBoard[row][col];
        newBoard[row][col] = newBoard[selectedPos[0]][selectedPos[1]];
        newBoard[selectedPos[0]][selectedPos[1]] = null;
        
        if (isInCheck(newBoard, "red")) {
          playSound("lose");
          return;
        }
        
        playSound(captured ? "whack" : "move");
        setBoard(newBoard);
        setSelectedPos(null);
        setValidMoves([]);
        
        if (captured?.type === "general") {
          playSound("win");
          setWinner("red");
          setGameOver(true);
          addScore(1);
          return;
        }
        
        setIsPlayerTurn(false);
        
        // AI move with delay based on difficulty
        const delay = difficulty === "hard" ? 800 : difficulty === "medium" ? 500 : 300;
        setTimeout(() => {
          const aiMove = getAIMove(newBoard, difficulty);
          if (aiMove) {
            const [[fr, fc], [tr, tc]] = aiMove;
            const aiBoard = newBoard.map(r => [...r]);
            const aiCaptured = aiBoard[tr][tc];
            aiBoard[tr][tc] = aiBoard[fr][fc];
            aiBoard[fr][fc] = null;
            
            playSound(aiCaptured ? "whack" : "move");
            setBoard(aiBoard);
            
            if (aiCaptured?.type === "general") {
              playSound("lose");
              setWinner("black");
              setGameOver(true);
              return;
            }
          } else {
            playSound("win");
            setWinner("red");
            setGameOver(true);
            addScore(1);
            return;
          }
          setIsPlayerTurn(true);
        }, delay);
      }
    }
  };

  const resetGame = () => {
    setBoard(createInitialBoard());
    setSelectedPos(null);
    setValidMoves([]);
    setIsPlayerTurn(true);
    setGameOver(false);
    setWinner(null);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-between w-full px-1">
        <div className="text-center">
          {gameOver ? (
            <p className="text-xs font-medium">
              {winner === "red" ? "🎉 Bạn thắng!" : "🤖 Máy thắng!"}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              {isPlayerTurn ? "Lượt của bạn (Đỏ)" : "Máy đang suy nghĩ..."}
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
        disabled={!gameOver && board !== createInitialBoard()}
      />

      <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-1 overflow-auto">
        <div className="relative" style={{ width: 180, height: 200 }}>
          {/* Board grid lines */}
          <svg className="absolute inset-0" width="180" height="200">
            {/* Vertical lines */}
            {Array.from({ length: 9 }).map((_, i) => (
              <line 
                key={`v${i}`}
                x1={i * 20 + 10} y1="10" 
                x2={i * 20 + 10} y2="190" 
                stroke="currentColor" 
                strokeWidth="0.5"
                className="text-amber-800 dark:text-amber-300"
              />
            ))}
            {/* Horizontal lines */}
            {Array.from({ length: 10 }).map((_, i) => (
              <line 
                key={`h${i}`}
                x1="10" y1={i * 20 + 10} 
                x2="170" y2={i * 20 + 10} 
                stroke="currentColor" 
                strokeWidth="0.5"
                className="text-amber-800 dark:text-amber-300"
              />
            ))}
            {/* River */}
            <rect x="10" y="90" width="160" height="20" fill="currentColor" className="text-amber-200/50 dark:text-amber-800/30" />
            <text x="90" y="103" textAnchor="middle" className="text-[8px] fill-amber-700 dark:fill-amber-400">楚河 漢界</text>
          </svg>
          
          {/* Pieces */}
          {board.map((row, r) =>
            row.map((piece, c) => {
              if (!piece) return null;
              const isSelected = selectedPos?.[0] === r && selectedPos?.[1] === c;
              
              return (
                <motion.button
                  key={`${r}-${c}`}
                  className={`absolute w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold border transition-all ${
                    piece.color === "red"
                      ? "bg-red-100 border-red-500 text-red-600 dark:bg-red-900/50 dark:text-red-400"
                      : "bg-gray-100 border-gray-600 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                  } ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""}`}
                  style={{
                    left: c * 20 + 1,
                    top: r * 20 + 1,
                  }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleClick(r, c)}
                >
                  {PIECE_CHARS[piece.color][piece.type]}
                </motion.button>
              );
            })
          )}
          
          {/* Valid move indicators */}
          {validMoves.map(([r, c]) => (
            <motion.div
              key={`valid-${r}-${c}`}
              className="absolute w-[18px] h-[18px] rounded-full border-2 border-dashed border-primary/50 cursor-pointer"
              style={{
                left: c * 20 + 1,
                top: r * 20 + 1,
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={() => handleClick(r, c)}
            />
          ))}
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={resetGame} className="gap-1.5 h-7 text-xs">
        <RefreshCw className="w-3 h-3" />
        Chơi lại
      </Button>

      <LeaderboardDisplay
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        leaderboard={leaderboard}
        title="Bảng xếp hạng Cờ Tướng"
        scoreLabel="Thắng"
      />
    </div>
  );
};

export default ChineseChess;
