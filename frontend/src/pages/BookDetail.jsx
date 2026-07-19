import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from 'lib/utils';
import { useArchiveData } from 'context/ArchiveDataContext';
import { FactionMark } from 'components/FactionMark';
import { ViewBackdrop } from 'components/ViewBackdrop';
import { SkullRating } from 'components/SkullRating';
import { ContextDrop } from 'components/ContextDrop';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from 'components/ui/dialog';
import {
  ChevronLeft, MapPin, Clock, User, BookOpen, Check, BookMarked,
} from 'lucide-react';

// Resolve an entryId to its own book. A sub-item id resolves to the sub-item
// itself, with a reference to its omnibus parent for back-navigation/context.
function resolveEntry(phases, entryId) {
  for (const phase of phases) {
    for (const book of phase.books) {
      if (book.entryId === entryId) return { book, phase, parent: null };
      if (Array.isArray(book.contents)) {
        const sub = book.contents.find((c) => c.entryId === entryId);
        if (sub) return { book: sub, phase, parent: book };
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
    projectData, bookProgress, getEntryProgress,
    handleBookStatusChange, handleBookRatingChange,
    isReflectionPending,
    currentReading, handleStartReading,
  } = useArchiveData();

  const resolved = useMemo(
    () => resolveEntry(projectData.phases, entryId),
    [projectData, entryId]
  );

  const [readingPrompt, setReadingPrompt] = useState(false);

  if (!resolved) {
    return (
      <div className="min-h-screen bg-void scanlines flex items-center justify-center p-6">
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

  const { book, phase, parent } = resolved;
  const progress = bookProgress[book.entryId] || {};
  const hasContents = Array.isArray(book.contents) && book.contents.length > 0;

  // Single source of truth for status (ternary for single books, derived
  // ternary for omnibuses from flat sub-item statuses) — see getEntryProgress.
  const ep = getEntryProgress(book);
  const { status, childRead, childTotal, rating } = ep;

  const meta = STATUS_META[status] || STATUS_META.unread;

  // FILE REF line: Phase · Series · Position
  const fileRef = [
    `PHASE ${phase.id}`,
    book.series?.name || null,
    book.series?.orderLabel && /^#?\d/.test(book.series.orderLabel)
      ? (book.series.orderLabel.startsWith('#') ? book.series.orderLabel : `#${book.series.orderLabel}`)
      : null,
  ].filter(Boolean).join('  ·  ');

  // Starting THIS book as reading. If another book is already the current
  // assignment, ask how to handle it first (enforce one-book invariant).
  const otherReading =
    currentReading && currentReading.book.entryId !== book.entryId
      ? currentReading
      : null;

  const onSetReading = () => {
    if (otherReading) {
      setReadingPrompt(true);
    } else {
      handleBookStatusChange(book.entryId, 'reading');
    }
  };

  // Three resolutions for the "other book still reading" case.
  const startAndMarkOldRead = () => {
    handleStartReading(book.entryId, otherReading.book.entryId, 'read');
    setReadingPrompt(false);
  };
  const startAndMarkOldUnread = () => {
    handleStartReading(book.entryId, otherReading.book.entryId, 'unread');
    setReadingPrompt(false);
  };
  const cancelStart = () => setReadingPrompt(false);

  return (
    <ViewBackdrop art="/Gilded_reliquary_vitrine_with_skull_202607041801.jpeg" accent="gold">
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
              {parent && (
                <button
                  type="button"
                  onClick={() => navigate(`/book/${parent.entryId}`)}
                  className="block text-[11px] text-slate-500 font-data tracking-wide mt-1 hover:text-gold transition-colors"
                >
                  PART OF {parent.title}
                </button>
              )}
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

          {/* READ: your layer — rating + reflection (personal_take + marginalia) */}
          {status === 'read' && !hasContents && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="font-tactical text-[11px] tracking-[0.2em] text-auspex/70">
                  YOUR VERDICT
                </h2>
                {isReflectionPending(book.entryId) &&
                 !(bookProgress[book.entryId] && bookProgress[book.entryId].chronicle) && (
                  <span className="text-[9px] font-tactical tracking-widest text-gold/70 border border-gold/30 rounded px-1.5 py-0.5">
                    REFLECTION PENDING
                  </span>
                )}
              </div>
              <SkullRating
                rating={rating}
                onRatingChange={(r) => handleBookRatingChange(book.entryId, r)}
                size="md"
              />

              <ContextDrop book={book} />
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
                  const read = getEntryProgress(c).status === 'read';
                  return (
                    <li key={c.entryId} className="flex items-center gap-2 -mx-2 rounded-md hover:bg-slate-800/50">
                      <button
                        type="button"
                        onClick={() => handleBookStatusChange(c.entryId, read ? 'unread' : 'read')}
                        className="shrink-0 px-2 py-1.5 -mr-2 transition-colors active:scale-[0.99]"
                      >
                        {read
                          ? <Check className="w-4 h-4 text-auspex shrink-0" />
                          : <span className="w-4 h-4 shrink-0 rounded border border-slate-600 block" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/book/${c.entryId}`)}
                        className="flex-1 min-w-0 text-left flex items-center gap-2 text-sm py-1.5 pr-2 transition-colors active:scale-[0.99]"
                      >
                        <span className={cn(read ? 'text-auspex' : 'text-slate-300', c.type === 'short' && 'italic', 'truncate')}>
                          {c.title}
                        </span>
                        {c.series?.name && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-gold/70 ml-auto shrink-0">
                            <BookMarked className="w-3 h-3" />
                            {c.series.name}
                          </span>
                        )}
                      </button>
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
                onClick={onSetReading}
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

      <Dialog open={readingPrompt} onOpenChange={(o) => !o && cancelStart()}>
        <DialogContent className="grimdark-panel border-gold/40 bg-card max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="font-display text-base text-gold tracking-wider text-glow-gold">
              CURRENT ASSIGNMENT ACTIVE
            </DialogTitle>
          </DialogHeader>
          {otherReading && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                <span className="text-gold font-semibold">{otherReading.book.title}</span> is
                still marked as your current reading. You read one book at a time — what
                happened to it?
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={startAndMarkOldRead}
                  className="w-full px-4 py-3 rounded-lg font-bold tracking-wider bg-auspex/15 text-auspex border border-auspex/40 hover:bg-auspex/25 transition-all"
                >
                  MARK IT READ &amp; START THIS
                </button>
                <button
                  onClick={startAndMarkOldUnread}
                  className="w-full px-4 py-3 rounded-lg font-bold tracking-wider bg-slate-800/50 text-slate-300 border border-slate-600 hover:border-gold/40 hover:text-gold transition-all"
                >
                  RESET IT TO UNREAD &amp; START THIS
                </button>
                <button
                  onClick={cancelStart}
                  className="w-full px-4 py-2.5 rounded-lg font-tactical text-xs tracking-widest text-slate-500 border border-transparent hover:text-slate-300 transition-all"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ViewBackdrop>
  );
}

export default BookDetail;
