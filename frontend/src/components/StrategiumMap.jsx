import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from 'lib/utils';
import { FactionSigil } from './FactionSigil';
import { boxWidths, layoutBox, BOX_GAP } from 'lib/strategiumLayout';
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
// The canvas is a MEASURED pixel space (ResizeObserver on the outer
// container), not a fixed virtual unit scaled by percentage -- the map
// genuinely fills whatever height/width its panel is given, and node radius
// (strategiumLayout's radiusFor) scales as a fraction of that real box
// height, so a taller panel reads as a bigger, richer map rather than the
// same small grid floating in extra space.

const LABEL_HEIGHT_FRACTION = 0.1;
const LABEL_HEIGHT_MIN = 28;

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

const VECTOR_STROKE = {
  continuation: 'hsl(var(--auspex))',
  deepening: 'hsl(var(--gold))',
  pivot: 'hsl(var(--plasma))',
};

// Gentle curved connector (spec §10): a quadratic bezier bowed perpendicular
// to the straight line between the two points, so a vector that crosses an
// alliance box border reads as a deliberate arc rather than a ruler-straight
// line slicing through unrelated nodes. Not true obstacle-avoidance routing
// -- a fixed, readable curvature is enough to satisfy "gentle curve" at this
// node density.
function curvedPath(x1, y1, x2, y2, bow) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const cx = mx + nx * bow;
  const cy = my + ny * bow;
  return { d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`, midX: cx, midY: cy };
}

function useMeasuredSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}

export function StrategiumMap({
  tree,
  expandedKey = null,
  onToggleExpand,
  onSelectFaction,
  positionKey = null,
  vectors = [],
  hoveredIndex = null,
  onHoverVector,
}) {
  const [containerRef, { width, height }] = useMeasuredSize();
  const hasSize = width > 0 && height > 0;

  const [hoverKey, setHoverKey] = useState(null);
  // The latch always wins: once something is latched, hover changes elsewhere
  // must not collapse or replace it (spec §5's "overrides hover-collapse").
  const activeExpanded = expandedKey ?? hoverKey;

  const labelHeight = Math.max(LABEL_HEIGHT_MIN, height * LABEL_HEIGHT_FRACTION);
  const boxHeight = Math.max(0, height - labelHeight);

  const widths = hasSize ? boxWidths(tree.alliances, width) : [];
  const maxBookCount = Math.max(
    1,
    ...tree.alliances.flatMap((a) => a.nodes.map((n) => n.bookCount))
  );

  let cursorX = 0;
  const boxes = tree.alliances.map((alliance, i) => {
    const boxWidth = widths[i] || 0;
    const box = { alliance, x: cursorX, width: boxWidth };
    cursorX += boxWidth + BOX_GAP;
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
    if (!hasSize) return [];
    const flat = [];
    for (const { alliance, x, width: boxWidth } of boxes) {
      const visible = visibleByAlliance[alliance.key];
      const anchors = layoutBox(visible, boxWidth, boxHeight, maxBookCount);
      for (const anchor of anchors) {
        flat.push({ key: anchor.key, x: anchor.x + x, y: anchor.y, r: anchor.r, boxKey: alliance.key });
      }
    }
    return flat;
    // eslint-disable-next-line
  }, [visibleByAlliance, width, height]);

  const boxesByKey = useMemo(() => {
    const map = {};
    for (const { alliance, x, width: boxWidth } of boxes) {
      map[alliance.key] = { left: x, top: 0, width: boxWidth, height: boxHeight };
    }
    return map;
    // eslint-disable-next-line
  }, [tree, width, height]);

  const positions = useForceLayout(simNodes, boxesByKey);

  // Resolve each recommendation vector's endpoint: prefer the target's own
  // (child) position if it is currently visible -- true only when its
  // parent happens to be the expanded one -- else fall back to the target's
  // top-level node, which is always visible. Only one node can be expanded
  // at a time (spec §3), so at most one of several cross-parent
  // recommendations gets its precise child endpoint; the rest resolve to
  // their umbrella node, a readable approximation rather than a crash.
  const resolvedVectors = vectors
    .map((v) => {
      const target = (v.childKey && positions[v.childKey]) || positions[v.topKey];
      const origin = positionKey ? positions[positionKey] : null;
      if (!target || !origin) return null;
      return { ...v, target, origin };
    })
    .filter(Boolean);

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
    <div ref={containerRef} className="relative w-full h-full min-h-[320px]">
      {hasSize && boxes.map(({ alliance, x, width: boxWidth }) => {
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
              style={{ left: x, top: 0, width: boxWidth, height: labelHeight }}
            >
              {alliance.label}
            </div>

            <div
              className={cn('absolute rounded-lg border bg-slate-950/40', ALLIANCE_BORDER[alliance.key])}
              style={{ left: x, top: labelHeight, width: boxWidth, height: boxHeight }}
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
                      expandedKey === node.key ? 'ring-2 ring-gold/70' : '',
                      positionKey === node.key ? 'ring-2 ring-auspex/80' : ''
                    )}
                    style={{
                      left: localX,
                      top: pos.y,
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
          </React.Fragment>
        );
      })}

      {hasSize && resolvedVectors.length > 0 && (
        <svg
          className="absolute inset-0"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ pointerEvents: 'none' }}
        >
          {resolvedVectors.map((v, i) => {
            const bow = 26 * (i % 2 === 0 ? 1 : -1) * (Math.floor(i / 2) + 1);
            const { d } = curvedPath(v.origin.x, v.origin.y, v.target.x, v.target.y, bow);
            const isHovered = hoveredIndex === i;
            return (
              <path
                key={v.entryId}
                d={d}
                fill="none"
                stroke={VECTOR_STROKE[v.vectorClass] || VECTOR_STROKE.continuation}
                strokeWidth={isHovered ? 3 : 1.5}
                opacity={hoveredIndex === null || isHovered ? 0.85 : 0.3}
                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                onMouseEnter={() => onHoverVector?.(i)}
                onMouseLeave={() => onHoverVector?.(null)}
              />
            );
          })}
        </svg>
      )}

      {hasSize && resolvedVectors.map((v, i) => {
        if (hoveredIndex !== i || !v.deviationConsequence) return null;
        const { midX, midY } = curvedPath(
          v.origin.x, v.origin.y, v.target.x, v.target.y,
          26 * (i % 2 === 0 ? 1 : -1) * (Math.floor(i / 2) + 1)
        );
        return (
          <div
            key={`tip-${v.entryId}`}
            className="absolute -translate-x-1/2 -translate-y-full pointer-events-none z-20 max-w-[220px] px-2 py-1 rounded bg-slate-950/95 border border-gold/40 text-[10px] text-slate-200 leading-snug"
            style={{ left: midX, top: midY - 6 }}
          >
            {v.deviationConsequence}
          </div>
        );
      })}
    </div>
  );
}

export default StrategiumMap;
