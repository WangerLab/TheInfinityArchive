import React, { useMemo, useState } from 'react';
import { ViewBackdrop } from 'components/ViewBackdrop';
import { StrategiumMap } from 'components/StrategiumMap';
import { useArchiveData } from 'context/ArchiveDataContext';
import { buildFactionTree, getPosition } from 'lib/strategiumMap';

// Split console (spec §2): 2/3 living meta-map, 1/3 advisory panel, both
// visible. The advisory panel's query flow (edge function call, vectors,
// hybrid tappable rows) lands in a later commit -- this wires the map onto
// real catalog data and gives the panel its permanent slot.

export function Strategium() {
  const { projectData, bookProgress } = useArchiveData();

  const tree = useMemo(
    () => buildFactionTree(projectData, bookProgress),
    [projectData, bookProgress]
  );
  const position = useMemo(
    () => getPosition(projectData, bookProgress),
    [projectData, bookProgress]
  );

  // The latch: null when nothing is pinned open, or a top-level node key
  // once a recommendation targets one of its children (spec §5's auto-
  // expand latch, wired in a later commit) or the reader clicks one
  // directly. Cleared on the next query in the recommendation-flow commit.
  const [expandedKey, setExpandedKey] = useState(null);
  const [selectedFaction, setSelectedFaction] = useState(null);

  return (
    <ViewBackdrop art="/War-table_projecting_battle-map_2K_202607041801.jpeg" accent="plasma">
      <div className="min-h-screen px-4 md:px-8 py-6 space-y-4">
        <div className="text-center">
          <h1 className="font-display text-2xl text-plasma tracking-wider">STRATEGIUM</h1>
          <p className="text-[11px] text-slate-500 font-tactical tracking-[0.25em]">
            THE STRATEGIUM ADVISES
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 grimdark-panel rounded-xl p-4">
            <StrategiumMap
              tree={tree}
              expandedKey={expandedKey}
              onToggleExpand={setExpandedKey}
              onSelectFaction={(key) => setSelectedFaction(key)}
            />
          </div>

          <div className="lg:col-span-1 grimdark-panel rounded-xl p-4 flex flex-col gap-3">
            <p className="font-tactical text-[11px] tracking-[0.2em] text-plasma uppercase">
              Advisory
            </p>
            {position ? (
              <p className="text-sm text-slate-300">
                Last position: <span className="text-slate-100 font-medium">{position.title}</span>
                {' '}({position.factionPrimary})
              </p>
            ) : (
              <p className="text-sm text-slate-500">No completed reading yet — the advisor has no anchor.</p>
            )}
            {selectedFaction && (
              <p className="text-xs text-slate-400">Selected: {selectedFaction}</p>
            )}
            <p className="text-[11px] text-slate-500 font-tactical tracking-[0.2em] uppercase mt-auto">
              Advisory query — coming online
            </p>
          </div>
        </div>
      </div>
    </ViewBackdrop>
  );
}

export default Strategium;
