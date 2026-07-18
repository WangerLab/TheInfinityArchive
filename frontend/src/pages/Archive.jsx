import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive as ArchiveIcon } from 'lucide-react';
import { useArchiveData } from 'context/ArchiveDataContext';
import { BookRow } from 'components/BookRow';
import { ViewBackdrop } from 'components/ViewBackdrop';
import { FilterDropdown } from 'components/FilterDropdown';
import { FactionSigil, SIGIL_ALLIANCE, SIGIL_LABEL } from 'components/FactionSigil';
import { FactionMark } from 'components/FactionMark';

// Only moods at or above this many entry-level hits become filter options. The
// long tail of rare moods is context for the AI companion, not a filter control.
const MOOD_MIN_HITS = 8;

// Eleven entries carry no faction_sigil — every one of them unaligned, with no
// faction to name (Rogue Trader retinues, anthologies, Warhammer Horror). Without
// a sentinel they would be unreachable from the faction filter, so they get an
// option of their own rather than quietly falling out of the catalog.
const NO_FACTION = '__none__';

// Display order of the four grand alliances. Frequency would shuffle them run to
// run; this is the order the setting itself implies.
const ALLIANCE_ORDER = ['imperium', 'chaos', 'xenos', 'unaligned'];
const ALLIANCE_LABEL = {
  imperium: 'Imperium',
  chaos: 'Chaos',
  xenos: 'Xenos',
  unaligned: 'Unaligned',
};

export function Archive() {
  const { projectData, getEntryProgress } = useArchiveData();
  const navigate = useNavigate();

  const [activeAlliances, setActiveAlliances] = useState([]);
  const [activeFactions, setActiveFactions] = useState([]);
  const [activeMoods, setActiveMoods] = useState([]);

  // One toggle shape for all three: present -> drop, absent -> add. Empty means
  // the filter is off, which is not the same as "nothing selected shows nothing".
  const toggle = (setter) => (value) =>
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );

  const handleAllianceToggle = useCallback(toggle(setActiveAlliances), []);
  const handleFactionToggle = useCallback(toggle(setActiveFactions), []);
  const handleMoodToggle = useCallback(toggle(setActiveMoods), []);

  const clearAlliances = useCallback(() => setActiveAlliances([]), []);
  const clearFactions = useCallback(() => setActiveFactions([]), []);
  const clearMoods = useCallback(() => setActiveMoods([]), []);

  // Catalog-wide flat list of all entry-level books across every phase, minus
  // the cross-listings. A novel the reading plan places in two phases has a row
  // in each; the phase view is right to show both, but flattening the phases
  // turns the second row into a duplicate of the first. duplicate_of names the
  // canonical row, so a row that has one is a pointer and not an entry.
  //
  // Keyed by entryId, not title: titles are non-unique across phases, so a title
  // key would collapse two distinct books onto one React element (Sprint E).
  const allBooks = useMemo(
    () =>
      projectData.phases
        .flatMap((phase) => phase.books)
        .filter((book) => !book.duplicateOf)
        .flatMap((book) =>
          Array.isArray(book.contents) && book.contents.length > 0
            ? book.contents.map((child) => ({
                ...child,
                parentTitle: book.title,
                parentEntryId: book.entryId,
              }))
            : [book]
        ),
    [projectData]
  );

  // Alliance options: fixed four, in setting order, counted over the catalog.
  const allianceOptions = useMemo(() => {
    const counts = new Map();
    allBooks.forEach((b) => counts.set(b.grandAlliance, (counts.get(b.grandAlliance) || 0) + 1));
    return ALLIANCE_ORDER
      .filter((a) => counts.get(a))
      .map((a) => ({
        value: a,
        label: ALLIANCE_LABEL[a],
        count: counts.get(a),
        leading: <FactionMark alliance={a} size="md" />,
      }));
  }, [allBooks]);

  // Faction options: grouped under the sigil's OWN alliance, not the book's. A
  // book can be about one side and told from the other — the sigil names the
  // teller, and that is what this filter selects on.
  const factionOptions = useMemo(() => {
    const counts = new Map();
    allBooks.forEach((b) => {
      const key = b.factionSigil || NO_FACTION;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    const out = [];
    ALLIANCE_ORDER.forEach((alliance) => {
      [...counts.entries()]
        .filter(([sigil]) => sigil !== NO_FACTION && SIGIL_ALLIANCE[sigil] === alliance)
        .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
        .forEach(([sigil, count]) => {
          out.push({
            value: sigil,
            label: SIGIL_LABEL[sigil] || sigil,
            count,
            group: ALLIANCE_LABEL[alliance],
            leading: <FactionSigil sigil={sigil} alliance={alliance} size="md" />,
          });
        });
    });

    if (counts.get(NO_FACTION)) {
      out.push({
        value: NO_FACTION,
        label: 'No faction',
        count: counts.get(NO_FACTION),
        group: 'Unaligned',
      });
    }
    return out;
  }, [allBooks]);

  // Mood options: counted over entry-level books, shared vocabulary only,
  // most frequent first.
  const moodOptions = useMemo(() => {
    const counts = new Map();
    allBooks.forEach((book) => {
      (book.moodTags || []).forEach((m) => counts.set(m, (counts.get(m) || 0) + 1));
    });
    return [...counts.entries()]
      .filter(([, n]) => n >= MOOD_MIN_HITS)
      .sort((a, b) => b[1] - a[1])
      .map(([mood, count]) => ({ value: mood, label: mood, count }));
  }, [allBooks]);

  // Three filters, AND-combined. Within one filter the selections are OR: two
  // factions widen the result, they do not narrow it to their intersection —
  // no book has two POV factions, so AND within a filter would always be empty.
  const visibleBooks = useMemo(() => {
    return allBooks.filter((book) => {
      const allianceOk =
        activeAlliances.length === 0 || activeAlliances.includes(book.grandAlliance);
      const factionOk =
        activeFactions.length === 0 ||
        activeFactions.includes(book.factionSigil || NO_FACTION);
      const moodOk =
        activeMoods.length === 0 ||
        (book.moodTags || []).some((m) => activeMoods.includes(m));
      return allianceOk && factionOk && moodOk;
    });
  }, [allBooks, activeAlliances, activeFactions, activeMoods]);

  const isFiltered =
    activeAlliances.length > 0 || activeFactions.length > 0 || activeMoods.length > 0;

  return (
    <ViewBackdrop art="/Operator_console_with_sweep-scope_2K_202607041801.jpeg" accent="auspex">
      <main className="px-4 py-4">
        {/* Header */}
        <div className="grimdark-panel rounded-lg p-4 mb-4 relative z-30">
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

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <FilterDropdown
              label="ALLEGIANCE"
              options={allianceOptions}
              selected={activeAlliances}
              onToggle={handleAllianceToggle}
              onClear={clearAlliances}
            />
            <FilterDropdown
              label="FACTION"
              options={factionOptions}
              selected={activeFactions}
              onToggle={handleFactionToggle}
              onClear={clearFactions}
            />
            <FilterDropdown
              label="MOOD"
              options={moodOptions}
              selected={activeMoods}
              onToggle={handleMoodToggle}
              onClear={clearMoods}
            />
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
            <div className="grimdark-panel rounded-lg p-3 grid grid-cols-1 lg:grid-cols-2 gap-2">
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
