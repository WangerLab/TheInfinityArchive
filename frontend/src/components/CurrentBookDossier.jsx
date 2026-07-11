import React from 'react';
import { cn } from 'lib/utils';
import { Globe } from 'lucide-react';
import { FactionMark, factionLabel } from './FactionMark';

// Presentational, router-free dossier for the currently-read book. Renders
// faction line + summary + sector/POV data grid + mood-tag pills. Mirrors
// CurrentAssignment's decoupling (no navigate import). Renders null when no
// book. Fields tolerate null/empty individually so a sparse book still reads.
export function CurrentBookDossier({ book, className }) {
  if (!book) return null;

  const alliance = book.grandAlliance;
  const label = factionLabel(alliance);
  const sector = book.locationSegmentum;
  const pov = book.protagonist;
  const summary = book.summary;
  const moods = Array.isArray(book.moodTags) ? book.moodTags.slice(0, 5) : [];
  const hasDataGrid = sector || pov;

  // Nothing worth showing → render nothing (keeps the column clean).
  if (!alliance && !summary && !hasDataGrid && moods.length === 0) return null;

  return (
    <div className={cn('grimdark-panel rounded-lg px-4 py-3', className)}>
      {(alliance || book.subFaction) && (
        <div className="flex items-center gap-2 mb-2">
          <FactionMark alliance={alliance} size="sm" />
          {label && (
            <span className="text-[11px] font-tactical tracking-[0.12em] text-purple-300">
              {label.toUpperCase()}
            </span>
          )}
          {book.subFaction && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-[11px] text-slate-300 font-semibold truncate">
                {book.subFaction}
              </span>
            </>
          )}
        </div>
      )}

      {summary && (
        <p className="text-[12.5px] text-slate-300 leading-relaxed mb-2.5">
          {summary}
        </p>
      )}

      {hasDataGrid && (
        <div className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1 text-[11px] font-data mb-2.5">
          {sector && (
            <>
              <span className="text-slate-500 tracking-[0.1em] flex items-center gap-1">
                <Globe className="w-3 h-3 text-slate-500" /> SECTOR
              </span>
              <span className="text-slate-300">{sector}</span>
            </>
          )}
          {pov && (
            <>
              <span className="text-slate-500 tracking-[0.1em]">POV</span>
              <span className="text-slate-300">{pov}</span>
            </>
          )}
        </div>
      )}

      {moods.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {moods.map((m) => (
            <span
              key={m}
              className="text-[10px] px-2 py-0.5 rounded-full border border-slate-600/40 text-slate-400"
            >
              {m}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default CurrentBookDossier;
