import React from 'react';
import { cn } from 'lib/utils';
import { Check, BookOpen } from 'lucide-react';
import { FactionSigil } from './FactionSigil';
import { SkullRating } from './SkullRating';

// Lean list row — status GLIMPSE plus light context. Click opens the dossier
// via onOpen(entryId); the row imports no router. Deep content (summary, mood
// tags, sub-items) lives in the dossier. Purely presentational: status
// derivation lives in the data layer (see getEntryProgress).

// Primary POV-bearer faction from the semicolon-separated freetext sub_faction.
// First TOP-LEVEL value (semicolons inside parens don't split), trailing
// parenthetical qualifier dropped ("Grey Knights (666th;...)" -> "Grey Knights").
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

// Human-readable composition of an omnibus from its children's types, e.g.
// "3 novels + 1 short story". Pluralised, ordered novel > novella > short
// story > anthology. Returns null if no children.
const TYPE_LABEL = {
  novel:       ['novel', 'novels'],
  novella:     ['novella', 'novellas'],
  short_story: ['short story', 'short stories'],
  short:       ['short story', 'short stories'],
  anthology:   ['anthology', 'anthologies'],
};
const TYPE_ORDER = ['novel', 'novella', 'short_story', 'short', 'anthology'];

function composition(contents) {
  if (!Array.isArray(contents) || contents.length === 0) return null;
  const counts = new Map();
  for (const c of contents) {
    const t = c.type || 'novel';
    counts.set(t, (counts.get(t) || 0) + 1);
  }
  const parts = [];
  for (const t of TYPE_ORDER) {
    const n = counts.get(t);
    if (!n) continue;
    const label = TYPE_LABEL[t] || [t, t + 's'];
    parts.push(`${n} ${n === 1 ? label[0] : label[1]}`);
  }
  // Any unmapped types appended last.
  for (const [t, n] of counts) {
    if (TYPE_ORDER.includes(t)) continue;
    parts.push(`${n} ${t}`);
  }
  return parts.join(' + ') || null;
}

export function BookRow({ book, entryProgress, onOpen }) {
  const hasContents = Array.isArray(book.contents) && book.contents.length > 0;

  const { status, childRead, childTotal, rating } = entryProgress;
  const isRead = status === 'read';
  const isReading = status === 'reading';
  const omnibusComplete = hasContents && childTotal > 0 && childRead === childTotal;

  // Books read their own sub_faction; omnibus parents use the derived label.
  const faction = hasContents
    ? (book.derivedFaction || primaryFaction(book.subFaction))
    : primaryFaction(book.subFaction);

  const pov = book.protagonist;
  const sector =
    book.locationSegmentum && book.locationSegmentum.toUpperCase() !== 'UNKNOWN'
      ? book.locationSegmentum
      : null;

  const comp = hasContents ? composition(book.contents) : null;
  const hasDataBlock = (!hasContents && (pov || sector)) || (hasContents && comp);

  return (
    <button
      type="button"
      onClick={() => onOpen?.(book.entryId)}
      className={cn(
        'w-full text-left rounded-lg p-3 flex items-center gap-3.5 transition-all duration-200',
        'bg-gradient-to-r from-slate-900/80 to-transparent border-l-3',
        'hover:from-slate-900 active:scale-[0.99]',
        isRead ? 'border-l-auspex bg-auspex/5'
          : isReading ? 'border-l-gold bg-gold/5'
          : 'border-l-slate-700'
      )}
    >
      {/* Faction sigil — leading, 40px, alliance-tinted; falls back to the mark */}
      <FactionSigil sigil={book.factionSigil} alliance={book.grandAlliance} size="xxl" />

      {/* Title block — fixed width so the data block sits left with a gap */}
      <div className="w-[300px] shrink-0 min-w-0">
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

      {/* Context block — left, with gap + divider; POV/Sector or omnibus comp */}
      {hasDataBlock && (
        <div className="hidden md:flex flex-col gap-0.5 shrink-0 min-w-0 w-[170px] pl-5 border-l border-slate-400/15">
          {hasContents ? (
            <span className="text-[11px] font-data tracking-[0.06em] text-slate-500">
              {comp}
            </span>
          ) : (
            <>
              {pov && (
                <div className="flex items-baseline gap-2 text-[12px] font-data">
                  <span className="text-slate-500 tracking-[0.1em] min-w-[48px]">POV</span>
                  <span className="text-slate-300 truncate min-w-0 flex-1">{pov}</span>
                </div>
              )}
              {sector && (
                <div className="flex items-baseline gap-2 text-[12px] font-data">
                  <span className="text-slate-500 tracking-[0.1em] min-w-[48px]">SECTOR</span>
                  <span className="text-slate-300 truncate min-w-0 flex-1">{sector}</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Spacer pushes status to the far right */}
      <div className="flex-1" />

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
