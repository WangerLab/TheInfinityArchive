import React from 'react';
import { cn } from '@/lib/utils';
import { ProgressRing } from './ProgressRing';
import { Shield, Swords, Bug, FileText, Skull, Zap, Award } from 'lucide-react';

export const GlobalHeader = ({ 
  totalPages = 0,
  readPages = 0,
  totalItems = 0, 
  completedItems = 0, 
  totalRated = 0,
  averageRating = 0,
  activeFilters = [],
  onFilterToggle,
  className 
}) => {
  const progress = totalPages > 0 ? (readPages / totalPages) * 100 : 0;

  const filters = [
    { id: 'imperium', label: 'IMPERIUM', icon: Shield, color: 'border-gold text-gold hover:bg-gold/20' },
    { id: 'chaos', label: 'CHAOS', icon: Swords, color: 'border-purple-500 text-purple-400 hover:bg-purple-500/20' },
    { id: 'xenos', label: 'XENOS', icon: Bug, color: 'border-plasma text-plasma hover:bg-plasma/20' },
  ];

  const formatNumber = (num) => num.toLocaleString();

  return (
    <header className={cn(
      "sticky top-0 z-50 safe-top",
      "bg-slate-950/95 backdrop-blur-md",
      "border-b border-gold/30",
      "shadow-[0_4px_30px_rgba(0,0,0,0.8)]",
      className
    )}>
      {/* Top gold accent line */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      
      <div className="px-4 py-3">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl text-gold tracking-wider text-glow-gold">
              THE INFINITY ARCHIVE
            </h1>
            <p className="text-[10px] text-slate-400 font-tactical tracking-[0.25em] mt-0.5">
              COGITATOR INTERFACE v.M41
            </p>
          </div>
          
          <ProgressRing 
            progress={progress} 
            size={68} 
            strokeWidth={5}
          />
        </div>

        {/* XP Bar - Page Counter */}
        <div className="grimdark-panel rounded-lg p-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-gold" />
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl text-slate-100 tracking-wide">
                  {formatNumber(readPages)}
                </span>
                <span className="text-slate-500 font-data">/</span>
                <span className="font-data text-lg text-slate-400">
                  {formatNumber(totalPages)}
                </span>
              </div>
              <span className="text-[10px] text-gold font-tactical tracking-[0.2em]">
                PAGES PROCESSED
              </span>
            </div>
            
            {/* Mini stats */}
            <div className="flex flex-col gap-1.5 items-end">
              <div className="flex items-center gap-1.5 text-xs">
                <Zap className="w-4 h-4 text-auspex" />
                <span className="text-slate-200 font-bold">{completedItems}/{totalItems}</span>
              </div>
              {averageRating > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Skull className="w-4 h-4 text-gold" />
                  <span className="text-gold font-bold">{averageRating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-3 h-2 bg-black/50 rounded-full overflow-hidden border border-gold/20">
            <div 
              className="h-full bg-gradient-to-r from-gold via-gold to-auspex rounded-full transition-all duration-700"
              style={{ 
                width: `${progress}%`,
                boxShadow: progress > 0 ? '0 0 10px hsl(38, 92%, 50%)' : 'none'
              }}
            />
          </div>
        </div>

        {/* Strategic Filters */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-slate-500 font-tactical tracking-[0.15em] mr-1">
            STRATEGIC FILTERS:
          </span>
          {filters.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilters.length === 0 || activeFilters.includes(filter.id);
            
            return (
              <button
                key={filter.id}
                onClick={() => onFilterToggle(filter.id)}
                className={cn(
                  "touch-target flex items-center gap-1.5 px-3 py-1.5 rounded-md",
                  "border-2 transition-all duration-200",
                  "text-[10px] font-bold tracking-wider",
                  "active:scale-95",
                  filter.color,
                  !isActive && "opacity-25 grayscale"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{filter.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Bottom accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
    </header>
  );
};

export default GlobalHeader;
