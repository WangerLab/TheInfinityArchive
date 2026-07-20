import React from 'react';
import { ArrowRight, Layers, Shuffle, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from 'lib/utils';
import { FactionSigil } from './FactionSigil';

// Hybrid advisory panel (spec §10, decided this session): a short overall
// assessment plus 3 tappable rows, each expanding in place to that book's
// detail (summary + personalised rationale) -- matches §2's literal "click
// a recommended node -> panel shows that book's detail" better than three
// full cards shown at once. Hovering a row highlights its vector/node on
// the map and vice versa (props flow both ways through Strategium.jsx).

const VECTOR_META = {
  continuation: { icon: ArrowRight, label: 'Continuation', tint: 'text-auspex' },
  deepening: { icon: Layers, label: 'Deepening', tint: 'text-gold' },
  pivot: { icon: Shuffle, label: 'Pivot', tint: 'text-plasma' },
};

export function StrategiumAdvisory({
  position,
  freeText,
  onFreeTextChange,
  onSubmitQuery,
  loading,
  error,
  assessment,
  recommendations,
  hoveredIndex,
  onHoverRow,
  expandedIndex,
  onToggleRow,
  onOpenBook,
}) {
  return (
    <div className="flex flex-col gap-3 h-full">
      <p className="font-tactical text-[11px] tracking-[0.2em] text-plasma uppercase">
        Advisory
      </p>

      {position ? (
        <p className="text-xs text-slate-400">
          Position: <span className="text-slate-200">{position.title}</span> ({position.factionPrimary})
        </p>
      ) : (
        <p className="text-xs text-slate-500">No completed reading yet — recommending broadly.</p>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={freeText}
          onChange={(e) => onFreeTextChange(e.target.value)}
          placeholder="Optional intent — what are you in the mood for?"
          className="flex-1 min-w-0 bg-slate-900/60 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-plasma/60"
        />
        <button
          type="button"
          onClick={onSubmitQuery}
          disabled={loading}
          className={cn(
            'shrink-0 px-3 py-1.5 rounded-md font-tactical text-[11px] tracking-wider uppercase',
            'border border-plasma/40 text-plasma hover:bg-plasma/10 transition-colors',
            loading && 'opacity-50 cursor-wait'
          )}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Advise'}
        </button>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {assessment && (
        <p className="text-xs text-slate-300 leading-relaxed border-l-2 border-plasma/30 pl-2.5">
          {assessment}
        </p>
      )}

      <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 min-h-0">
        {(recommendations || []).map((rec, i) => {
          const meta = VECTOR_META[rec.vectorClass] || VECTOR_META.continuation;
          const Icon = meta.icon;
          const isExpanded = expandedIndex === i;
          const isHovered = hoveredIndex === i;
          return (
            <div
              key={rec.entryId}
              className={cn(
                'rounded-lg border transition-colors',
                isHovered ? 'border-gold/50 bg-gold/5' : 'border-slate-700/60 bg-slate-900/40'
              )}
              onMouseEnter={() => onHoverRow(i)}
              onMouseLeave={() => onHoverRow(null)}
            >
              <button
                type="button"
                onClick={() => onToggleRow(isExpanded ? null : i)}
                className="w-full flex items-center gap-2 p-2.5 text-left"
              >
                <FactionSigil sigil={rec.book?.factionSigil} alliance={rec.book?.grandAlliance} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-100 truncate">{rec.book?.title || rec.entryId}</p>
                  <div className={cn('inline-flex items-center gap-1 text-[10px] font-tactical tracking-wide uppercase', meta.tint)}>
                    <Icon className="w-3 h-3" />
                    {meta.label}
                  </div>
                </div>
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-2.5 pb-2.5 space-y-1.5 text-xs text-slate-300">
                  {rec.book?.summary && <p className="text-slate-400">{rec.book.summary}</p>}
                  <p>{rec.rationale}</p>
                  {rec.deviationConsequence && (
                    <p className="text-slate-500 italic">{rec.deviationConsequence}</p>
                  )}
                  {rec.interludeAwareness && (
                    <p className="text-slate-500">{rec.interludeAwareness}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenBook(rec.entryId)}
                    className="mt-1 text-[11px] font-tactical tracking-wide uppercase text-gold hover:underline"
                  >
                    Open dossier →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(!recommendations || recommendations.length === 0) && !loading && (
        <p className="text-[11px] text-slate-500 font-tactical tracking-[0.2em] uppercase mt-auto">
          Advisory query — awaiting input
        </p>
      )}
    </div>
  );
}

export default StrategiumAdvisory;
