import React from 'react';
import { Archive as ArchiveIcon } from 'lucide-react';
import { useArchiveData } from 'context/ArchiveDataContext';
import { RecursiveBookEntry } from 'components/RecursiveBookEntry';

export function Archive() {
  const {
    projectData,
    bookProgress,
    globalStats,
    handleBookReadChange,
    handleBookRatingChange,
    handleBookNotesChange,
    handleSubItemReadChange,
    handleSubItemRatingChange,
    handleSubItemNotesChange,
  } = useArchiveData();

  // Catalog-wide flat list of all entry-level books across every phase.
  // Keyed by entryId, not title: titles are non-unique across phases
  // (e.g. 'Apocalypse' in P3 and P5), so a title key would collapse two
  // distinct books onto one React element (Sprint E lesson).
  const allBooks = projectData.phases.flatMap((phase) => phase.books);

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
            {allBooks.length} ENTRIES • {globalStats.totalItems} ITEMS • CATALOG-WIDE BROWSE
          </p>
        </div>

        {/* Flat catalog */}
        <div className="space-y-2">
          {allBooks.map((book, index) => (
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
      </main>
    </div>
  );
}
