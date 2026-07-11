import React from 'react';
import { cn } from 'lib/utils';
import { Check, BookOpen } from 'lucide-react';
import { FactionSigil } from './FactionSigil';
import { SkullRating } from './SkullRating';

// Lean list row — a status GLIMPSE plus light context. Click opens the dossier
// via onOpen(entryId); the row itself imports no router. Deep content (summary,
// mood tags, sub-items) still lives in the dossier. Purely presentational:
// status derivation lives in the data layer (see getEntryProgress).
//
// entryProgress shape (from ArchiveDataContext.getEntryProgress(book)):
//   { status, childRead, childTotal, rating }

// Primary POV-bearer faction from the semicolon-separated freetext sub_faction.
// Takes the first TOP-LEVEL value (semicolons inside parentheses don't split),
// then drops a trailing parenthetical qualifier so the row reads the clean name
// ("Grey Knights (666th;Squad Castian);Ordo Malleus" -> "Grey Knights").
function primaryFaction(subFaction) {
  if (!subFaction) return null;
  let depth = 0;
  let end = subFaction.length;
  for (let i = 0; i < subFaction.length; i++) {
    const ch = subFaction[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ';' && depth === 0) { end = i; break; }
  }
  const first = subFaction.slice(0, end).trim();
  return first.replace(/\s*\([^)]*\)\s*$/, '').trim() || null;
}

export function BookRow({ book, entryProgress, onOpen }) {
  const hasContents = Array.isArray(book.contents) && book.contents.length > 0;

  const { status, childRead, childTotal, rating } = entryProgress;
  const isRead = status === 'read';
  const isReading = status === 'reading';
  const omnibusComplete = hasContents && childTotal > 0 && childRead === childTotal;

  const faction = primaryFaction(book.subFaction);
  const pov = book.protagonist;
  const sector =
    book.locationSegmentum && book.locationSegmentum.toUpperCase() !== 'UNKNOWN'
      ? book.locationSegmentum
      : null;
  const hasDataBlock = !hasContents && (pov || sector);

  return (
    <button
      type="button"
      onClick={() => onOpen?.(book.entryId)}
      className={cn(
        'w-full text-left rounded-lg p-3 flex items-center gap-4 transition-all duration-200',
        'bg-gradient-to-r from-slate-900/80 to-transparent border-l-3',
        'hover:from-slate-900 active:scale-[0.99]',
        isRead ? 'border-l-auspex bg-auspex/5'
          : isReading ? 'border-l-gold bg-gold/5'
          : 'border-l-slate-700'
      )}
    >
      {/* Faction sigil — leading, alliance-tinted; falls back to the alliance mark */}
      <FactionSigil sigil={book.factionSigil} alliance={book.grandAlliance} size="xl" />

      {/* Title + author + primary faction */}
      <div className="flex-1 min-w-0">
        <h4 className={cn(
          'font-semibold leading-tight truncate',
          book.type === 'short' ? 'text-sm italic' : 'text-base',
          isRead ? 'text-auspex' : isReading ? 'text-gold' : 'text-slate-100'
        )}>
          {book.title}
        </h4>
        {book.author && (
          <p className="text-xs text-slate-500 truncate mt-0.5">{book.author}</p>
        )}
        {faction && (
          <p className="text-[11px] text-slate-300 font-medium truncate mt-1">{faction}</p>
        )}
      </div>

      {/* Right context block: POV/Sector for books, band count for omnibus */}
      {hasDataBlock ? (
        <div className="hidden md:flex flex-col gap-0.5 shrink-0 min-w-[150px] max-w-[190px] pl-4 border-l border-slate-400/12">
          {pov && (
            <div className="flex items-baseline gap-2 text-[11px] font-data">
              <span className="text-slate-600 tracking-[0.1em] shrink-0">POV</span>
              <span className="text-slate-400 truncate">{pov}</span>
            </div>
          )}
          {sector && (
            <div className="flex items-baseline gap-2 text-[11px] font-data">
              <span className="text-slate-600 tracking-[0.1em] shrink-0">SECTOR</span>
              <span className="text-slate-400 truncate">{sector}</span>
            </div>
          )}
        </div>
      ) : hasContents && childTotal > 0 ? (
        <div className="hidden md:flex items-center shrink-0 min-w-[150px] max-w-[190px] pl-4 border-l border-slate-400/12">
          <span className="text-[10px] font-data tracking-[0.15em] text-slate-600">
            OMNIBUS · {childTotal} BÄNDE
          </span>
        </div>
      ) : null}

      {/* Status glimpse (far right) */}
      <div className="flex items-center gap-2 shrink-0">
        {hasContents ? (
          <span className={cn(
            'text-xs font-bold font-data',
            omnibusComplete ? 'text-auspex' : 'text-slate-400'
          )}>
            {childRead}/{childTotal}
          </span>
        ) : isRead ? (
          <>
            {rating > 0 && <SkullRating rating={rating} readonly size="sm" />}
            <Check className="w-5 h-5 text-auspex" />
          </>
        ) : isReading ? (
          <BookOpen className="w-5 h-5 text-gold" />
        ) : null}
      </div>
    </button>
  );
}

export default BookRow;
