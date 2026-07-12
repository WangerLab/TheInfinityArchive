import React from 'react';
import { cn } from 'lib/utils';
import { Globe } from 'lucide-react';

// Presentational, router-free dossier for the currently-read book. Renders
// summary + sector/POV data grid. The faction line lived here until it proved
// redundant — CurrentAssignment sits directly above it in the header and
// already carries alliance + faction. Mirrors CurrentAssignment's decoupling
// (no navigate import). Renders null when no book. Fields tolerate null/empty
// individually so a sparse book still reads.
export function CurrentBookDossier({ book, className }) {
  if (!book) return null;

  const sector = book.locationSegmentum;
  const pov = book.protagonist;
  const summary = book.summary;
  const hasDataGrid = sector || pov;

  // Nothing worth showing → render nothing (keeps the column clean).
  if (!summary && !hasDataGrid) return null;

  return (
    <div className={cn('grimdark-panel rounded-lg px-4 py-2 flex flex-col justify-center', className)}>
      {summary && (
        <p className="text-[12.5px] text-slate-300 leading-relaxed mb-2.5">
          {summary}
        </p>
      )}

      {hasDataGrid && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] font-data mb-2">
          {sector && (
            <span className="flex items-center gap-1.5">
              <span className="text-slate-500 tracking-[0.1em] flex items-center gap-1">
                <Globe className="w-3 h-3 text-slate-500" /> SECTOR
              </span>
              <span className="text-slate-300">{sector}</span>
            </span>
          )}
          {pov && (
            <span className="flex items-center gap-1.5">
              <span className="text-slate-500 tracking-[0.1em]">POV</span>
              <span className="text-slate-300">{pov}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default CurrentBookDossier;
