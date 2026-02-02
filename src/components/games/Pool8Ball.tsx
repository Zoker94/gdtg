import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trophy, Circle, CircleDot, RotateCcw, Smartphone } from "lucide-react";
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

const BALL_RADIUS = 10;
const FRICTION = 0.985;
const POCKET_RADIUS = 15;
const MIN_VELOCITY = 0.1;
const MAX_POWER = 18;

const BALL_COLORS: { [key: number]: { color: string; striped: boolean } } = {
  0: { color: "#FFFFFF", striped: false }, // Cue ball
  1: { color: "#FFD700", striped: false }, // Yellow
  2: { color: "#0000FF", striped: false }, // Blue
  3: { color: "#FF0000", striped: false }, // Red
  4: { color: "#800080", striped: false }, // Purple
  5: { color: "#FF8C00", striped: false }, // Orange
  6: { color: "#006400", striped: false }, // Green
  7: { color: "#8B0000", striped: false }, // Maroon
  8: { color: "#000000", striped: false }, // Black (8-ball)
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
  
  // Game rules state
  const [playerType, setPlayerType] = useState<PlayerType>(null);
  const [foulMessage, setFoulMessage] = useState("");
  const [shotInProgress, setShotInProgress] = useState(false);
  const [firstHitBall, setFirstHitBall] = useState<number | null>(null);
  const [gameWon, setGameWon] = useState(false);

  const { playSound } = useGameSound();
  const { leaderboard, addScore } = useGameLeaderboard("pool");
  const isMobile = useIsMobile();
  const isPortrait = useOrientation();

  const tableWidth = 380;
  const tableHeight = 210;
  const padding = 25;

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
      x: padding + 70,
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
    const rackX = padding + tableWidth - 100;
    const rackY = tableHeight / 2 + padding;
    const spacing = BALL_RADIUS * 2.1;

    // Triangle rack formation (1-5 rows) - 8 ball in center
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
      { x: padding + tableWidth / 2, y: padding - 2, radius: POCKET_RADIUS - 2 },
      { x: padding + tableWidth, y: padding, radius: POCKET_RADIUS },
      { x: padding, y: padding + tableHeight, radius: POCKET_RADIUS },
      { x: padding + tableWidth / 2, y: padding + tableHeight + 2, radius: POCKET_RADIUS - 2 },
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
    setFoulMessage("");
    setShotInProgress(false);
    setFirstHitBall(null);
    playSound("click");
  }, [playSound]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const areBallsMoving = useCallback(() => {
    return balls.some(ball => !ball.isPocketed && (Math.abs(ball.vx) > MIN_VELOCITY || Math.abs(ball.vy) > MIN_VELOCITY));
  }, [balls]);

  // Check foul when shot ends
  useEffect(() => {
    if (!shotInProgress) return;
    
    const moving = areBallsMoving();
    if (!moving && shotInProgress) {
      // Shot ended - check for fouls
      setShotInProgress(false);
      
      if (firstHitBall !== null && playerType !== null) {
        const hitBallNum = firstHitBall;
        let isFoul = false;
        
        // Check if hit wrong ball first
        if (playerType === "solid") {
          // Should hit 1-7 first (or 8 if cleared)
          const clearedSolids = hasPlayerClearedBalls("solid", balls);
          if (clearedSolids) {
            if (hitBallNum !== 8) isFoul = true;
          } else {
            if (hitBallNum === 8 || hitBallNum > 8) isFoul = true;
          }
        } else if (playerType === "stripe") {
          // Should hit 9-15 first (or 8 if cleared)
          const clearedStripes = hasPlayerClearedBalls("stripe", balls);
          if (clearedStripes) {
            if (hitBallNum !== 8) isFoul = true;
          } else {
            if (hitBallNum <= 8) isFoul = true;
          }
        }
        
        if (isFoul) {
          setFoulMessage("⚠️ Phạm lỗi! Đánh sai bi");
          playSound("lose");
          setScore(s => Math.max(0, s - 5));
        }
      }
      
      setFirstHitBall(null);
    }
  }, [balls, shotInProgress, areBallsMoving, firstHitBall, playerType, hasPlayerClearedBalls, playSound]);

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
              
              // Normalize collision vector
              const nx = dx / dist;
              const ny = dy / dist;

              // Relative velocity
              const dvx = b1.vx - b2.vx;
              const dvy = b1.vy - b2.vy;
              const dvn = dvx * nx + dvy * ny;

              // Don't resolve if velocities are separating
              if (dvn > 0) {
                const impulse = dvn;
                newBalls[i] = { ...b1, vx: b1.vx - impulse * nx, vy: b1.vy - impulse * ny };
                newBalls[j] = { ...b2, vx: b2.vx + impulse * nx, vy: b2.vy + impulse * ny };

                // Separate balls
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
                // Cue ball pocketed - FOUL!
                playSound("lose");
                setFoulMessage("⚠️ Phạm lỗi! Bi trắng vào lỗ");
                setScore(s => Math.max(0, s - 5));
                return {
                  ...ball,
                  x: padding + 70,
                  y: tableHeight / 2 + padding,
                  vx: 0,
                  vy: 0,
                };
              } else if (ball.number === 8) {
                // 8-ball pocketed - check if player cleared their balls first
                const playerCleared = hasPlayerClearedBalls(playerType, newBalls);
                
                if (playerCleared) {
                  // WIN!
                  playSound("win");
                  setGameOver(true);
                  setGameWon(true);
                  setMessage("🏆 Chiến thắng! Bạn đã thắng ván này!");
                  setScore(s => s + 100);
                } else {
                  // LOSE - pocketed 8-ball too early
                  playSound("lose");
                  setGameOver(true);
                  setGameWon(false);
                  setMessage("💀 Thua cuộc! Đánh bi 8 khi chưa xong");
                }
              } else {
                playSound("match");
                
                // Assign player type on first pocket
                if (playerType === null) {
                  const newType: PlayerType = ball.number >= 1 && ball.number <= 7 ? "solid" : "stripe";
                  setPlayerType(newType);
                  setMessage(newType === "solid" ? "🔵 Bạn là bi ĐẶC (1-7)" : "🔴 Bạn là bi SỌC (9-15)");
                }
                
                // Score based on correct ball
                const isCorrectBall = playerType === null || 
                  (playerType === "solid" && ball.number >= 1 && ball.number <= 7) ||
                  (playerType === "stripe" && ball.number >= 9 && ball.number <= 15);
                
                if (isCorrectBall) {
                  setScore(s => s + 15);
                  setFoulMessage("");
                } else {
                  setScore(s => s + 5); // Less points for opponent's ball
                }
              }
              
              return { ...ball, isPocketed: true, vx: 0, vy: 0 };
            }
          }
          return ball;
        });

        if (newPocketed.length > 0) {
          setPocketedBalls(prev => [...prev, ...newPocketed.filter(n => n !== 0)]);
        }

        return newBalls;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [pockets, gameOver, playSound, playerType, hasPlayerClearedBalls, firstHitBall]);

  // Save score when game ends
  useEffect(() => {
    if (gameOver && score > 0) {
      addScore(score);
    }
  }, [gameOver, score, addScore]);

  // Clear foul message after delay
  useEffect(() => {
    if (foulMessage) {
      const timer = setTimeout(() => setFoulMessage(""), 2500);
      return () => clearTimeout(timer);
    }
  }, [foulMessage]);

  // Clear assignment message after delay
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
    if (areBallsMoving() || gameOver) return;
    
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
      
      setBalls(prev => prev.map(ball => 
        ball.number === 0 
          ? { ...ball, vx: Math.cos(angle) * power, vy: Math.sin(angle) * power }
          : ball
      ));
    }

    setIsAiming(false);
  };

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw table felt
    ctx.fillStyle = "#0d6b3d";
    ctx.fillRect(padding - 5, padding - 5, tableWidth + 10, tableHeight + 10);
    
    // Table border
    ctx.strokeStyle = "#4a2c1d";
    ctx.lineWidth = 8;
    ctx.strokeRect(padding - 8, padding - 8, tableWidth + 16, tableHeight + 16);

    // Draw pockets
    pockets.forEach(pocket => {
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, pocket.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#000";
      ctx.fill();
    });

    // Always draw cue stick when balls are not moving
    const cueBall = balls.find(b => b.number === 0 && !b.isPocketed);
    const ballsMoving = balls.some(ball => !ball.isPocketed && (Math.abs(ball.vx) > MIN_VELOCITY || Math.abs(ball.vy) > MIN_VELOCITY));
    
    if (cueBall && !ballsMoving && !gameOver) {
      let aimAngle: number;
      let pullDistance: number;
      
      if (isAiming) {
        const dx = aimEnd.x - cueBall.x;
        const dy = aimEnd.y - cueBall.y;
        aimAngle = Math.atan2(dy, dx);
        pullDistance = Math.min(Math.sqrt(dx * dx + dy * dy), 80);
      } else {
        aimAngle = Math.PI;
        pullDistance = 15;
      }
      
      // Draw aiming line
      if (isAiming && pullDistance > 10) {
        ctx.beginPath();
        ctx.moveTo(cueBall.x, cueBall.y);
        const lineLength = 150;
        ctx.lineTo(
          cueBall.x - Math.cos(aimAngle) * lineLength,
          cueBall.y - Math.sin(aimAngle) * lineLength
        );
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw cue stick
      const cueLength = 120;
      const cueGap = BALL_RADIUS + 3 + (isAiming ? pullDistance * 0.5 : 0);
      const cueStartX = cueBall.x + Math.cos(aimAngle) * cueGap;
      const cueStartY = cueBall.y + Math.sin(aimAngle) * cueGap;
      const cueEndX = cueStartX + Math.cos(aimAngle) * cueLength;
      const cueEndY = cueStartY + Math.sin(aimAngle) * cueLength;

      // Cue stick shadow
      ctx.beginPath();
      ctx.moveTo(cueStartX + 1, cueStartY + 1);
      ctx.lineTo(cueEndX + 1, cueEndY + 1);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.stroke();

      // Cue stick body
      ctx.beginPath();
      ctx.moveTo(cueStartX, cueStartY);
      ctx.lineTo(cueEndX, cueEndY);
      
      const gradient = ctx.createLinearGradient(cueStartX, cueStartY, cueEndX, cueEndY);
      gradient.addColorStop(0, "#f5e6c8");
      gradient.addColorStop(0.1, "#c4a76c");
      gradient.addColorStop(0.8, "#8b6914");
      gradient.addColorStop(1, "#5c4a1f");
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.stroke();

      // Cue tip
      ctx.beginPath();
      ctx.arc(cueStartX, cueStartY, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#4a90d9";
      ctx.fill();

      // Power indicator
      if (isAiming && pullDistance > 10) {
        const power = pullDistance / 80;
        const indicatorWidth = 60;
        const indicatorHeight = 6;
        const indicatorX = 10;
        const indicatorY = canvas.height - 16;

        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(indicatorX - 2, indicatorY - 2, indicatorWidth + 4, indicatorHeight + 4);
        
        const powerGradient = ctx.createLinearGradient(indicatorX, 0, indicatorX + indicatorWidth, 0);
        powerGradient.addColorStop(0, "#00ff00");
        powerGradient.addColorStop(0.5, "#ffff00");
        powerGradient.addColorStop(1, "#ff0000");
        
        ctx.fillStyle = powerGradient;
        ctx.fillRect(indicatorX, indicatorY, indicatorWidth * power, indicatorHeight);
        
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.strokeRect(indicatorX, indicatorY, indicatorWidth, indicatorHeight);
        
        ctx.fillStyle = "#fff";
        ctx.font = "bold 8px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`${Math.round(power * 100)}%`, indicatorX + indicatorWidth + 5, indicatorY + 6);
      }
    }

    // Draw balls
    balls.forEach(ball => {
      if (ball.isPocketed) return;

      // Ball shadow
      ctx.beginPath();
      ctx.arc(ball.x + 2, ball.y + 2, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fill();

      // Ball body
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
        ctx.fillRect(ball.x - ball.radius, ball.y - ball.radius * 0.4, ball.radius * 2, ball.radius * 0.8);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
      }

      // Ball shine
      ctx.beginPath();
      ctx.arc(ball.x - 3, ball.y - 3, ball.radius / 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fill();

      // Ball number
      if (ball.number > 0) {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
        
        ctx.fillStyle = "#000";
        ctx.font = `bold ${Math.floor(ball.radius * 0.7)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ball.number.toString(), ball.x, ball.y + 1);
      }
    });
  }, [balls, pockets, isAiming, aimStart, aimEnd, gameOver]);

  // Count remaining balls
  const solidRemaining = balls.filter(b => b.number >= 1 && b.number <= 7 && !b.isPocketed).length;
  const stripeRemaining = balls.filter(b => b.number >= 9 && b.number <= 15 && !b.isPocketed).length;

  // Show rotate screen overlay on mobile portrait
  if (isMobile && isPortrait) {
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
          <div className="w-8 h-5 border-2 border-dashed border-muted-foreground/50 rounded" />
          <span>→</span>
          <div className="w-5 h-8 border-2 border-primary rounded" />
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Score and type indicator */}
      <div className="flex items-center justify-between w-full px-1">
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">
            Điểm: <span className="font-bold text-foreground">{score}</span>
          </p>
          {playerType && (
            <div className="flex items-center gap-1 text-xs">
              {playerType === "solid" ? (
                <>
                  <Circle className="w-3 h-3 text-primary fill-primary" />
                  <span className="text-muted-foreground">Đặc: <span className="font-bold text-foreground">{7 - solidRemaining}/7</span></span>
                </>
              ) : (
                <>
                  <CircleDot className="w-3 h-3 text-primary" />
                  <span className="text-muted-foreground">Sọc: <span className="font-bold text-foreground">{7 - stripeRemaining}/7</span></span>
                </>
              )}
            </div>
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

      {/* Player type badge */}
      {playerType && !gameOver && (
        <div className={`text-[10px] px-2 py-0.5 rounded-full ${
          playerType === "solid" 
            ? "bg-blue-500/20 text-blue-400" 
            : "bg-orange-500/20 text-orange-400"
        }`}>
          {playerType === "solid" ? "🔵 Bi ĐẶC (1-7)" : "🟠 Bi SỌC (9-15)"} → Sau đó đánh bi 8
        </div>
      )}

      <motion.canvas
        ref={canvasRef}
        width={430}
        height={260}
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
      {(message || foulMessage) && (
        <motion.p
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`text-xs font-medium ${
            foulMessage ? "text-destructive" : gameWon ? "text-green-500" : "text-primary"
          }`}
        >
          {foulMessage || message}
        </motion.p>
      )}

      {/* Pocketed balls display */}
      {pocketedBalls.length > 0 && (
        <div className="flex gap-1 flex-wrap justify-center max-w-full">
          {pocketedBalls.map((num, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold border ${
                num >= 1 && num <= 7 
                  ? "border-blue-400" 
                  : num >= 9 
                    ? "border-orange-400" 
                    : "border-gray-400"
              }`}
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

      <p className="text-[10px] text-muted-foreground text-center">
        Chạm và kéo để ngắm → Thả để đánh
      </p>

      <Button
        variant="outline"
        size="sm"
        onClick={initGame}
        className="gap-1.5 h-7 text-xs"
      >
        <RefreshCw className="w-3 h-3" />
        Ván mới
      </Button>

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
