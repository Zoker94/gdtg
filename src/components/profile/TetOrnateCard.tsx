import * as React from "react";
import { cn } from "@/lib/utils";

interface TetOrnateCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const TetOrnateCard = React.forwardRef<HTMLDivElement, TetOrnateCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("tet-ornate-card relative", className)} {...props}>
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
