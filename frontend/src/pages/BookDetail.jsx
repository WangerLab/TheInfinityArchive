import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from 'lib/utils';
import { useArchiveData } from 'context/ArchiveDataContext';
import { FactionMark } from 'components/FactionMark';
import { SkullRating } from 'components/SkullRating';
import {
  ChevronLeft, MapPin, Clock, User, BookOpen, Check, BookMarked,
} from 'lucide-react';

// Resolve an entryId to its ENTRY-level book. A sub-item id resolves to its
// parent entry (the dossier is entry-level; sub-items have no own dossier).
function resolveEntry(phases, entryId) {
  for (const phase of phases) {
    for (const book of phase.books) {
      if (book.entryId === entryId) return { book, phase };
      if (Array.isArray(book.contents)) {
        if (book.contents.some((c) => c.entryId === entryId)) {
          return { book, phase };
        }
      }
    }
  }
  return null;
}

const STATUS_META = {
  unread:  { label: 'UNREAD',      tint: 'text-slate-400' },
  reading: { label: 'IN PROGRESS', tint: 'text-gold'      },
  read:    { label: 'COMPLETED',   tint: 'text-auspex'    },
};

export function BookDetail() {
  const { entryId } = useParams();
  const navigate = useNavigate();
  const {
    projectData, bookProgress,
    handleBookStatusChange, handleBookRatingChange,
  } = useArchiveData();

  const resolved = useMemo(
    () => resolveEntry(projectData.phases, entryId),
    [projectData, entryId]
  );

  if (!resolved) {
    return (
      <div className="min-h-screen bg-slate-950 scanlines flex items-center justify-center p-6">
        <div className="grimdark-panel rounded-lg p-6 text-center max-w-sm">
          <p className="font-display text-lg text-gold tracking-wider">NO SUCH RECORD</p>
          <p className="text-sm text-slate-400 mt-2 font-data">entry_id: {entryId}</p>
          <button
            onClick={() => navigate('/archive')}
            className="mt-4 px-5 py-2.5 grimdark-panel rounded-lg font-bold text-gold tracking-wider hover:glow-gold transition-all"
          >
            RETURN TO ARCHIVE
          </button>
        </div>
      </div>
    );
  }

  const { book, phase } = resolved;
  const progress = bookProgress[book.entryId] || {};
  const hasContents = Array.isArray(book.contents) && book.contents.length > 0;

  // Omnibus status derives from sub-item completion (sub-items stay binary);
  // single books use their own ternary status.
  const isSubRead = (d) => (typeof d === 'boolean' ? d : d?.isRead || false);
  const childRead = hasContents
    ? book.contents.filter((c) => isSubRead(progress.contents?.[c.entryId])).length
    : 0;
  const childTotal = hasContents ? book.contents.length : 0;
  const omnibusComplete = hasContents && childTotal > 0 && childRead === childTotal;

  const status = hasContents
    ? (omnibusComplete ? 'read' : 'unread')
    : (progress.status ?? (progress.isRead ? 'read' : 'unread'));

  const meta = STATUS_META[status] || STATUS_META.unread;
  const rating = progress.rating || 0;

  // FILE REF line: Phase · Series · Position
  const fileRef = [
    `PHASE ${phase.id}`,
    book.series?.name || null,
    book.series?.orderLabel && /^#?\d/.test(book.series.orderLabel)
      ? (book.series.orderLabel.startsWith('#') ? book.series.orderLabel : `#${book.series.orderLabel}`)
      : null,
  ].filter(Boolean).join('  ·  ');

  return (
    <div className="min-h-screen bg-slate-950 scanlines safe-bottom">
      <main className="px-4 py-4 pb-32 max-w-3xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-tactical tracking-widest text-slate-400 hover:text-gold transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          BACK
        </button>

        {/* Header band */}
        <div className="grimdark-panel rounded-lg p-5">
          <div className="flex items-start gap-3">
            <FactionMark alliance={book.grandAlliance} size="lg" title={book.grandAlliance} />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl text-gold leading-tight text-glow-gold">
                {book.title}
              </h1>
              {book.author && (
                <p className="text-sm text-slate-300 mt-1">{book.author}</p>
              )}
              {fileRef && (
                <p className="text-[11px] text-slate-500 font-data tracking-wide mt-2">
                  {fileRef}
                </p>
              )}
            </div>
            <span className={cn('text-[10px] font-tactical tracking-widest shrink-0', meta.tint)}>
              {meta.label}
            </span>
          </div>

          {/* Location / date / protagonist */}
          {(book.locationPrimary || book.inUniverseDate || book.protagonist) && (
            <div className="flex items-center gap-4 mt-4 flex-wrap text-xs">
              {book.locationPrimary && (
                <span className="flex items-center gap-1 text-slate-400">
                  <MapPin className="w-3 h-3" />
                  {book.locationPrimary}{book.locationSegmentum ? ` · ${book.locationSegmentum}` : ''}
                </span>
              )}
              {book.inUniverseDate && (
                <span className="flex items-center gap-1 text-plasma">
                  <Clock className="w-3 h-3" />
                  {book.inUniverseDate}
                </span>
              )}
              {book.protagonist && (
                <span className="flex items-center gap-1 text-slate-400">
                  <User className="w-3 h-3" />
                  {book.protagonist}
                </span>
              )}
            </div>
          )}
        </div>

        {/* State-machine body */}
        <div className="grimdark-panel rounded-lg p-5 mt-4">
          {/* UNREAD / READING: what awaits you */}
          {status !== 'read' && (
            <>
              {book.summary && (
                <>
                  <h2 className="font-tactical text-[11px] tracking-[0.2em] text-gold/70 mb-2">
                    WHAT AWAITS YOU
                  </h2>
                  <p className="text-sm text-slate-300 leading-relaxed">{book.summary}</p>
                </>
              )}
              {book.moodTags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {book.moodTags.map((tag, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 bg-plasma/20 text-plasma rounded border border-plasma/40 font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {status === 'reading' && progress.startedAt && (
                <p className="text-xs text-gold font-data mt-4 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  IN PROGRESS
                </p>
              )}
            </>
          )}

          {/* READ: your layer — rating (reflection deferred to Sprint C) */}
          {status === 'read' && !hasContents && (
            <>
              <h2 className="font-tactical text-[11px] tracking-[0.2em] text-auspex/70 mb-3">
                YOUR VERDICT
              </h2>
              <SkullRating
                rating={rating}
                onRatingChange={(r) => handleBookRatingChange(book.entryId, r)}
                size="md"
              />
              <p className="text-[11px] text-slate-500 font-data mt-4">
                Reflection capture arrives in a later rite.
              </p>
            </>
          )}

          {/* Omnibus: sub-item completion (binary, no per-item dossier) */}
          {hasContents && (
            <>
              <h2 className="font-tactical text-[11px] tracking-[0.2em] text-gold/70 mb-3">
                CONTENTS — {childRead}/{childTotal} COMPLETE
              </h2>
              <ul className="space-y-1.5">
                {book.contents.map((c) => {
                  const read = isSubRead(progress.contents?.[c.entryId]);
                  return (
                    <li key={c.entryId} className="flex items-center gap-2 text-sm">
                      {read
                        ? <Check className="w-4 h-4 text-auspex shrink-0" />
                        : <span className="w-4 h-4 shrink-0 rounded border border-slate-600" />}
                      <span className={cn(read ? 'text-auspex' : 'text-slate-300', c.type === 'short' && 'italic')}>
                        {c.title}
                      </span>
                      {c.series?.name && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gold/70 ml-auto shrink-0">
                          <BookMarked className="w-3 h-3" />
                          {c.series.name}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* Action strip — status-driven primary action (entry-level single books only) */}
        {!hasContents && (
          <div className="grimdark-panel rounded-lg p-4 mt-4 flex items-center gap-3">
            {status === 'unread' && (
              <button
                onClick={() => handleBookStatusChange(book.entryId, 'reading')}
                className="flex-1 px-4 py-3 rounded-lg font-bold tracking-wider bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25 transition-all flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                SET AS READING
              </button>
            )}
            {status === 'reading' && (
              <button
                onClick={() => handleBookStatusChange(book.entryId, 'read')}
                className="flex-1 px-4 py-3 rounded-lg font-bold tracking-wider bg-auspex/15 text-auspex border border-auspex/40 hover:bg-auspex/25 transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                MARK READ
              </button>
            )}
            {status === 'read' && (
              <button
                onClick={() => handleBookStatusChange(book.entryId, 'unread')}
                className="px-4 py-2.5 rounded-lg font-tactical text-xs tracking-widest text-slate-400 border border-slate-700 hover:text-gold hover:border-gold/40 transition-all"
              >
                RESET TO UNREAD
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default BookDetail;
