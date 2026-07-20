import React from 'react';
import { cn } from 'lib/utils';
import { FactionSigil } from './FactionSigil';
import { boxWidths, layoutBox, BOX_HEIGHT, BOX_GAP } from 'lib/strategiumLayout';

// Static meta-map: three fixed alliance volumes (spec §3), each a static
// frame containing its faction nodes at their rest-anchor position. Read
// factions dim (spec §5's read-state overlay) so the unread flank stands
// out. Node click/hover wiring for expansion and the recommendation moment
// lands in later commits -- this is the resting layout they build on.

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = BOX_HEIGHT + 56;

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

  return (
    <div
      className="relative w-full"
      style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
    >
      {boxes.map(({ alliance, x, width }) => (
        <div
          key={alliance.key}
          className="absolute top-0"
          style={{
            left: `${(x / CANVAS_WIDTH) * 100}%`,
            width: `${(width / CANVAS_WIDTH) * 100}%`,
          }}
        >
          <div
            className={cn(
              'text-center font-tactical text-[11px] tracking-[0.25em] mb-2 uppercase',
              ALLIANCE_TEXT[alliance.key]
            )}
          >
            {alliance.label}
          </div>
          <div
            className={cn(
              'relative rounded-lg border bg-slate-950/40',
              ALLIANCE_BORDER[alliance.key]
            )}
            style={{ height: BOX_HEIGHT }}
          >
            {layoutBox(alliance.nodes, width, BOX_HEIGHT, maxBookCount).map((pos) => {
              const node = alliance.nodes.find((n) => n.key === pos.key);
              return (
                <div
                  key={node.key}
                  className={cn(
                    'absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center',
                    'border transition-opacity duration-300',
                    node.isRead ? 'opacity-35' : 'opacity-100'
                  )}
                  style={{
                    left: `${(pos.x / width) * 100}%`,
                    top: `${(pos.y / BOX_HEIGHT) * 100}%`,
                    width: pos.r * 2,
                    height: pos.r * 2,
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
        </div>
      ))}
    </div>
  );
}

export default StrategiumMap;
