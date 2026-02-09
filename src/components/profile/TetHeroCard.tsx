import * as React from "react";
import { cn } from "@/lib/utils";

interface TetHeroCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Premium ornate card for the Super Admin avatar/name section.
 * More elaborate than TetOrnateCard with double borders, 
 * animated lanterns, and richer gold detailing.
 */
const TetHeroCard = React.forwardRef<HTMLDivElement, TetHeroCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("tet-hero-card relative", className)} {...props}>
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
