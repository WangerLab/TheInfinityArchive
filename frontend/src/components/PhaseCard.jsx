import React from 'react';
import { cn } from 'lib/utils';
import { ProgressRing } from './ProgressRing';
import { ChevronRight, FileText, Trophy, Sparkles } from 'lucide-react';

export const PhaseCard = ({ 
  phase, 
  progress = 0,
  totalPages = 0,
  readPages = 0,
  totalItems = 0,
  completedItems = 0,
  isExpanded = false,
  isPacified = false,
  onClick,
  className 
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg p-4 relative",
        "grimdark-panel",
        "transition-all duration-300 active:scale-[0.98]",
        "focus:outline-none focus:ring-2 focus:ring-gold/50",
        isPacified && "grimdark-panel-pacified",
        isExpanded && "ring-2 ring-gold/40",
        className
      )}
    >
      {/* Pacified Badge */}
      {isPacified && (
        <div className="absolute -top-2 -right-2 z-10 flex items-center gap-1 bg-auspex text-black px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider shadow-lg glow-auspex">
          <Trophy className="w-3.5 h-3.5" />
          <span>SECTOR PACIFIED</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Phase number badge */}
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
          "text-base font-display font-bold border-2",
          isPacified 
            ? "bg-auspex/20 text-auspex border-auspex/50" 
            : "bg-gold/10 text-gold border-gold/40"
        )}>
          {phase.id}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-display text-base tracking-wide leading-tight",
            isPacified ? "text-auspex" : "text-gold"
          )}>
            {phase.title}
          </h3>
          <p className={cn(
            "text-xs font-semibold mt-0.5",
            isPacified ? "text-auspex/70" : "text-gold/70"
          )}>
            {phase.subtitle}
          </p>
          <p className="text-xs text-slate-400 mt-1.5 line-clamp-1 font-medium">
            {phase.theme}
          </p>
          
          {/* Stats row */}
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <FileText className={cn(
                "w-3.5 h-3.5",
                isPacified ? "text-auspex/60" : "text-gold/60"
              )} />
              <span className="font-data font-bold">
                {readPages.toLocaleString()}
              </span>
              <span className="text-slate-500">p</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className={cn(
              "font-bold",
              isPacified ? "text-auspex" : "text-slate-200"
            )}>
              {completedItems}/{totalItems}
            </span>
          </div>
        </div>

        {/* Progress + Chevron */}
        <div className="flex items-center gap-2">
          <ProgressRing 
            progress={progress}
            size={52}
            strokeWidth={4}
          />
          <ChevronRight className={cn(
            "w-5 h-5 transition-transform duration-200",
            isPacified ? "text-auspex/60" : "text-gold/60",
            isExpanded && "rotate-90"
          )} />
        </div>
      </div>
    </button>
  );
};

export default PhaseCard;
