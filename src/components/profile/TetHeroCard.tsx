import * as React from "react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface TetHeroCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Premium ornate card for the Super Admin avatar/name section.
 * More elaborate than TetOrnateCard with double borders, 
 * animated lanterns, richer gold detailing, and sparkle effects.
 */
const TetHeroCard = React.forwardRef<HTMLDivElement, TetHeroCardProps>(
  ({ className, children, ...props }, ref) => {
    const sparkles = useMemo(() =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        left: 5 + Math.random() * 90,
        top: 5 + Math.random() * 90,
        delay: Math.random() * 4,
        duration: 2 + Math.random() * 2,
        size: 6 + Math.random() * 10,
      })),
      []
    );

    return (
      <div ref={ref} className={cn("tet-hero-card relative", className)} {...props}>
        {/* Gold shimmer overlay */}
        <div className="tet-hero-shimmer" />

        {/* Floating sparkle particles */}
        {sparkles.map((s) => (
          <span
            key={s.id}
            className="absolute pointer-events-none select-none"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              fontSize: `${s.size}px`,
              animation: `tet-sparkle-float ${s.duration}s ease-in-out ${s.delay}s infinite alternate`,
              zIndex: 15,
              filter: `drop-shadow(0 0 4px hsl(40 90% 55% / 0.8))`,
            }}
          >
            ✦
          </span>
        ))}

        {/* Outer decorative frame */}
        <div className="tet-hero-outer-frame" />
        
        {/* Corner dragons/ornaments */}
        <div className="tet-hero-corner tet-hero-corner-tl">🐉</div>
        <div className="tet-hero-corner tet-hero-corner-tr">🐉</div>
        <div className="tet-hero-corner tet-hero-corner-bl">🌸</div>
        <div className="tet-hero-corner tet-hero-corner-br">🌸</div>

        {/* Top crown ornament */}
        <div className="tet-hero-crown">
          <span className="tet-hero-crown-gem">👑</span>
        </div>

        {/* Side pillars */}
        <div className="tet-hero-pillar tet-hero-pillar-left" />
        <div className="tet-hero-pillar tet-hero-pillar-right" />

        {/* Hanging lanterns */}
        <div className="tet-hero-lantern-group tet-hero-lantern-left">
          <span>🏮</span>
          <span>🏮</span>
        </div>
        <div className="tet-hero-lantern-group tet-hero-lantern-right">
          <span>🏮</span>
          <span>🏮</span>
        </div>

        {/* Bottom platform */}
        <div className="tet-hero-platform" />

        {/* Ambient gold glow edges */}
        <div className="tet-hero-glow-left" />
        <div className="tet-hero-glow-right" />

        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  }
);

TetHeroCard.displayName = "TetHeroCard";

export default TetHeroCard;
