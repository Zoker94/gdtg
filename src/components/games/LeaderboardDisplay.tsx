import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeaderboardEntry {
  score: number;
  date: string;
  name?: string;
}

interface LeaderboardDisplayProps {
  isOpen: boolean;
  onClose: () => void;
  leaderboard: LeaderboardEntry[];
  title: string;
  scoreLabel?: string;
  lowerIsBetter?: boolean;
}

const LeaderboardDisplay = ({
  isOpen,
  onClose,
  leaderboard,
  title,
  scoreLabel = "Điểm",
  lowerIsBetter = false,
}: LeaderboardDisplayProps) => {
  const getMedalIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-4 h-4 text-yellow-500" />;
    if (index === 1) return <Medal className="w-4 h-4 text-gray-400" />;
    if (index === 2) return <Medal className="w-4 h-4 text-amber-600" />;
    return <span className="w-4 h-4 text-center text-xs text-muted-foreground">{index + 1}</span>;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card border rounded-lg p-4 w-64 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">{title}</h3>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
                <X className="w-3 h-3" />
              </Button>
            </div>

            {leaderboard.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Chưa có điểm số nào
              </p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                  >
                    <div className="flex items-center justify-center w-6">
                      {getMedalIcon(index)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {entry.name || `Người chơi ${index + 1}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{entry.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">
                        {entry.score}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{scoreLabel}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LeaderboardDisplay;
