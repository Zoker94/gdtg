import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trophy, Circle, CircleDot, RotateCcw, Smartphone, Maximize2, Minimize2, Bot, User } from "lucide-react";
import { useGameSound } from "@/hooks/useGameSound";
import { useGameLeaderboard } from "@/hooks/useGameLeaderboard";
import { useIsMobile } from "@/hooks/use-mobile";
import LeaderboardDisplay from "./LeaderboardDisplay";

// Hook to detect orientation
const useOrientation = () => {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  return isPortrait;
};

// Some phones in landscape exceed 768px CSS width, so `useIsMobile()` becomes false.
// Detect handheld devices by coarse pointer (touch) as a fallback.
const useIsCoarsePointer = () => {
  const [isCoarse, setIsCoarse] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(pointer: coarse)");
    const onChange = () => setIsCoarse(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isCoarse;
};

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  number: number;
  isPocketed: boolean;
  isStriped: boolean;
}

interface Pocket {
  x: number;
  y: number;
  radius: number;
}

type PlayerType = "solid" | "stripe" | null;
type Turn = "player" | "ai";

const BALL_RADIUS = 7;
const FRICTION = 0.985;
const POCKET_RADIUS = 11;
const MIN_VELOCITY = 0.08;
const MAX_POWER = 15;

const BALL_COLORS: { [key: number]: { color: string; striped: boolean } } = {
  0: { color: "#FFFFFF", striped: false },
  1: { color: "#FFD700", striped: false },
  2: { color: "#0000FF", striped: false },
  3: { color: "#FF0000", striped: false },
  4: { color: "#800080", striped: false },
  5: { color: "#FF8C00", striped: false },
  6: { color: "#006400", striped: false },
  7: { color: "#8B0000", striped: false },
  8: { color: "#000000", striped: false },
  9: { color: "#FFD700", striped: true },
  10: { color: "#0000FF", striped: true },
  11: { color: "#FF0000", striped: true },
  12: { color: "#800080", striped: true },
  13: { color: "#FF8C00", striped: true },
  14: { color: "#006400", striped: true },
  15: { color: "#8B0000", striped: true },
};

const Pool8Ball = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [pockets, setPockets] = useState<Pocket[]>([]);
  const [isAiming, setIsAiming] = useState(false);
  const [aimStart, setAimStart] = useState({ x: 0, y: 0 });
  const [aimEnd, setAimEnd] = useState({ x: 0, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [pocketedBalls, setPocketedBalls] = useState<number[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [message, setMessage] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Game rules state
  const [playerType, setPlayerType] = useState<PlayerType>(null);
  const [aiType, setAiType] = useState<PlayerType>(null);
  const [foulMessage, setFoulMessage] = useState("");
  const [shotInProgress, setShotInProgress] = useState(false);
  const [firstHitBall, setFirstHitBall] = useState<number | null>(null);
  const [gameWon, setGameWon] = useState(false);
  const [currentTurn, setCurrentTurn] = useState<Turn>("player");
  const [pocketedThisTurn, setPocketedThisTurn] = useState<number[]>([]);
  const [aiThinking, setAiThinking] = useState(false);

  const { playSound } = useGameSound();
  const { leaderboard, addScore } = useGameLeaderboard("pool");
  const isMobile = useIsMobile();
  const isCoarsePointer = useIsCoarsePointer();
  const isPortrait = useOrientation();
  const isHandheld = isMobile || isCoarsePointer;

  const tableWidth = 360;
  const tableHeight = 200;
  const padding = 20;

  // Check if player has cleared all their balls
  const hasPlayerClearedBalls = useCallback((type: PlayerType, currentBalls: Ball[]) => {
    if (!type) return false;
    const playerBalls = currentBalls.filter(b => {
      if (type === "solid") return b.number >= 1 && b.number <= 7;
      return b.number >= 9 && b.number <= 15;
    });
    return playerBalls.every(b => b.isPocketed);
  }, []);

  const initGame = useCallback(() => {
    const newBalls: Ball[] = [];
    
    // Cue ball
    newBalls.push({
      x: padding + 60,
      y: tableHeight / 2 + padding,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      color: BALL_COLORS[0].color,
      number: 0,
      isPocketed: false,
      isStriped: false,
    });

    // Rack position
    const rackX = padding + tableWidth - 80;
    const rackY = tableHeight / 2 + padding;
    const spacing = BALL_RADIUS * 2.2;

    // Triangle rack formation
    const rackOrder = [1, 9, 2, 10, 8, 11, 3, 12, 4, 13, 5, 14, 6, 15, 7];
    let ballIndex = 0;
    
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {
        if (ballIndex >= rackOrder.length) break;
        const num = rackOrder[ballIndex];
        const x = rackX + row * spacing * 0.866;
        const y = rackY + (col - row / 2) * spacing;
        
        newBalls.push({
          x,
          y,
          vx: 0,
          vy: 0,
          radius: BALL_RADIUS,
          color: BALL_COLORS[num].color,
          number: num,
          isPocketed: false,
          isStriped: BALL_COLORS[num].striped,
        });
        ballIndex++;
      }
    }

    // Create pockets
    const newPockets: Pocket[] = [
      { x: padding, y: padding, radius: POCKET_RADIUS },
      { x: padding + tableWidth / 2, y: padding - 1, radius: POCKET_RADIUS - 1 },
      { x: padding + tableWidth, y: padding, radius: POCKET_RADIUS },
      { x: padding, y: padding + tableHeight, radius: POCKET_RADIUS },
      { x: padding + tableWidth / 2, y: padding + tableHeight + 1, radius: POCKET_RADIUS - 1 },
      { x: padding + tableWidth, y: padding + tableHeight, radius: POCKET_RADIUS },
    ];

    setBalls(newBalls);
    setPockets(newPockets);
    setScore(0);
    setPocketedBalls([]);
    setGameOver(false);
    setGameWon(false);
    setMessage("");
    setPlayerType(null);
    setAiType(null);
    setFoulMessage("");
    setShotInProgress(false);
    setFirstHitBall(null);
    setCurrentTurn("player");
    setPocketedThisTurn([]);
    setAiThinking(false);
    playSound("click");
  }, [playSound]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const areBallsMoving = useCallback(() => {
    return balls.some(ball => !ball.isPocketed && (Math.abs(ball.vx) > MIN_VELOCITY || Math.abs(ball.vy) > MIN_VELOCITY));
  }, [balls]);

  // AI turn logic
  const executeAiShot = useCallback(() => {
    if (gameOver || currentTurn !== "ai") return;
    
    setAiThinking(true);
    
    setTimeout(() => {
      const cueBall = balls.find(b => b.number === 0 && !b.isPocketed);
      if (!cueBall) return;

      // Find target balls for AI
      let targetBalls = balls.filter(b => !b.isPocketed && b.number !== 0 && b.number !== 8);
      
      if (aiType === "solid") {
        targetBalls = targetBalls.filter(b => b.number >= 1 && b.number <= 7);
      } else if (aiType === "stripe") {
        targetBalls = targetBalls.filter(b => b.number >= 9 && b.number <= 15);
      }
      
      // If AI cleared their balls, target 8-ball
      if (targetBalls.length === 0 && aiType) {
        const eightBall = balls.find(b => b.number === 8 && !b.isPocketed);
        if (eightBall) targetBalls = [eightBall];
      }
      
      // If no assigned type yet, target any ball
      if (targetBalls.length === 0) {
        targetBalls = balls.filter(b => !b.isPocketed && b.number !== 0);
      }

      if (targetBalls.length === 0) return;

      // Pick random target and pocket
      const target = targetBalls[Math.floor(Math.random() * targetBalls.length)];
      const pocket = pockets[Math.floor(Math.random() * pockets.length)];
      
      // Calculate shot angle (aim at target towards pocket)
      const dx = target.x - cueBall.x;
      const dy = target.y - cueBall.y;
      const angle = Math.atan2(dy, dx);
      
      // Random power (AI is not perfect)
      const power = 5 + Math.random() * 8;
      
      playSound("whack");
      setShotInProgress(true);
      setFirstHitBall(null);
      setPocketedThisTurn([]);
      setAiThinking(false);
      
      setBalls(prev => prev.map(ball => 
        ball.number === 0 
          ? { ...ball, vx: Math.cos(angle) * power, vy: Math.sin(angle) * power }
          : ball
      ));
    }, 1000 + Math.random() * 500);
  }, [balls, pockets, aiType, currentTurn, gameOver, playSound]);

  // Trigger AI turn
  useEffect(() => {
    if (currentTurn === "ai" && !shotInProgress && !areBallsMoving() && !gameOver && !aiThinking) {
      executeAiShot();
    }
  }, [currentTurn, shotInProgress, areBallsMoving, gameOver, aiThinking, executeAiShot]);

  // Check turn end and switch
  useEffect(() => {
    if (!shotInProgress) return;
    
    const moving = areBallsMoving();
    if (!moving && shotInProgress) {
      setShotInProgress(false);
      
      // Check for fouls
      let foul = false;
      const currentPlayerType = currentTurn === "player" ? playerType : aiType;
      
      if (firstHitBall !== null && currentPlayerType !== null) {
        const hitBallNum = firstHitBall;
        
        if (currentPlayerType === "solid") {
          const cleared = hasPlayerClearedBalls("solid", balls);
          if (cleared) {
            if (hitBallNum !== 8) foul = true;
          } else {
            if (hitBallNum === 8 || hitBallNum > 8) foul = true;
          }
        } else if (currentPlayerType === "stripe") {
          const cleared = hasPlayerClearedBalls("stripe", balls);
          if (cleared) {
            if (hitBallNum !== 8) foul = true;
          } else {
            if (hitBallNum <= 8) foul = true;
          }
        }
        
        if (foul && currentTurn === "player") {
          setFoulMessage("⚠️ Phạm lỗi! Đánh sai bi");
          playSound("lose");
          setScore(s => Math.max(0, s - 5));
        }
      }
      
      // Determine next turn
      const pocketedCorrectBall = pocketedThisTurn.some(num => {
        if (currentPlayerType === "solid") return num >= 1 && num <= 7;
        if (currentPlayerType === "stripe") return num >= 9 && num <= 15;
        return num !== 0 && num !== 8; // Before assignment, any ball counts
      });
      
      // Switch turn if foul or didn't pocket correct ball
      if (foul || !pocketedCorrectBall) {
        setCurrentTurn(prev => prev === "player" ? "ai" : "player");
      }
      
      setFirstHitBall(null);
      setPocketedThisTurn([]);
    }
  }, [balls, shotInProgress, areBallsMoving, firstHitBall, playerType, aiType, currentTurn, hasPlayerClearedBalls, playSound, pocketedThisTurn]);

  // Physics update
  useEffect(() => {
    if (gameOver) return;

    const interval = setInterval(() => {
      setBalls(prevBalls => {
        let newBalls = prevBalls.map(ball => {
          if (ball.isPocketed) return ball;

          let newVx = ball.vx * FRICTION;
          let newVy = ball.vy * FRICTION;

          if (Math.abs(newVx) < MIN_VELOCITY) newVx = 0;
          if (Math.abs(newVy) < MIN_VELOCITY) newVy = 0;

          let newX = ball.x + newVx;
          let newY = ball.y + newVy;

          // Wall collision
          if (newX - ball.radius < padding) {
            newX = padding + ball.radius;
            newVx = -newVx * 0.8;
          }
          if (newX + ball.radius > padding + tableWidth) {
            newX = padding + tableWidth - ball.radius;
            newVx = -newVx * 0.8;
          }
          if (newY - ball.radius < padding) {
            newY = padding + ball.radius;
            newVy = -newVy * 0.8;
          }
          if (newY + ball.radius > padding + tableHeight) {
            newY = padding + tableHeight - ball.radius;
            newVy = -newVy * 0.8;
          }

          return { ...ball, x: newX, y: newY, vx: newVx, vy: newVy };
        });

        // Ball-to-ball collision
        for (let i = 0; i < newBalls.length; i++) {
          for (let j = i + 1; j < newBalls.length; j++) {
            const b1 = newBalls[i];
            const b2 = newBalls[j];
            if (b1.isPocketed || b2.isPocketed) continue;

            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < b1.radius + b2.radius && dist > 0) {
              playSound("click");
              
              // Track first ball hit by cue ball
              if (b1.number === 0 && firstHitBall === null) {
                setFirstHitBall(b2.number);
              } else if (b2.number === 0 && firstHitBall === null) {
                setFirstHitBall(b1.number);
              }
              
              const nx = dx / dist;
              const ny = dy / dist;
              const dvx = b1.vx - b2.vx;
              const dvy = b1.vy - b2.vy;
              const dvn = dvx * nx + dvy * ny;

              if (dvn > 0) {
                const impulse = dvn;
                newBalls[i] = { ...b1, vx: b1.vx - impulse * nx, vy: b1.vy - impulse * ny };
                newBalls[j] = { ...b2, vx: b2.vx + impulse * nx, vy: b2.vy + impulse * ny };

                const overlap = (b1.radius + b2.radius - dist) / 2;
                newBalls[i].x -= overlap * nx;
                newBalls[i].y -= overlap * ny;
                newBalls[j].x += overlap * nx;
                newBalls[j].y += overlap * ny;
              }
            }
          }
        }

        // Check pocket collisions
        let newPocketed: number[] = [];
        newBalls = newBalls.map(ball => {
          if (ball.isPocketed) return ball;

          for (const pocket of pockets) {
            const dx = ball.x - pocket.x;
            const dy = ball.y - pocket.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < pocket.radius) {
              newPocketed.push(ball.number);
              
              if (ball.number === 0) {
                playSound("lose");
                if (currentTurn === "player") {
                  setFoulMessage("⚠️ Phạm lỗi! Bi trắng vào lỗ");
                  setScore(s => Math.max(0, s - 5));
                }
                return {
                  ...ball,
                  x: padding + 60,
                  y: tableHeight / 2 + padding,
                  vx: 0,
                  vy: 0,
                };
              } else if (ball.number === 8) {
                const shooter = currentTurn;
                const shooterType = shooter === "player" ? playerType : aiType;
                const shooterCleared = hasPlayerClearedBalls(shooterType, newBalls);
                
                if (shooterCleared) {
                  if (shooter === "player") {
                    playSound("win");
                    setGameOver(true);
                    setGameWon(true);
                    setMessage("🏆 Chiến thắng! Bạn đã thắng!");
                    setScore(s => s + 100);
                  } else {
                    playSound("lose");
                    setGameOver(true);
                    setGameWon(false);
                    setMessage("💀 Thua cuộc! Máy thắng!");
                  }
                } else {
                  if (shooter === "player") {
                    playSound("lose");
                    setGameOver(true);
                    setGameWon(false);
                    setMessage("💀 Thua! Đánh bi 8 sớm");
                  } else {
                    playSound("win");
                    setGameOver(true);
                    setGameWon(true);
                    setMessage("🏆 Thắng! Máy đánh bi 8 sớm");
                    setScore(s => s + 50);
                  }
                }
              } else {
                playSound("match");
                
                // Assign types on first pocket
                if (playerType === null && currentTurn === "player") {
                  const newType: PlayerType = ball.number >= 1 && ball.number <= 7 ? "solid" : "stripe";
                  setPlayerType(newType);
                  setAiType(newType === "solid" ? "stripe" : "solid");
                  setMessage(newType === "solid" ? "🔵 Bạn: ĐẶC | 🟠 Máy: SỌC" : "🟠 Bạn: SỌC | 🔵 Máy: ĐẶC");
                } else if (playerType === null && currentTurn === "ai") {
                  const newType: PlayerType = ball.number >= 1 && ball.number <= 7 ? "solid" : "stripe";
                  setAiType(newType);
                  setPlayerType(newType === "solid" ? "stripe" : "solid");
                  setMessage(newType === "solid" ? "🔵 Máy: ĐẶC | 🟠 Bạn: SỌC" : "🟠 Máy: SỌC | 🔵 Bạn: ĐẶC");
                }
                
                if (currentTurn === "player") {
                  const isCorrect = playerType === null || 
                    (playerType === "solid" && ball.number >= 1 && ball.number <= 7) ||
                    (playerType === "stripe" && ball.number >= 9 && ball.number <= 15);
                  setScore(s => s + (isCorrect ? 15 : 5));
                }
              }
              
              return { ...ball, isPocketed: true, vx: 0, vy: 0 };
            }
          }
          return ball;
        });

        if (newPocketed.length > 0) {
          setPocketedBalls(prev => [...prev, ...newPocketed.filter(n => n !== 0)]);
          setPocketedThisTurn(prev => [...prev, ...newPocketed.filter(n => n !== 0)]);
        }

        return newBalls;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [pockets, gameOver, playSound, playerType, aiType, hasPlayerClearedBalls, firstHitBall, currentTurn]);

  // Save score when game ends
  useEffect(() => {
    if (gameOver && score > 0) {
      addScore(score);
    }
  }, [gameOver, score, addScore]);

  // Clear messages
  useEffect(() => {
    if (foulMessage) {
      const timer = setTimeout(() => setFoulMessage(""), 2500);
      return () => clearTimeout(timer);
    }
  }, [foulMessage]);

  useEffect(() => {
    if (message && !gameOver) {
      const timer = setTimeout(() => setMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [message, gameOver]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (areBallsMoving() || gameOver || currentTurn !== "player") return;
    
    const coords = getCanvasCoords(e);
    const cueBall = balls.find(b => b.number === 0);
    if (!cueBall) return;

    setFoulMessage("");
    setIsAiming(true);
    setAimStart({ x: cueBall.x, y: cueBall.y });
    setAimEnd(coords);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isAiming) return;
    const coords = getCanvasCoords(e);
    setAimEnd(coords);
  };

  const handleEnd = () => {
    if (!isAiming) return;
    
    const cueBall = balls.find(b => b.number === 0);
    if (!cueBall) return;

    const dx = aimStart.x - aimEnd.x;
    const dy = aimStart.y - aimEnd.y;
    const power = Math.min(Math.sqrt(dx * dx + dy * dy) / 10, MAX_POWER);

    if (power > 1) {
      const angle = Math.atan2(dy, dx);
      playSound("whack");
      
      setShotInProgress(true);
      setFirstHitBall(null);
      setPocketedThisTurn([]);
      
      setBalls(prev => prev.map(ball => 
        ball.number === 0 
          ? { ...ball, vx: Math.cos(angle) * power, vy: Math.sin(angle) * power }
          : ball
      ));
    }

    setIsAiming(false);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0d6b3d";
    ctx.fillRect(padding - 4, padding - 4, tableWidth + 8, tableHeight + 8);
    
    ctx.strokeStyle = "#4a2c1d";
    ctx.lineWidth = 6;
    ctx.strokeRect(padding - 6, padding - 6, tableWidth + 12, tableHeight + 12);

    // Draw pockets
    pockets.forEach(pocket => {
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, pocket.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#000";
      ctx.fill();
    });

    // Draw cue stick
    const cueBall = balls.find(b => b.number === 0 && !b.isPocketed);
    const ballsMoving = balls.some(ball => !ball.isPocketed && (Math.abs(ball.vx) > MIN_VELOCITY || Math.abs(ball.vy) > MIN_VELOCITY));
    
    if (cueBall && !ballsMoving && !gameOver && currentTurn === "player") {
      let aimAngle: number;
      let pullDistance: number;
      
      if (isAiming) {
        const dx = aimEnd.x - cueBall.x;
        const dy = aimEnd.y - cueBall.y;
        aimAngle = Math.atan2(dy, dx);
        pullDistance = Math.min(Math.sqrt(dx * dx + dy * dy), 80);
      } else {
        aimAngle = Math.PI;
        pullDistance = 12;
      }
      
      if (isAiming && pullDistance > 10) {
        ctx.beginPath();
        ctx.moveTo(cueBall.x, cueBall.y);
        const lineLength = 120;
        ctx.lineTo(
          cueBall.x - Math.cos(aimAngle) * lineLength,
          cueBall.y - Math.sin(aimAngle) * lineLength
        );
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const cueLength = 100;
      const cueGap = BALL_RADIUS + 2 + (isAiming ? pullDistance * 0.4 : 0);
      const cueStartX = cueBall.x + Math.cos(aimAngle) * cueGap;
      const cueStartY = cueBall.y + Math.sin(aimAngle) * cueGap;
      const cueEndX = cueStartX + Math.cos(aimAngle) * cueLength;
      const cueEndY = cueStartY + Math.sin(aimAngle) * cueLength;

      ctx.beginPath();
      ctx.moveTo(cueStartX + 1, cueStartY + 1);
      ctx.lineTo(cueEndX + 1, cueEndY + 1);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cueStartX, cueStartY);
      ctx.lineTo(cueEndX, cueEndY);
      
      const gradient = ctx.createLinearGradient(cueStartX, cueStartY, cueEndX, cueEndY);
      gradient.addColorStop(0, "#f5e6c8");
      gradient.addColorStop(0.1, "#c4a76c");
      gradient.addColorStop(0.8, "#8b6914");
      gradient.addColorStop(1, "#5c4a1f");
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cueStartX, cueStartY, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#4a90d9";
      ctx.fill();

      if (isAiming && pullDistance > 10) {
        const power = pullDistance / 80;
        const indicatorWidth = 50;
        const indicatorHeight = 5;
        const indicatorX = 8;
        const indicatorY = canvas.height - 12;

        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(indicatorX - 1, indicatorY - 1, indicatorWidth + 2, indicatorHeight + 2);
        
        const powerGradient = ctx.createLinearGradient(indicatorX, 0, indicatorX + indicatorWidth, 0);
        powerGradient.addColorStop(0, "#00ff00");
        powerGradient.addColorStop(0.5, "#ffff00");
        powerGradient.addColorStop(1, "#ff0000");
        
        ctx.fillStyle = powerGradient;
        ctx.fillRect(indicatorX, indicatorY, indicatorWidth * power, indicatorHeight);
        
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.strokeRect(indicatorX, indicatorY, indicatorWidth, indicatorHeight);
      }
    }

    // Draw balls
    balls.forEach(ball => {
      if (ball.isPocketed) return;

      ctx.beginPath();
      ctx.arc(ball.x + 1, ball.y + 1, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.fill();

      if (ball.isStriped && ball.number !== 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = ball.color;
        ctx.fillRect(ball.x - ball.radius, ball.y - ball.radius * 0.35, ball.radius * 2, ball.radius * 0.7);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(ball.x - 2, ball.y - 2, ball.radius / 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.fill();

      if (ball.number > 0) {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
        
        ctx.fillStyle = "#000";
        ctx.font = `bold ${Math.floor(ball.radius * 0.6)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ball.number.toString(), ball.x, ball.y + 0.5);
      }
    });
  }, [balls, pockets, isAiming, aimStart, aimEnd, gameOver, currentTurn]);

  const solidRemaining = balls.filter(b => b.number >= 1 && b.number <= 7 && !b.isPocketed).length;
  const stripeRemaining = balls.filter(b => b.number >= 9 && b.number <= 15 && !b.isPocketed).length;
  // Auto-enable fullscreen when handheld device is in landscape mode
  const shouldAutoFullscreen = isHandheld && !isPortrait;

  // Show rotate screen overlay on handheld portrait
  if (isHandheld && isPortrait) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center gap-4 py-8 px-4 text-center"
      >
        <motion.div
          animate={{ rotate: [0, -90, -90, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          className="relative"
        >
          <Smartphone className="w-16 h-16 text-primary" />
          <RotateCcw className="w-6 h-6 text-muted-foreground absolute -right-2 -bottom-1" />
        </motion.div>
        <div className="space-y-2">
          <p className="font-semibold text-foreground">Xoay ngang điện thoại</p>
          <p className="text-xs text-muted-foreground max-w-[200px]">
            Để chơi Bida tốt hơn, vui lòng xoay ngang điện thoại của bạn
          </p>
        </div>
      </motion.div>
    );
  }

  // Fullscreen mode (auto for mobile landscape, manual toggle for desktop)
  if (isFullscreen || shouldAutoFullscreen) {
    return (
      <AnimatePresence>
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-background flex flex-col"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {/* Fullscreen header */}
          <div className="flex items-center justify-between px-3 py-2 bg-card border-b">
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                currentTurn === "player" ? "bg-primary/20 text-primary" : "bg-muted"
              }`}>
                <User className="w-3 h-3" />
                Bạn {playerType === "solid" ? "(Đặc)" : playerType === "stripe" ? "(Sọc)" : ""}
              </div>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                currentTurn === "ai" ? "bg-destructive/20 text-destructive" : "bg-muted"
              }`}>
                <Bot className="w-3 h-3" />
                Máy {aiType === "solid" ? "(Đặc)" : aiType === "stripe" ? "(Sọc)" : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold">{score} điểm</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleFullscreen}>
                <Minimize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Game canvas - full width */}
          <div className="flex-1 min-h-0 flex items-center justify-center p-2 overflow-hidden">
            <motion.canvas
              ref={canvasRef}
              width={400}
              height={240}
              className="rounded-lg border border-border cursor-crosshair touch-none"
              style={{
                // Use dynamic viewport units to avoid browser UI bars cutting the game.
                // The wrapper is flexed with min-h-0, so 100% height here stays within visible area.
                width: "100%",
                height: "100%",
                maxWidth: "100%",
                maxHeight: "100%",
                aspectRatio: "400 / 240",
              }}
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
            />
          </div>

          {/* Messages and controls */}
          <div className="px-3 py-2 bg-card border-t flex items-center justify-between">
            <div className="flex-1">
              {(message || foulMessage || aiThinking) && (
                <p className={`text-xs font-medium ${
                  foulMessage ? "text-destructive" : aiThinking ? "text-muted-foreground" : "text-primary"
                }`}>
                  {aiThinking ? "🤖 Máy đang suy nghĩ..." : foulMessage || message}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={initGame} className="gap-1 h-7 text-xs">
              <RefreshCw className="w-3 h-3" />
              Mới
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Turn indicator */}
      <div className="flex items-center justify-between w-full px-1">
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
            currentTurn === "player" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          }`}>
            <User className="w-2.5 h-2.5" />
            Bạn
          </div>
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
            currentTurn === "ai" ? "bg-orange-500/20 text-orange-500" : "bg-muted text-muted-foreground"
          }`}>
            <Bot className="w-2.5 h-2.5" />
            Máy
          </div>
          <span className="text-xs font-bold text-foreground">{score}đ</span>
        </div>
        <div className="flex items-center gap-1">
          {isHandheld && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleFullscreen}>
              <Maximize2 className="w-3 h-3" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowLeaderboard(true)}>
            <Trophy className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Player types */}
      {playerType && (
        <div className="flex items-center gap-2 text-[10px]">
          <span className={playerType === "solid" ? "text-blue-400" : "text-orange-400"}>
            Bạn: {playerType === "solid" ? "ĐẶC (1-7)" : "SỌC (9-15)"}
          </span>
          <span className="text-muted-foreground">|</span>
          <span className={aiType === "solid" ? "text-blue-400" : "text-orange-400"}>
            Máy: {aiType === "solid" ? "ĐẶC (1-7)" : "SỌC (9-15)"}
          </span>
        </div>
      )}

      <motion.canvas
        ref={canvasRef}
        width={400}
        height={240}
        className="rounded-lg border border-border cursor-crosshair touch-none w-full max-w-full"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      {/* Messages */}
      {(message || foulMessage || aiThinking) && (
        <motion.p
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`text-xs font-medium ${
            foulMessage ? "text-destructive" : aiThinking ? "text-muted-foreground" : gameWon ? "text-green-500" : "text-primary"
          }`}
        >
          {aiThinking ? "🤖 Máy đang suy nghĩ..." : foulMessage || message}
        </motion.p>
      )}

      {/* Pocketed balls */}
      {pocketedBalls.length > 0 && (
        <div className="flex gap-0.5 flex-wrap justify-center max-w-full">
          {pocketedBalls.map((num, i) => (
            <div
              key={i}
              className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[6px] font-bold"
              style={{
                backgroundColor: BALL_COLORS[num]?.color || "#888",
                color: num === 8 ? "#fff" : "#000",
              }}
            >
              {num}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={initGame} className="gap-1.5 h-7 text-xs">
          <RefreshCw className="w-3 h-3" />
          Ván mới
        </Button>
      </div>

      <LeaderboardDisplay
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        leaderboard={leaderboard}
        title="Bảng xếp hạng Bida"
        scoreLabel="Điểm"
      />
    </div>
  );
};

export default Pool8Ball;
