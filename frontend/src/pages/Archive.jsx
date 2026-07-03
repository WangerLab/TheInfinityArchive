import React, { useState, useCallback } from 'react';
import { cn } from 'lib/utils';
import { Archive as ArchiveIcon, Shield, Swords, Bug, Skull } from 'lucide-react';
import { useArchiveData } from 'context/ArchiveDataContext';
import { RecursiveBookEntry } from 'components/RecursiveBookEntry';

// Grand-alliance filter config — mirrors GlobalHeader's allegiance bar so the
// two surfaces stay semantically identical. ids match books.grandAlliance.
const allianceFilters = [
  { id: 'imperium', label: 'IMPERIUM', icon: Shield, color: 'border-gold text-gold hover:bg-gold/20' },
  { id: 'chaos', label: 'CHAOS', icon: Swords, color: 'border-purple-500 text-purple-400 hover:bg-purple-500/20' },
  { id: 'xenos', label: 'XENOS', icon: Bug, color: 'border-plasma text-plasma hover:bg-plasma/20' },
  { id: 'unaligned', label: 'UNALIGNED', icon: Skull, color: 'border-slate-500 text-slate-400 hover:bg-slate-500/20' },
];

export function Archive() {
  const {
    projectData,
    bookProgress,
    handleBookReadChange,
    handleBookRatingChange,
    handleBookNotesChange,
    handleSubItemReadChange,
    handleSubItemRatingChange,
    handleSubItemNotesChange,
  } = useArchiveData();

  const [activeAlliance, setActiveAlliance] = useState([]);

  // Mirrors PhaseView.handleFilterToggle: multi-select toggle, empty = show all.
  const handleAllianceToggle = useCallback((id) => {
    setActiveAlliance((prev) => {
      if (prev.length === 0) return [id];
      if (prev.includes(id)) return prev.filter((f) => f !== id);
      return [...prev, id];
    });
  }, []);

  // Catalog-wide flat list of all entry-level books across every phase.
  // Keyed by entryId, not title: titles are non-unique across phases
  // (e.g. 'Apocalypse' in P3 and P5), so a title key would collapse two
  // distinct books onto one React element (Sprint E lesson).
  const allBooks = projectData.phases.flatMap((phase) => phase.books);

  // Rule A — per-row on the entry's own grandAlliance; children not inspected.
  const visibleBooks =
    activeAlliance.length === 0
      ? allBooks
      : allBooks.filter((book) => activeAlliance.includes(book.grandAlliance));

  return (
    <div className="min-h-screen bg-slate-950 safe-bottom scanlines">
      <main className="px-4 py-4 pb-32">
        {/* Header */}
        <div className="grimdark-panel rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <ArchiveIcon className="w-5 h-5 text-gold" />
            <h1 className="font-display text-lg text-gold tracking-wider text-glow-gold">
              THE ARCHIVE
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-2 font-data">
            {activeAlliance.length === 0
              ? `${allBooks.length} ENTRIES • CATALOG-WIDE BROWSE`
              : `${visibleBooks.length} / ${allBooks.length} ENTRIES • FILTERED`}
          </p>

          {/* Grand Alliance filter */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-[9px] text-slate-500 font-tactical tracking-[0.15em] mr-1">
              ALLEGIANCE:
            </span>
            {allianceFilters.map((filter) => {
              const Icon = filter.icon;
              const isActive =
                activeAlliance.length === 0 || activeAlliance.includes(filter.id);
              return (
                <button
                  key={filter.id}
                  onClick={() => handleAllianceToggle(filter.id)}
                  className={cn(
                    'touch-target flex items-center gap-1.5 px-3 py-1.5 rounded-md',
                    'border-2 transition-all duration-200',
                    'text-[10px] font-bold tracking-wider',
                    'active:scale-95',
                    filter.color,
                    !isActive && 'opacity-25 grayscale'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{filter.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Flat catalog */}
        {visibleBooks.length === 0 ? (
          <div className="grimdark-panel rounded-lg p-6 text-center">
            <p className="text-sm text-slate-400 font-data">
              NO ENTRIES MATCH THE ACTIVE FILTER
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleBooks.map((book, index) => (
              <RecursiveBookEntry
                key={book.entryId}
                book={book}
                index={index}
                bookData={bookProgress[book.entryId] || {}}
                onReadChange={(isRead) => handleBookReadChange(book.entryId, isRead)}
                onRatingChange={(rating) => handleBookRatingChange(book.entryId, rating)}
                onNotesChange={(notes) => handleBookNotesChange(book.entryId, notes)}
                onSubItemReadChange={handleSubItemReadChange}
                onSubItemRatingChange={handleSubItemRatingChange}
                onSubItemNotesChange={handleSubItemNotesChange}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
