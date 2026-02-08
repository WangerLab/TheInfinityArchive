import React from 'react';
import { cn } from '@/lib/utils';
import { ProgressCircle } from './ProgressCircle';
import { ChevronRight, FileText, Trophy } from 'lucide-react';

export const PhaseCard = ({ 
  phase, 
  progress = 0,
  totalPages = 0,
  readPages = 0,
  totalBooks = 0,
  completedBooks = 0,
  isExpanded = false,
  isPacified = false,
  onClick,
  className 
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left oled-panel rounded-xl p-4",
        "transition-all duration-200 active:scale-[0.98]",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        isPacified && "border-success/50 glow-success",
        isExpanded && "border-primary/50 glow-amber",
        className
      )}
    >
      {/* Pacified badge */}
      {isPacified && (
        <div className="absolute -top-2 -right-2 z-10 flex items-center gap-1 bg-success text-black px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider">
          <Trophy className="w-3 h-3" />
          <span>PACIFIED</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Phase number */}
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          "text-sm font-display font-bold",
          isPacified 
            ? "bg-success/20 text-success border border-success/30" 
            : "bg-primary/10 text-primary border border-primary/30"
        )}>
          {phase.id}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm text-white tracking-wide leading-tight truncate">
            {phase.title}
          </h3>
          <p className="text-xs text-primary/80 font-medium mt-0.5 truncate">
            {phase.subtitle}
          </p>
          <p className="text-xs text-slate-400 mt-1 line-clamp-1">
            {phase.theme}
          </p>
          
          {/* Stats */}
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="flex items-center gap-1 text-slate-300">
              <FileText className="w-3.5 h-3.5 text-primary/60" />
              <span className="font-mono font-semibold">
                {readPages.toLocaleString()}
              </span>
              <span className="text-slate-500">p</span>
            </span>
            <span className="text-slate-500">•</span>
            <span className={cn(
              "font-semibold",
              isPacified ? "text-success" : "text-slate-300"
            )}>
              {completedBooks}/{totalBooks}
            </span>
          </div>
        </div>

        {/* Progress + Chevron */}
        <div className="flex items-center gap-2">
          <ProgressCircle 
            progress={progress}
            size={48}
            strokeWidth={4}
          />
          <ChevronRight className={cn(
            "w-5 h-5 text-slate-400 transition-transform duration-200",
            isExpanded && "rotate-90 text-primary"
          )} />
        </div>
      </div>
    </button>
  );
};

export default PhaseCard;
