import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ViewBackdrop } from 'components/ViewBackdrop';
import { StrategiumMap } from 'components/StrategiumMap';
import { StrategiumAdvisory } from 'components/StrategiumAdvisory';
import { useArchiveData } from 'context/ArchiveDataContext';
import { supabase } from 'lib/supabase';
import {
  buildFactionTree,
  getPosition,
  getUnreadCandidates,
  getReflections,
  resolveBookByEntryId,
} from 'lib/strategiumMap';

// Split console (spec §2): 2/3 living meta-map, 1/3 advisory panel, both
// visible, coupled by hover in both directions. The advisory query calls
// api/strategium-advise, resolves each of the 3 returned entry_ids back to a
// full book object locally, and logs the event to recommendations_log for
// the advisor's long-term track record (recommendations themselves stay
// ephemeral -- only the event persists, per spec §6).
//
// The map has no expand/collapse state anymore (every faction is its own
// flat node -- see strategiumMap.js's buildFactionTree header), so a
// recommendation vector always targets a real, already-visible node.

export function Strategium() {
  const navigate = useNavigate();
  const { projectData, bookProgress, currentReading } = useArchiveData();

  const tree = useMemo(
    () => buildFactionTree(projectData, bookProgress),
    [projectData, bookProgress]
  );
  const lastCompleted = useMemo(
    () => getPosition(projectData, bookProgress),
    [projectData, bookProgress]
  );
  // Position anchors on what the reader is ACTUALLY doing right now: if a
  // book is being read, that's the position (label "Currently reading"),
  // not whatever was last finished -- showing the last-completed book while
  // mid-read elsewhere made no sense. Falls back to last-completed only
  // when nothing is currently reading, or the reading book has no faction
  // to anchor on (e.g. a NULL-faction row).
  const position = useMemo(() => {
    const readingBook = currentReading?.book;
    if (readingBook?.factionPrimary) {
      return {
        entryId: readingBook.entryId,
        title: readingBook.title,
        factionPrimary: readingBook.factionPrimary,
        parentFaction: readingBook.parentFaction || null,
        grandAlliance: readingBook.grandAlliance,
        // The book's OWN faction -- every faction is its own flat node now,
        // so a chapter/legion always resolves to a real, visible node.
        nodeKey: readingBook.factionPrimary,
        status: 'reading',
      };
    }
    return lastCompleted ? { ...lastCompleted, status: 'completed' } : null;
  }, [currentReading, lastCompleted]);

  const [freeText, setFreeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [expandedRowIndex, setExpandedRowIndex] = useState(null);

  // Each recommendation resolved to its full book object plus the map key
  // needed to draw its vector -- the book's own faction, which is always a
  // real, visible top-level node (no nesting to fall back through anymore).
  const resolvedRecommendations = useMemo(() => {
    return recommendations.map((rec) => {
      const book = resolveBookByEntryId(projectData, rec.entry_id);
      return {
        entryId: rec.entry_id,
        vectorClass: rec.vector_class,
        rationale: rec.rationale,
        deviationConsequence: rec.deviation_consequence,
        interludeAwareness: rec.interlude_awareness,
        book,
        targetKey: book?.factionPrimary || null,
      };
    });
  }, [recommendations, projectData]);

  const handleSubmitQuery = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const candidates = getUnreadCandidates(projectData, bookProgress);
      const reflections = getReflections(projectData, bookProgress);
      const payload = {
        position,
        candidates,
        reflections,
        freeText,
        phases: projectData?.phases || [],
      };

      const res = await fetch('/api/strategium-advise', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Advisory query failed');

      setAssessment(data.assessment);
      setRecommendations(data.recommendations);
      setExpandedRowIndex(null);
      setHoveredIndex(null);

      // Log the event -- recommendations stay ephemeral, this is the track
      // record (spec §6). Best-effort: a logging failure shouldn't surface
      // as an error over a successful advisory result.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('recommendations_log').insert({
          user_id: user.id,
          query_context: { position, freeText: freeText || null },
          recommendations: data.recommendations,
        });
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [projectData, bookProgress, position, freeText]);

  return (
    <ViewBackdrop art="/War-table_projecting_battle-map_2K_202607041801.jpeg" accent="plasma">
      {/* Plain block wrapper, NOT flex -- a flex-fill main axis (flex-1)
          overrides an explicit height on its child and robs the grid below
          of a defined reference height (the documented Campaign-Finish scroll
          lesson: "an overflow scroll container on outer main is incompatible
          with inner columns that need their own h-full"). PhaseView/Archive
          both use this same plain-block + calc-height shape; mirror it
          exactly rather than reaching for flex again. */}
      <div className="px-4 md:px-8 py-4">
        <div className="text-center mb-3">
          <h1 className="font-display text-2xl text-plasma tracking-wider text-glow-plasma">STRATEGIUM</h1>
          <p className="text-xs text-plasma/70 font-tactical tracking-[0.25em]">
            THE STRATEGIUM ADVISES
          </p>
        </div>

        {/* X is fitted against this page's own (tight) header above, not
            computed in the abstract -- re-check live after deploy and adjust
            if there's a gap or a clipped scroller, same as PhaseView/
            Archive's own calc-height constants (both currently 270px, sized
            for their own much taller headers -- this page's header is far
            smaller, hence the lower starting estimate). */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:h-[calc(100vh-150px)]">
          {/* Below lg the grid loses its calc-height (no reliable viewport
              height to divide three ways at that size), so StrategiumMap's
              own STACKED layout may need more room than this panel naturally
              gets -- overflow-y-auto lets IT scroll rather than clip;
              lg:overflow-visible turns that off once the calc-height grid
              (WIDE layout, sized to match exactly) takes over. */}
          <div className="lg:col-span-2 grimdark-panel rounded-xl p-4 h-full min-h-[360px] overflow-y-auto lg:overflow-visible">
            <StrategiumMap
              tree={tree}
              onSelectFaction={() => {}}
              positionKey={position?.nodeKey || null}
              vectors={resolvedRecommendations}
              hoveredIndex={hoveredIndex}
              onHoverVector={setHoveredIndex}
            />
          </div>

          <div className="lg:col-span-1 grimdark-panel rounded-xl p-4 h-full overflow-hidden">
            <StrategiumAdvisory
              position={position}
              freeText={freeText}
              onFreeTextChange={setFreeText}
              onSubmitQuery={handleSubmitQuery}
              loading={loading}
              error={error}
              assessment={assessment}
              recommendations={resolvedRecommendations}
              hoveredIndex={hoveredIndex}
              onHoverRow={setHoveredIndex}
              expandedIndex={expandedRowIndex}
              onToggleRow={setExpandedRowIndex}
              onOpenBook={(entryId) => navigate(`/book/${entryId}`)}
            />
          </div>
        </div>
      </div>
    </ViewBackdrop>
  );
}

export default Strategium;
