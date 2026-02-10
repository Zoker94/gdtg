import * as React from "react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface TetOrnateCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const TetOrnateCard = React.forwardRef<HTMLDivElement, TetOrnateCardProps>(
  ({ className, children, ...props }, ref) => {
    const sparkles = useMemo(() =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        left: 10 + Math.random() * 80,
        top: 10 + Math.random() * 80,
        delay: Math.random() * 5,
        duration: 2.5 + Math.random() * 2,
        size: 5 + Math.random() * 7,
      })),
      []
    );

    return (
      <div ref={ref} className={cn("tet-ornate-card relative", className)} {...props}>
        {/* Shimmer sweep */}
        <div className="tet-ornate-shimmer" />

        {/* Sparkle particles */}
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
              color: 'hsl(40 90% 60%)',
              filter: `drop-shadow(0 0 3px hsl(40 90% 55% / 0.7))`,
            }}
          >
            ✧
          </span>
        ))}

        {/* Corner decorations */}
        <div className="tet-ornate-corner tet-ornate-corner-tl" />
        <div className="tet-ornate-corner tet-ornate-corner-tr" />
        <div className="tet-ornate-corner tet-ornate-corner-bl" />
        <div className="tet-ornate-corner tet-ornate-corner-br" />
        
        {/* Top center ornament */}
        <div className="tet-ornate-top-ornament">
          <span>☘</span>
        </div>

        {/* Lantern decorations */}
        <div className="tet-ornate-lantern tet-ornate-lantern-left">🏮</div>
        <div className="tet-ornate-lantern tet-ornate-lantern-right">🏮</div>

        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  }
);

TetOrnateCard.displayName = "TetOrnateCard";

export default TetOrnateCard;
