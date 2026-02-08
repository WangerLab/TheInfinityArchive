import React from 'react';
import { cn } from '@/lib/utils';
import { ProgressCircle } from './ProgressCircle';
import { Shield, Swords, Bug, FileText, Zap, Skull } from 'lucide-react';

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
    { id: 'imperium', label: 'IMP', icon: Shield, color: 'bg-imperium/20 border-imperium text-imperium' },
    { id: 'chaos', label: 'CHAOS', icon: Swords, color: 'bg-chaos/20 border-chaos text-chaos' },
    { id: 'xenos', label: 'XENOS', icon: Bug, color: 'bg-xenos/20 border-xenos text-xenos' },
  ];

  return (
    <header className={cn(
      "sticky top-0 z-50 safe-top",
      "bg-black/95 backdrop-blur-md",
      "border-b border-white/10",
      className
    )}>
      <div className="px-4 py-3">
        {/* Top row: Title + Progress Circle */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-lg text-white tracking-wider truncate">
              THE INFINITY ARCHIVE
            </h1>
            <p className="text-xs text-slate-400 font-medium tracking-widest mt-0.5">
              COGITATOR v.M41
            </p>
          </div>
          
          <ProgressCircle 
            progress={progress} 
            size={64} 
            strokeWidth={5}
          />
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between gap-3 mb-3">
          {/* Pages counter - prominent */}
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 flex-1">
            <FileText className="w-5 h-5 text-primary" />
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-semibold tracking-wider">PAGES READ</span>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-xl font-bold text-white">
                  {readPages.toLocaleString()}
                </span>
                <span className="text-slate-500">/</span>
                <span className="font-mono text-sm text-slate-400">
                  {totalPages.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Mini stats */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs">
              <Zap className="w-4 h-4 text-success" />
              <span className="text-slate-300 font-semibold">{completedBooks}/{totalBooks}</span>
            </div>
            {averageRating > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <Skull className="w-4 h-4 text-primary" />
                <span className="text-slate-300 font-semibold">{averageRating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-semibold tracking-widest mr-1">
            FILTER:
          </span>
          {filters.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilters.length === 0 || activeFilters.includes(filter.id);
            
            return (
              <button
                key={filter.id}
                onClick={() => onFilterToggle(filter.id)}
                className={cn(
                  "touch-target flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                  "border transition-all duration-200",
                  "text-xs font-semibold tracking-wider",
                  "active:scale-95",
                  filter.color,
                  !isActive && "opacity-30"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{filter.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;
