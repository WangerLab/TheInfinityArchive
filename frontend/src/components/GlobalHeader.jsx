import React from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Database, BookOpen, Skull, Zap } from 'lucide-react';

export const GlobalHeader = ({ 
  totalBooks = 0, 
  completedBooks = 0, 
  totalRated = 0,
  averageRating = 0,
  className 
}) => {
  const progress = totalBooks > 0 ? (completedBooks / totalBooks) * 100 : 0;

  return (
    <header className={cn(
      "sticky top-0 z-50",
      "bg-gradient-to-b from-void via-background/98 to-background/95",
      "backdrop-blur-md border-b border-border/50",
      "shadow-[0_4px_30px_rgba(0,0,0,0.5)]",
      className
    )}>
      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col gap-3">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo/Icon */}
              <div className="relative">
                <div className="h-10 w-10 rounded-sm bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 flex items-center justify-center">
                  <Database className="h-5 w-5 text-gold" />
                </div>
                {/* Pulsing indicator */}
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-terminal shadow-[0_0_8px_hsl(var(--terminal-green))] animate-pulse" />
              </div>
              
              <div>
                <h1 className="font-display text-lg sm:text-xl text-foreground tracking-widest">
                  THE INFINITY ARCHIVE
                </h1>
                <p className="font-tactical text-[10px] text-gold/70 tracking-[0.2em]">
                  COGITATOR INTERFACE v.M41
                </p>
              </div>
            </div>

            {/* Stats badges - hidden on mobile */}
            <div className="hidden md:flex items-center gap-4">
              <StatBadge 
                icon={Skull}
                label="AVG RATING"
                value={averageRating > 0 ? averageRating.toFixed(1) : '—'}
                variant="gold"
              />
              <StatBadge 
                icon={Zap}
                label="RATED"
                value={totalRated}
                variant="green"
              />
            </div>
          </div>

          {/* Progress section */}
          <div className="flex items-center gap-4">
            {/* Progress bar */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-gold/70" />
                  <span className="font-tactical text-[10px] text-muted-foreground tracking-wider">
                    ARCHIVE COMPLETION
                  </span>
                </div>
                <span className="font-data text-xs">
                  <span className="text-terminal">{completedBooks}</span>
                  <span className="text-muted-foreground/50"> / </span>
                  <span className="text-foreground/80">{totalBooks}</span>
                </span>
              </div>
              
              <div className="relative">
                <Progress 
                  value={progress} 
                  className="h-2 bg-muted/50"
                />
                {/* Glow overlay */}
                {progress > 0 && (
                  <div 
                    className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-gold via-gold to-terminal opacity-80 blur-sm pointer-events-none transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                )}
              </div>
            </div>

            {/* Percentage display */}
            <div className="flex flex-col items-end">
              <span className={cn(
                "font-tactical text-2xl sm:text-3xl font-bold tracking-tight",
                progress === 100 ? "text-terminal" : "text-gold"
              )}>
                {Math.round(progress)}%
              </span>
              <span className="font-tactical text-[8px] text-muted-foreground tracking-widest">
                PROCESSED
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
    </header>
  );
};

const StatBadge = ({ icon: Icon, label, value, variant = 'gold' }) => {
  const colors = {
    gold: 'border-gold/30 text-gold',
    green: 'border-terminal/30 text-terminal'
  };

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-sm",
      "bg-muted/30 border",
      colors[variant]
    )}>
      <Icon className="h-3.5 w-3.5" />
      <div className="flex flex-col">
        <span className="font-tactical text-[8px] text-muted-foreground tracking-wider">{label}</span>
        <span className="font-data text-sm font-bold">{value}</span>
      </div>
    </div>
  );
};

export default GlobalHeader;
