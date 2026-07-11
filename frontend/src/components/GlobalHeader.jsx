import React from 'react';
import { cn } from 'lib/utils';
import { FileText } from 'lucide-react';

export const GlobalHeader = ({ 
  totalPages = 0,
  readPages = 0,
  totalItems = 0, 
  completedItems = 0, 
  totalRated = 0,
  averageRating = 0,
  pacifiedSectors = 0,
  totalSectors = 0,
  description = '',
  assignmentSlot,
  dossierSlot,
  className
}) => {
  const progress = totalPages > 0 ? (readPages / totalPages) * 100 : 0;

  const formatNumber = (num) => num.toLocaleString();

  // Axis ticks every 10k up to totalPages (e.g. 0, 10k … 80k). Compact
  // "k" labels; positioned by percentage so they align under the bar.
  const TICK_STEP = 10000;
  const ticks = [];
  if (totalPages > 0) {
    for (let v = 0; v <= totalPages; v += TICK_STEP) {
      ticks.push(v);
    }
  }
  const tickLabel = (v) => (v === 0 ? '0' : `${Math.round(v / 1000)}k`);

  return (
    <header className={cn(
      "sticky top-0 z-50 safe-top",
      "bg-slate-950/80 backdrop-blur-md",
      "border-b border-gold/30",
      "shadow-[0_4px_30px_rgba(0,0,0,0.8)]",
      className
    )}>
      {/* Top gold accent line */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      
      <div className="px-4 py-2">
        <div className="grid grid-cols-1 md:grid-cols-2 md:auto-rows-fr gap-2">
          {/* Zeile 1 links: Page-Counter */}
          <div className="grimdark-panel rounded-lg px-3 py-2 flex flex-col justify-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
                <FileText className="w-4 h-4 text-gold" />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-xl text-slate-100 tracking-wide">
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

            {/* Axis ticks */}
            {ticks.length > 1 && (
              <div className="relative h-3 mt-1">
                {ticks.map((v) => (
                  <span
                    key={v}
                    className="absolute top-0 text-[9px] font-data text-slate-600 tabular-nums -translate-x-1/2"
                    style={{ left: `${(v / totalPages) * 100}%` }}
                  >
                    {tickLabel(v)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Zeile 1 rechts: Assignment */}
          {assignmentSlot}

          {/* Zeile 2 links: Scope (Description + Fakten) */}
          <div className="grimdark-panel rounded-lg px-4 py-2 flex flex-col justify-center">
            {description && (
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                <span className="text-gold font-bold">{'>'}</span> {description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-xs font-data">
              <span className="flex items-center gap-1.5">
                <span className="font-bold text-auspex tabular-nums">{pacifiedSectors}/{totalSectors}</span>
                <span className="text-[10px] text-auspex/70 font-tactical tracking-[0.15em]">SECTORS PACIFIED</span>
              </span>
              <span className="text-gold/50">•</span>
              <span className="flex items-center gap-1.5">
                <span className="font-bold text-slate-200 tabular-nums">{totalPages.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 font-tactical tracking-[0.15em]">TOTAL PAGES</span>
              </span>
              <span className="text-gold/50">•</span>
              <span className="flex items-center gap-1.5">
                <span className="font-bold text-slate-200 tabular-nums">{completedItems}/{totalItems}</span>
                <span className="text-[10px] text-slate-400 font-tactical tracking-[0.15em]">BOOKS READ</span>
              </span>
            </div>
          </div>

          {/* Zeile 2 rechts: Dossier */}
          {dossierSlot}
        </div>
      </div>

      {/* Bottom accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
    </header>
  );
};

export default GlobalHeader;
