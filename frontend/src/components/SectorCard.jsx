import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ProgressRing } from './ProgressRing';
import { ChevronDown, BookOpen, Target } from 'lucide-react';

export const SectorCard = ({ 
  phase, 
  progress = 0, 
  totalBooks = 0,
  completedBooks = 0,
  isExpanded = false,
  onClick,
  className 
}) => {
  const phaseNumber = phase.id;

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "panel-cogitator cursor-pointer group",
        "transition-all duration-300",
        "hover:border-gold/50 hover:shadow-glow-gold",
        isExpanded && "border-gold/60 shadow-glow-gold",
        className
      )}
    >
      {/* Scan line effect on hover */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn(
          "absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent",
          "opacity-0 group-hover:opacity-100 group-hover:animate-scan"
        )} />
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Phase indicator */}
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-sm bg-gold/10 border border-gold/30">
                <span className="font-tactical text-xs text-gold font-bold">{phaseNumber}</span>
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
            </div>
            
            <CardTitle className="font-display text-base sm:text-lg text-foreground tracking-wide leading-tight mb-1 truncate">
              {phase.title}
            </CardTitle>
            
            <CardDescription className="font-data text-xs text-gold/80 tracking-wider">
              {phase.subtitle}
            </CardDescription>
          </div>
          
          <ProgressRing 
            progress={progress} 
            size={64} 
            strokeWidth={5}
            variant={progress === 100 ? 'green' : 'gold'}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Theme */}
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-3 w-3 text-terminal/70" />
          <span className="font-data text-xs text-muted-foreground">
            {phase.theme}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-gold/60" />
            <span className="font-data text-xs text-muted-foreground">
              <span className="text-terminal">{completedBooks}</span>
              <span className="text-muted-foreground/50"> / </span>
              <span className="text-foreground/80">{totalBooks}</span>
              <span className="text-muted-foreground/50 ml-1">TOMES</span>
            </span>
          </div>
          
          <ChevronDown 
            className={cn(
              "h-5 w-5 text-gold/60 transition-transform duration-300",
              isExpanded && "rotate-180 text-gold"
            )} 
          />
        </div>

        {/* Status indicator */}
        <div className="mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center gap-2">
            <span className={cn(
              "h-2 w-2 rounded-full",
              progress === 100 
                ? "bg-terminal shadow-[0_0_6px_hsl(var(--terminal-green))]"
                : progress > 0
                ? "bg-gold shadow-[0_0_6px_hsl(var(--gold)/0.5)]"
                : "bg-muted-foreground/30"
            )} />
            <span className="font-tactical text-[10px] tracking-widest text-muted-foreground uppercase">
              {progress === 100 ? 'SECTOR COMPLETE' : progress > 0 ? 'IN PROGRESS' : 'AWAITING INITIATION'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SectorCard;
