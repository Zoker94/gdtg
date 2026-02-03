import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type Difficulty = "easy" | "medium" | "hard";

interface DifficultySelectorProps {
  value: Difficulty;
  onChange: (difficulty: Difficulty) => void;
  disabled?: boolean;
  compact?: boolean;
}

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; color: string; emoji: string }> = {
  easy: { label: "Dễ", color: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30", emoji: "🌱" },
  medium: { label: "Trung bình", color: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30", emoji: "⚡" },
  hard: { label: "Khó", color: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30", emoji: "🔥" },
};

const DifficultySelector = ({ value, onChange, disabled = false, compact = false }: DifficultySelectorProps) => {
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {(["easy", "medium", "hard"] as Difficulty[]).map((diff) => (
          <Button
            key={diff}
            variant={value === diff ? "default" : "ghost"}
            size="sm"
            className={`h-5 px-1.5 text-[10px] ${value === diff ? "" : "opacity-60"}`}
            onClick={() => onChange(diff)}
            disabled={disabled}
          >
            {DIFFICULTY_CONFIG[diff].emoji}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] text-muted-foreground">Bot:</span>
      {(["easy", "medium", "hard"] as Difficulty[]).map((diff) => (
        <Badge
          key={diff}
          variant="outline"
          className={`cursor-pointer transition-all text-[10px] px-1.5 py-0 ${
            value === diff 
              ? DIFFICULTY_CONFIG[diff].color + " border-2" 
              : "opacity-50 hover:opacity-80"
          } ${disabled ? "pointer-events-none" : ""}`}
          onClick={() => !disabled && onChange(diff)}
        >
          {DIFFICULTY_CONFIG[diff].emoji} {DIFFICULTY_CONFIG[diff].label}
        </Badge>
      ))}
    </div>
  );
};

export default DifficultySelector;
