import React from 'react';
import { cn } from 'lib/utils';
import { Check, BookOpen } from 'lucide-react';
import { FactionSigil } from './FactionSigil';
import { SkullRating } from './SkullRating';

// Lean list row — a status GLIMPSE, not depth. Click opens the dossier via
// onOpen(entryId); the row itself imports no router. Depth (summary, mood
// tags, sub-items) lives in the dossier, not here. Purely presentational:
// status derivation lives in the data layer (see getEntryProgress).
//
// entryProgress shape (from ArchiveDataContext.getEntryProgress(book)):
//   { status, childRead, childTotal, rating }
export function BookRow({ book, entryProgress, onOpen }) {
  const hasContents = Array.isArray(book.contents) && book.contents.length > 0;

  const { status, childRead, childTotal, rating } = entryProgress;
  const isRead = status === 'read';
  const isReading = status === 'reading';
  const omnibusComplete = hasContents && childTotal > 0 && childRead === childTotal;

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
      {/* Faction sigil — leading, small, alliance-tinted; falls back to the alliance mark */}
      <FactionSigil sigil={book.factionSigil} alliance={book.grandAlliance} size="xl" />

      {/* Title + optional author */}
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
      </div>

      {/* Status glimpse (right side) */}
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
