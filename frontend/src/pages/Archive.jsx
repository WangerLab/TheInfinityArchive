import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from 'lib/utils';
import { Archive as ArchiveIcon } from 'lucide-react';
import { useArchiveData } from 'context/ArchiveDataContext';
import { BookRow } from 'components/BookRow';
import { ViewBackdrop } from 'components/ViewBackdrop';

// Only moods with >= this many entry-level hits become filter chips. Keeps the
// cloud to the shared, filter-worthy vocabulary and drops the long tail of rare
// moods (those belong to the AI-companion context blob, not a filter control).
const MOOD_MIN_HITS = 8;

export function Archive() {
  const { projectData, getEntryProgress } = useArchiveData();
  const navigate = useNavigate();

  const [activeMoods, setActiveMoods] = useState([]);

  const handleMoodToggle = useCallback((mood) => {
    setActiveMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
  }, []);

  // Catalog-wide flat list of all entry-level books across every phase.
  // Keyed by entryId, not title: titles are non-unique across phases
  // (e.g. 'Apocalypse' in P3 and P5), so a title key would collapse two
  // distinct books onto one React element (Sprint E lesson). Memoised so the
  // reference is stable across renders (the mood/visible memos depend on it).
  const allBooks = useMemo(
    () => projectData.phases.flatMap((phase) => phase.books),
    [projectData]
  );

  // Data-driven mood chips: count each mood over entry-level books (Rule A),
  // keep the shared vocabulary (>= MOOD_MIN_HITS), sort by frequency desc.
  const moodChips = useMemo(() => {
    const counts = new Map();
    allBooks.forEach((book) => {
      (book.moodTags || []).forEach((m) => counts.set(m, (counts.get(m) || 0) + 1));
    });
    return [...counts.entries()]
      .filter(([, n]) => n >= MOOD_MIN_HITS)
      .sort((a, b) => b[1] - a[1])
      .map(([mood, count]) => ({ mood, count }));
  }, [allBooks]);

  // Mood: has-any-of (array intersection) the selected moods. An empty set
  // means the filter is inactive.
  const visibleBooks = useMemo(() => {
    return allBooks.filter((book) => {
      const moodOk =
        activeMoods.length === 0 ||
        (book.moodTags || []).some((m) => activeMoods.includes(m));
      return moodOk;
    });
  }, [allBooks, activeMoods]);

  const isFiltered = activeMoods.length > 0;

  return (
    <ViewBackdrop art="/Operator_console_with_sweep-scope_2K_202607041801.jpeg" accent="auspex">
      <main className="px-4 py-4">
        {/* Header */}
        <div className="grimdark-panel rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <ArchiveIcon className="w-5 h-5 text-gold" />
            <h1 className="font-display text-lg text-gold tracking-wider text-glow-gold">
              THE ARCHIVE
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-2 font-data">
            {isFiltered
              ? `${visibleBooks.length} / ${allBooks.length} ENTRIES • FILTERED`
              : `${allBooks.length} ENTRIES • CATALOG-WIDE BROWSE`}
          </p>

          {/* Mood filter — data-driven chips */}
          <div className="flex items-start gap-2 mt-3 flex-wrap">
            <span className="text-[9px] text-slate-500 font-tactical tracking-[0.15em] mr-1 mt-1.5">
              MOOD:
            </span>
            {moodChips.map(({ mood, count }) => {
              const isSelected = activeMoods.includes(mood);
              return (
                <button
                  key={mood}
                  onClick={() => handleMoodToggle(mood)}
                  className={cn(
                    'touch-target flex items-center gap-1.5 px-2.5 py-1 rounded-md',
                    'border transition-all duration-200 active:scale-95',
                    'text-[10px] font-medium tracking-wide',
                    isSelected
                      ? 'bg-plasma/30 text-plasma border-plasma'
                      : 'bg-plasma/10 text-plasma/70 border-plasma/30 hover:text-plasma hover:border-plasma/60'
                  )}
                >
                  <span>{mood}</span>
                  <span className="text-plasma/50 font-data">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Flat catalog */}
        <div className="lg:h-[calc(100vh-270px)] lg:overflow-y-auto lg:pr-2">
          {visibleBooks.length === 0 ? (
            <div className="grimdark-panel rounded-lg p-6 text-center">
              <p className="text-sm text-slate-400 font-data">
                NO ENTRIES MATCH THE ACTIVE FILTER
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {visibleBooks.map((book) => (
                <BookRow
                  key={book.entryId}
                  book={book}
                  entryProgress={getEntryProgress(book)}
                  onOpen={(entryId) => navigate('/book/' + entryId)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </ViewBackdrop>
  );
}
