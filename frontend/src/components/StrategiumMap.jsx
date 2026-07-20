import React, { useMemo } from 'react';
import { cn } from 'lib/utils';
import { FactionSigil } from './FactionSigil';
import { boxWidths, layoutBox, BOX_HEIGHT, BOX_GAP } from 'lib/strategiumLayout';
import { useForceLayout } from 'hooks/useForceLayout';

// Living meta-map: three fixed alliance volumes (spec §3), each a static
// frame; only the faction nodes inside move, via a real d3-force simulation
// anchored to their rest-grid position (spec §4). Read factions dim (spec
// §5's read-state overlay) so the unread flank stands out. Expansion and
// the recommendation moment land in later commits.
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

export function StrategiumMap({ tree }) {
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

  // Flatten every box's grid anchors into one simulation input, converting
  // each node's local (within-box) anchor to a canvas-global x/y so a single
  // simulation instance can run across all three alliance boxes at once.
  const simNodes = useMemo(() => {
    const flat = [];
    for (const { alliance, x, width } of boxes) {
      const anchors = layoutBox(alliance.nodes, width, BOX_HEIGHT, maxBookCount);
      for (const anchor of anchors) {
        flat.push({
          key: anchor.key,
          x: anchor.x + x,
          y: anchor.y,
          r: anchor.r,
          boxKey: alliance.key,
        });
      }
    }
    return flat;
    // Deliberately keyed on `tree` alone: `boxes`/`maxBookCount` are pure
    // derivations of it recomputed fresh every render, not independent state.
    // eslint-disable-next-line
  }, [tree]);

  const boxesByKey = useMemo(() => {
    const map = {};
    for (const { alliance, x, width } of boxes) {
      map[alliance.key] = { left: x, top: 0, width, height: BOX_HEIGHT };
    }
    return map;
    // eslint-disable-next-line
  }, [tree]);

  const positions = useForceLayout(simNodes, boxesByKey);

  return (
    <div
      className="relative w-full"
      style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
    >
      {boxes.map(({ alliance, x, width }) => (
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
            {alliance.nodes.map((node) => {
              const pos = positions[node.key];
              if (!pos) return null;
              // Convert the canvas-global simulated position back to a
              // percentage local to this box's own rendered div.
              const localX = pos.x - x;
              return (
                <div
                  key={node.key}
                  className={cn(
                    'absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center',
                    'border transition-opacity duration-300',
                    node.isRead ? 'opacity-35' : 'opacity-100'
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
      ))}
    </div>
  );
}

export default StrategiumMap;
