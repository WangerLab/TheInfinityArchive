import React from 'react';
import { cn } from 'lib/utils';
import { ChevronRight } from 'lucide-react';
import { FactionSigil } from './FactionSigil';
import { FactionMark, factionLabel } from './FactionMark';

// Primary POV-bearer faction from the semicolon-separated freetext sub_faction.
// First TOP-LEVEL value (semicolons inside parens don't split), trailing
// parenthetical qualifier dropped. Mirrors BookRow.primaryFaction.
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

// The "current assignment" banner — shows the one book currently being read.
// Renders null when nothing is reading. Router-free: the caller supplies
// onOpen(entryId) so this can be reused on the Landing cogitator later.
export function CurrentAssignment({ current, onOpen, className }) {
  if (!current?.book) return null;
  const { book, phase } = current;
  const alliance = book.grandAlliance;
  const allianceName = factionLabel(alliance);
  const faction = primaryFaction(book.subFaction);

  return (
    <button
      type="button"
      onClick={() => onOpen?.(book.entryId)}
      className={cn(
        'w-full text-left rounded-lg p-4 flex items-center gap-3 transition-all',
        'grimdark-panel border border-gold/40 hover:border-gold/70',
        'bg-gradient-to-r from-gold/10 to-transparent active:scale-[0.99]',
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-tactical tracking-[0.2em] text-gold/70">
          CURRENT ASSIGNMENT
        </p>

        {/* Title with enlarged alliance sigil */}
        <div className="flex items-center gap-2.5 mt-0.5">
          <FactionMark alliance={alliance} size="lg" />
          <span className="font-display text-base text-gold truncate">{book.title}</span>
        </div>

        {/* Faction line: alliance sigil + name + faction sigil + name */}
        {(alliance || faction) && (
          <div className="flex items-center gap-2 mt-1.5 text-[12px]">
            {allianceName && (
              <span className="font-tactical tracking-[0.1em] text-purple-300">
                {allianceName.toUpperCase()}
              </span>
            )}
            {faction && (
              <>
                <span className="text-slate-600">·</span>
                <FactionSigil
                  sigil={book.factionSigil}
                  alliance={alliance}
                  size="sm"
                />
                <span className="text-slate-200 font-semibold truncate">{faction}</span>
              </>
            )}
          </div>
        )}

        {/* Omnibus / phase context */}
        <p className="text-[11px] text-slate-400 font-data mt-1.5 truncate">
          {book.parentTitle
            ? `${book.parentTitle}  ·  PHASE ${phase.id}`
            : `PHASE ${phase.id}${book.author ? `  ·  ${book.author}` : ''}`}
        </p>
      </div>
      <ChevronRight className="w-5 h-5 text-gold/60 shrink-0" />
    </button>
  );
}

export default CurrentAssignment;
