import React from 'react';
import { cn } from 'lib/utils';
import { BookOpen, ChevronRight } from 'lucide-react';
import { FactionMark } from './FactionMark';

// The "current assignment" banner — shows the one book currently being read.
// Renders null when nothing is reading. Router-free: the caller supplies
// onOpen(entryId) so this can be reused on the Landing cogitator later.
export function CurrentAssignment({ current, onOpen, className }) {
  if (!current?.book) return null;
  const { book, phase } = current;
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
      <BookOpen className="w-5 h-5 text-gold shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-tactical tracking-[0.2em] text-gold/70">
          CURRENT ASSIGNMENT
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <FactionMark alliance={book.grandAlliance} size="sm" />
          <span className="font-display text-base text-gold truncate">{book.title}</span>
        </div>
        <p className="text-[11px] text-slate-400 font-data mt-0.5 truncate">
          PHASE {phase.id}{book.author ? `  ·  ${book.author}` : ''}
        </p>
      </div>
      <ChevronRight className="w-5 h-5 text-gold/60 shrink-0" />
    </button>
  );
}

export default CurrentAssignment;
