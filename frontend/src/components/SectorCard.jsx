import React from 'react';
import { cn } from 'lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from 'components/ui/card';
import { ProgressRing } from './ProgressRing';
import { motion } from 'framer-motion';
import { ChevronDown, BookOpen, Target, FileText, Trophy } from 'lucide-react';

export const SectorCard = ({ 
  phase, 
  progress = 0,
  pagesProgress = 0,
  totalPages = 0,
  readPages = 0,
  totalBooks = 0,
  completedBooks = 0,
  isExpanded = false,
  isPacified = false,
  onClick,
  className 
}) => {
  const phaseNumber = phase.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: phaseNumber * 0.05 }}
    >
      <Card 
        onClick={onClick}
        className={cn(
          "panel-cogitator cursor-pointer group relative",
          "transition-all duration-300",
          "hover:border-gold/50 hover:shadow-glow-gold",
          isExpanded && "border-gold/60 shadow-glow-gold",
          isPacified && "animate-sector-pacified border-terminal/60",
          className
        )}
      >
        {/* Pacified badge */}
        {isPacified && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -top-2 -right-2 z-10"
          >
            <div className="bg-terminal text-terminal-foreground px-2 py-0.5 rounded-sm flex items-center gap-1 shadow-glow-green">
              <Trophy className="h-3 w-3" />
              <span className="font-tactical text-[8px] tracking-wider">PACIFIED</span>
            </div>
          </motion.div>
        )}

        {/* Scan line effect on hover */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-sm">
          <div className={cn(
            "absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent",
            "opacity-0 group-hover:opacity-100 group-hover:animate-scan-vertical"
          )} />
        </div>

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Phase indicator */}
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "inline-flex items-center justify-center h-5 w-5 rounded-sm border",
                  isPacified 
                    ? "bg-terminal/20 border-terminal/50" 
                    : "bg-gold/10 border-gold/30"
                )}>
                  <span className={cn(
                    "font-tactical text-[10px] font-bold",
                    isPacified ? "text-terminal" : "text-gold"
                  )}>{phaseNumber}</span>
                </span>
                <div className={cn(
                  "h-px flex-1 bg-gradient-to-r",
                  isPacified 
                    ? "from-terminal/40 to-transparent" 
                    : "from-gold/30 to-transparent"
                )} />
              </div>
              
              <CardTitle className="font-display text-sm sm:text-base text-foreground tracking-wide leading-tight mb-0.5 line-clamp-2">
                {phase.title}
              </CardTitle>
              
              <CardDescription className="font-data text-[10px] text-gold/80 tracking-wider">
                {phase.subtitle}
              </CardDescription>
            </div>
            
            <ProgressRing 
              progress={pagesProgress} 
              size={56} 
              strokeWidth={4}
              variant={isPacified ? 'green' : 'gold'}
            />
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Theme */}
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-3 w-3 text-terminal/70 shrink-0" />
            <span className="font-data text-[10px] text-muted-foreground line-clamp-1">
              {phase.theme}
            </span>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-gold/60" />
                <span className="font-data text-muted-foreground">
                  <span className={isPacified ? "text-terminal" : "text-terminal"}>{completedBooks}</span>
                  <span className="text-muted-foreground/50">/</span>
                  <span className="text-foreground/80">{totalBooks}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-gold/60" />
                <span className="font-data text-muted-foreground">
                  <span className={isPacified ? "text-terminal" : "text-gold"}>{readPages.toLocaleString()}</span>
                  <span className="text-muted-foreground/30">p</span>
                </span>
              </div>
            </div>
            
            <ChevronDown 
              className={cn(
                "h-4 w-4 text-gold/60 transition-transform duration-300",
                isExpanded && "rotate-180 text-gold"
              )} 
            />
          </div>

          {/* Status indicator */}
          <div className="mt-2 pt-2 border-t border-border/20">
            <div className="flex items-center gap-2">
              <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                isPacified 
                  ? "bg-terminal shadow-[0_0_6px_hsl(var(--terminal-green))]"
                  : progress > 0
                  ? "bg-gold shadow-[0_0_6px_hsl(var(--gold)/0.5)]"
                  : "bg-muted-foreground/30"
              )} />
              <span className="font-tactical text-[8px] tracking-widest text-muted-foreground uppercase">
                {isPacified ? 'SECTOR PACIFIED' : progress > 0 ? 'IN PROGRESS' : 'AWAITING INITIATION'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SectorCard;
