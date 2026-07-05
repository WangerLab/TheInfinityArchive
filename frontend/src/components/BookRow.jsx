import React from 'react';
import { cn } from 'lib/utils';
import { Check, BookOpen } from 'lucide-react';
import { FactionMark } from './FactionMark';
import { SkullRating } from './SkullRating';

// Lean list row — a status GLIMPSE, not depth. Click opens the dossier via
// onOpen(entryId); the row itself imports no router. Depth (summary, mood
// tags, sub-items) lives in the dossier, not here.
//
// progress shape (per entryId, from the data layer):
//   { status, isRead, rating, startedAt, contents? }  — entry-level
// For omnibuses, sub-item read state lives in progress.contents[subEntryId].
export function BookRow({ book, progress = {}, onOpen }) {
  const hasContents = Array.isArray(book.contents) && book.contents.length > 0;

  // Omnibus completion from sub-item progress (sub-items stay binary).
  const isSubRead = (d) => (typeof d === 'boolean' ? d : d?.isRead || false);
  const childRead = hasContents
    ? book.contents.filter((c) => isSubRead(progress.contents?.[c.entryId])).length
    : 0;
  const childTotal = hasContents ? book.contents.length : 0;
  const omnibusComplete = hasContents && childTotal > 0 && childRead === childTotal;

  const status = hasContents
    ? (omnibusComplete ? 'read' : 'unread')
    : (progress.status ?? (progress.isRead ? 'read' : 'unread'));

  const isRead = status === 'read';
  const isReading = status === 'reading';
  const rating = progress.rating || 0;

  return (
    <button
      type="button"
      onClick={() => onOpen?.(book.entryId)}
      className={cn(
        'w-full text-left rounded-lg p-3 flex items-center gap-3 transition-all duration-200',
        'bg-gradient-to-r from-slate-900/80 to-transparent border-l-3',
        'hover:from-slate-900 active:scale-[0.99]',
        isRead ? 'border-l-auspex bg-auspex/5'
          : isReading ? 'border-l-gold bg-gold/5'
          : 'border-l-slate-700'
      )}
    >
      {/* Faction mark — leading, small, tinted */}
      <FactionMark alliance={book.grandAlliance} size="sm" />

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
