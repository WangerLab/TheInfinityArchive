import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Database, BookOpen, Skull, Zap, FileText, Shield, Swords, Bug } from 'lucide-react';

export const GlobalHeader = ({ 
  totalPages = 0,
  readPages = 0,
  totalBooks = 0, 
  completedBooks = 0, 
  totalRated = 0,
  averageRating = 0,
  activeFilters = [],
  onFilterToggle,
  className 
}) => {
  const progress = totalPages > 0 ? (readPages / totalPages) * 100 : 0;

  const filters = [
    { id: 'imperium', label: 'IMPERIUM', icon: Shield, color: 'text-gold border-gold/50 bg-gold/10 hover:bg-gold/20' },
    { id: 'chaos', label: 'CHAOS', icon: Swords, color: 'text-chaos border-chaos/50 bg-chaos/10 hover:bg-chaos/20' },
    { id: 'xenos', label: 'XENOS', icon: Bug, color: 'text-xenos border-xenos/50 bg-xenos/10 hover:bg-xenos/20' },
  ];

  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  return (
    <header className={cn(
      "sticky top-0 z-50",
      "bg-gradient-to-b from-void via-background/98 to-background/95",
      "backdrop-blur-md border-b border-border/50",
      "shadow-[0_4px_30px_rgba(0,0,0,0.6)]",
      className
    )}>
      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col gap-3">
          {/* Title row */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {/* Logo/Icon */}
              <div className="relative">
                <motion.div 
                  className="h-10 w-10 rounded-sm bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <Database className="h-5 w-5 text-gold" />
                </motion.div>
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-terminal shadow-[0_0_8px_hsl(var(--terminal-green))] animate-pulse" />
              </div>
              
              <div>
                <h1 className="font-display text-lg sm:text-xl text-foreground tracking-widest">
                  THE INFINITY ARCHIVE
                </h1>
                <p className="font-tactical text-[9px] text-gold/70 tracking-[0.2em]">
                  COGITATOR INTERFACE v.M41
                </p>
              </div>
            </div>

            {/* Faction Filters */}
            <div className="flex items-center gap-2">
              <span className="font-tactical text-[8px] text-muted-foreground tracking-widest mr-1 hidden sm:inline">
                STRATEGIC FILTERS:
              </span>
              {filters.map((filter) => {
                const Icon = filter.icon;
                const isActive = activeFilters.length === 0 || activeFilters.includes(filter.id);
                
                return (
                  <motion.button
                    key={filter.id}
                    onClick={() => onFilterToggle(filter.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-sm border transition-all duration-200",
                      "font-tactical text-[9px] tracking-wider",
                      filter.color,
                      !isActive && "opacity-30 grayscale"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="hidden sm:inline">{filter.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Page Progress - Main XP Bar */}
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-gold/70" />
                  <span className="font-tactical text-[9px] text-muted-foreground tracking-wider">
                    PAGES PROCESSED
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-data text-xs">
                    <span className="text-terminal">{formatNumber(readPages)}</span>
                    <span className="text-muted-foreground/50"> / </span>
                    <span className="text-foreground/80">{formatNumber(totalPages)}</span>
                  </span>
                </div>
              </div>
              
              <div className="relative">
                <Progress 
                  value={progress} 
                  className="h-2.5 bg-muted/50"
                />
                {progress > 0 && (
                  <motion.div 
                    className="absolute top-0 left-0 h-full rounded-sm bg-gradient-to-r from-gold via-gold to-terminal opacity-70 blur-sm pointer-events-none"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                )}
              </div>
            </div>

            {/* Mini stats */}
            <div className="flex items-center gap-3">
              <StatBadge 
                icon={BookOpen}
                label="TOMES"
                value={`${completedBooks}/${totalBooks}`}
                variant="default"
              />
              <StatBadge 
                icon={Skull}
                label="RATING"
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

            {/* Percentage display */}
            <div className="flex flex-col items-end">
              <motion.span 
                className={cn(
                  "font-tactical text-2xl sm:text-3xl font-bold tracking-tight",
                  progress === 100 ? "text-terminal" : "text-gold"
                )}
                key={Math.round(progress)}
                initial={{ scale: 1.1, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {Math.round(progress)}%
              </motion.span>
              <span className="font-tactical text-[7px] text-muted-foreground tracking-widest">
                ARCHIVE PROGRESS
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

const StatBadge = ({ icon: Icon, label, value, variant = 'default' }) => {
  const colors = {
    default: 'border-border/50 text-foreground/80',
    gold: 'border-gold/30 text-gold',
    green: 'border-terminal/30 text-terminal'
  };

  return (
    <div className={cn(
      "flex items-center gap-2 px-2.5 py-1.5 rounded-sm",
      "bg-muted/30 border",
      colors[variant]
    )}>
      <Icon className="h-3.5 w-3.5" />
      <div className="flex flex-col">
        <span className="font-tactical text-[7px] text-muted-foreground tracking-wider">{label}</span>
        <span className="font-data text-sm font-bold">{value}</span>
      </div>
    </div>
  );
};

export default GlobalHeader;
