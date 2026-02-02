import { useState, useEffect, useCallback } from "react";

export type GameId = "caro" | "memory" | "snake" | "whack" | "chess";

interface LeaderboardEntry {
  score: number;
  date: string;
  name?: string;
}

interface Leaderboards {
  [key: string]: LeaderboardEntry[];
}

const STORAGE_KEY = "game_leaderboards";
const MAX_ENTRIES = 5;

export const useGameLeaderboard = (gameId: GameId) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Load leaderboard from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const leaderboards: Leaderboards = JSON.parse(stored);
        setLeaderboard(leaderboards[gameId] || []);
      }
    } catch {
      console.warn("Could not load leaderboard");
    }
  }, [gameId]);

  // Add a new score
  const addScore = useCallback((score: number, name?: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const leaderboards: Leaderboards = stored ? JSON.parse(stored) : {};
      
      const gameBoard = leaderboards[gameId] || [];
      const newEntry: LeaderboardEntry = {
        score,
        date: new Date().toLocaleDateString("vi-VN"),
        name,
      };
      
      gameBoard.push(newEntry);
      
      // Sort by score (descending for most games, ascending for memory)
      if (gameId === "memory") {
        // Lower moves is better
        gameBoard.sort((a, b) => a.score - b.score);
      } else {
        // Higher score is better
        gameBoard.sort((a, b) => b.score - a.score);
      }
      
      // Keep only top entries
      const trimmed = gameBoard.slice(0, MAX_ENTRIES);
      leaderboards[gameId] = trimmed;
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderboards));
      setLeaderboard(trimmed);
      
      // Return position (1-indexed), -1 if not in top
      const position = trimmed.findIndex(e => e === newEntry);
      return position >= 0 ? position + 1 : -1;
    } catch {
      console.warn("Could not save score");
      return -1;
    }
  }, [gameId]);

  // Get best score
  const getBestScore = useCallback(() => {
    if (leaderboard.length === 0) return null;
    return leaderboard[0].score;
  }, [leaderboard]);

  // Clear leaderboard
  const clearLeaderboard = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const leaderboards: Leaderboards = stored ? JSON.parse(stored) : {};
      delete leaderboards[gameId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderboards));
      setLeaderboard([]);
    } catch {
      console.warn("Could not clear leaderboard");
    }
  }, [gameId]);

  return {
    leaderboard,
    addScore,
    getBestScore,
    clearLeaderboard,
  };
};

