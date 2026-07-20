import React, { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from 'lib/utils';
import { FactionSigil } from './FactionSigil';
import { boxWidths, layoutBox, BOX_HEIGHT, BOX_GAP } from 'lib/strategiumLayout';
import { useForceLayout } from 'hooks/useForceLayout';

// Living meta-map: three fixed alliance volumes (spec §3), each a static
// frame; only the faction nodes inside move, via a real d3-force simulation
// anchored to their rest-grid position (spec §4). Read factions dim (spec
// §5's read-state overlay) so the unread flank stands out.
//
// Expansion is a two-state machine (spec §5/§7): TRANSIENT hover-expand
// (collapses the moment the pointer leaves) and LATCHED recommendation-
// expand (persists until the next query, overrides hover-collapse). Both
// resolve to the same `activeExpanded` key -- `expandedKey` (the latch, a
// controlled prop) always wins over the internal hover state, so once
// something is latched, hovering elsewhere cannot change what is shown.
// Only one node expands at a time (mid-tier is a single expansion target,
// not a permanent third layer -- spec §3).
//
// Every box and node below is positioned as a PERCENTAGE of the outer
// aspect-ratio container, never a raw pixel value -- the container is
// responsive (scales with its parent's width), so a pixel value would drift
// out of proportion at any width other than the CANVAS_WIDTH virtual unit.

const CANVAS_WIDTH = 900;
const LABEL_HEIGHT = 44;
const CANVAS_HEIGHT = BOX_HEIGHT + LABEL_HEIGHT;

const ALLIANCE_BORDER = {
  imperium: 'border-gold/40',
  chaos: 'border-purple-400/40',
  xenos: 'border-plasma/40',
};

const ALLIANCE_TEXT = {
  imperium: 'text-gold',
  chaos: 'text-purple-400',
  xenos: 'text-plasma',
};

export function StrategiumMap({ tree, expandedKey = null, onToggleExpand, onSelectFaction }) {
  const [hoverKey, setHoverKey] = useState(null);
  // The latch always wins: once something is latched, hover changes elsewhere
  // must not collapse or replace it (spec §5's "overrides hover-collapse").
  const activeExpanded = expandedKey ?? hoverKey;

  const widths = boxWidths(tree.alliances, CANVAS_WIDTH);
  const maxBookCount = Math.max(
    1,
    ...tree.alliances.flatMap((a) => a.nodes.map((n) => n.bookCount))
  );

  let cursorX = 0;
  const boxes = tree.alliances.map((alliance, i) => {
    const width = widths[i];
    const box = { alliance, x: cursorX, width };
    cursorX += width + BOX_GAP;
    return box;
  });

  // The visible node set per box: a node expands into its children in place
  // of itself when it is the active-expanded key. Recomputed whenever the
  // tree or the expansion target changes.
  const visibleByAlliance = useMemo(() => {
    const map = {};
    for (const { alliance } of boxes) {
      map[alliance.key] = alliance.nodes.flatMap((node) => {
        if (node.key === activeExpanded && (node.children || []).length > 0) {
          return node.children.map((child) => ({ ...child, expandedFromKey: node.key, expandedFromLabel: node.label }));
        }
        return [node];
      });
    }
    return map;
    // eslint-disable-next-line
  }, [tree, activeExpanded]);

  const simNodes = useMemo(() => {
    const flat = [];
    for (const { alliance, x, width } of boxes) {
      const visible = visibleByAlliance[alliance.key];
      const anchors = layoutBox(visible, width, BOX_HEIGHT, maxBookCount);
      for (const anchor of anchors) {
        flat.push({ key: anchor.key, x: anchor.x + x, y: anchor.y, r: anchor.r, boxKey: alliance.key });
      }
    }
    return flat;
    // eslint-disable-next-line
  }, [visibleByAlliance]);

  const boxesByKey = useMemo(() => {
    const map = {};
    for (const { alliance, x, width } of boxes) {
      map[alliance.key] = { left: x, top: 0, width, height: BOX_HEIGHT };
    }
    return map;
    // eslint-disable-next-line
  }, [tree]);

  const positions = useForceLayout(simNodes, boxesByKey);

  const handleNodeClick = (node) => {
    if ((node.children || []).length > 0) {
      onToggleExpand?.(node.key === expandedKey ? null : node.key);
    } else if (node.expandedFromKey) {
      onSelectFaction?.(node.key, node.expandedFromKey);
    } else {
      onSelectFaction?.(node.key, null);
    }
  };

  return (
    <div
      className="relative w-full"
      style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
    >
      {boxes.map(({ alliance, x, width }) => {
        const visible = visibleByAlliance[alliance.key];
        const showingChildrenOf = visible.find((n) => n.expandedFromKey)?.expandedFromKey || null;
        const showingChildrenOfLabel = visible.find((n) => n.expandedFromKey)?.expandedFromLabel || null;

        return (
          <React.Fragment key={alliance.key}>
            <div
              className={cn(
                'absolute text-center font-tactical text-[11px] tracking-[0.25em] uppercase flex items-end justify-center pb-2',
                ALLIANCE_TEXT[alliance.key]
              )}
              style={{
                left: `${(x / CANVAS_WIDTH) * 100}%`,
                top: 0,
                width: `${(width / CANVAS_WIDTH) * 100}%`,
                height: `${(LABEL_HEIGHT / CANVAS_HEIGHT) * 100}%`,
              }}
            >
              {alliance.label}
            </div>

            <div
              className={cn('absolute rounded-lg border bg-slate-950/40', ALLIANCE_BORDER[alliance.key])}
              style={{
                left: `${(x / CANVAS_WIDTH) * 100}%`,
                top: `${(LABEL_HEIGHT / CANVAS_HEIGHT) * 100}%`,
                width: `${(width / CANVAS_WIDTH) * 100}%`,
                height: `${(BOX_HEIGHT / CANVAS_HEIGHT) * 100}%`,
              }}
            >
              {showingChildrenOf && (
                <button
                  type="button"
                  onClick={() => onToggleExpand?.(null)}
                  className={cn(
                    'absolute top-1.5 left-1.5 z-10 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded',
                    'text-[10px] font-tactical tracking-wide bg-slate-950/80 border border-slate-500/40',
                    'text-slate-300 hover:text-gold hover:border-gold/50 transition-colors'
                  )}
                >
                  <ChevronLeft className="w-3 h-3" />
                  {showingChildrenOfLabel}
                </button>
              )}

              {visible.map((node) => {
                const pos = positions[node.key];
                if (!pos) return null;
                const localX = pos.x - x;
                const expandable = (node.children || []).length > 0;
                return (
                  <div
                    key={node.key}
                    role="button"
                    tabIndex={0}
                    onMouseEnter={() => expandable && setHoverKey(node.key)}
                    onMouseLeave={() => setHoverKey((k) => (k === node.key ? null : k))}
                    onClick={() => handleNodeClick(node)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNodeClick(node); }}
                    className={cn(
                      'absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center',
                      'border transition-opacity duration-300 cursor-pointer',
                      node.isRead ? 'opacity-35' : 'opacity-100',
                      expandedKey === node.key ? 'ring-2 ring-gold/70' : ''
                    )}
                    style={{
                      left: `${(localX / width) * 100}%`,
                      top: `${(pos.y / BOX_HEIGHT) * 100}%`,
                      width: `${(pos.r * 2 / width) * 100}%`,
                      height: `${(pos.r * 2 / BOX_HEIGHT) * 100}%`,
                      borderColor: 'var(--acc)',
                      background: 'hsl(var(--void) / 0.7)',
                    }}
                    title={`${node.label} (${node.bookCount})`}
                  >
                    <FactionSigil sigil={node.sigil} alliance={alliance.key} size="lg" />
                  </div>
                );
              })}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default StrategiumMap;
