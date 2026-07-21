import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from 'lib/utils';
import { FactionSigil } from './FactionSigil';
import { layoutConstellations, NEBULA_SCALE } from 'lib/strategiumLayout';
import { useForceLayout } from 'hooks/useForceLayout';

// Living meta-map: ONE shared canvas holding three alliance REGIONS (rects,
// never rendered as visible boxes -- only the soft nebula glow marks them).
// Every faction has a CURATED home (strategiumConstellations.js): a fixed
// lattice cell inside a disjoint block inside its alliance's region, not a
// position found by search. Four rounds of search-based placement (isotropic
// circle territory, per-axis rectangle + fit-scale, repeated PACK_GAP tuning,
// a shared cross-cluster collision list) each failed differently, because a
// search that "keeps going until clear" eventually terminates somewhere
// wrong. Lookup instead of search removes that failure class entirely --
// overlap is impossible by construction (layoutConstellations.js), not
// something a runtime check has to keep re-proving. Read factions dim
// (spec §5's read-state overlay) so the unread flank stands out.
//
// FLAT: every faction is its own node, always visible -- no expand/collapse
// state, no satellite ring, no umbrella-vs-chapter nesting (see
// strategiumMap.js's buildFactionTree header for why that reversal happened).
// A click just selects a faction directly. Thematically related factions
// still read as a group: a curated constellation's members are joined by
// thin connector lines (see the edges layer below).
//
// The canvas is a MEASURED pixel space (ResizeObserver on the outer
// container); layoutConstellations derives region sizes and star radii from
// the real measured width/height, so a bigger panel means more breathing
// room, not bigger stars for their own sake -- prominence (book count)
// remains the only thing that makes one star bigger than another.
//
// Labels: every faction's name is always visible under its star (Tim's
// explicit ask once the map had real room) -- no top-N-permanent/hover-only
// split. Label geometry (width/lines/font-size/line-height/gap) is read from
// `layout.metrics`, the SAME source layoutConstellations used to prove no two
// footprints can overlap -- two places disagreeing about this number is
// exactly what broke prior iterations of this map.

// Current-position ring diameter as a multiple of the star's OWN diameter
// (replaces a flat +12px, which shrank relatively as star size grew -- +12
// on an 18px-radius star is +33%, on a 30px-radius star only +20%).
const RING_SCALE = 1.3;

// Alliance captions anchor to a fixed CANVAS corner, independent of where
// that alliance's own cluster happens to sit -- Tim's explicit ask (Imperium
// top-left, Chaos top-right, Xenos bottom-right). Previously the caption
// position was computed from the cluster's own cx/cy/spread (a leftover
// from the original per-alliance box-header design, where the header sat
// directly above its own box) and never revisited as layouts changed --
// which is why it could drift toward canvas-center territory and overlap
// unrelated content once a cluster's spread grew large.
const CAPTION_CORNER = {
  imperium: { left: 24, top: 24 },
  chaos: { right: 24, top: 24 },
  xenos: { right: 24, bottom: 24 },
};

const ALLIANCE_TEXT = {
  imperium: 'text-gold',
  chaos: 'text-purple-400',
  xenos: 'text-plasma',
};

// Per-alliance node tint, returned at a given alpha. `--gold`/`--plasma` are
// raw HSL triplets (index.css), correct to wrap in hsl(); chaos purple-400
// has no CSS-var equivalent so it's an RGB literal, same as ALLIANCE_FIELD
// below. Node styling previously wrote hsl(var(--acc) / a) -- but --acc
// (ViewBackdrop) is already a COMPLETE hsl(...) value for this whole page
// (plasma), so that nested hsl(hsl(...) / a) was invalid CSS the browser
// silently dropped: the sphere gradient and glow never rendered at all,
// only the bare sigil. This resolves per-ALLIANCE colour directly instead.
const ALLIANCE_COLOR = {
  imperium: (a) => `hsl(var(--gold) / ${a})`,
  chaos: (a) => `rgb(192 132 252 / ${a})`,
  xenos: (a) => `hsl(var(--plasma) / ${a})`,
};

// Soft radial field per alliance -- a volume of colour with no hard edge,
// replacing the earlier bordered box. Values are alliance-tinted CSS
// variables already defined globally (index.css), so this stays in step
// with the rest of the app's accent system.
const ALLIANCE_FIELD = {
  imperium: 'radial-gradient(ellipse at center, hsl(var(--gold) / 0.10) 0%, hsl(var(--gold) / 0.03) 55%, transparent 78%)',
  chaos: 'radial-gradient(ellipse at center, rgb(192 132 252 / 0.10) 0%, rgb(192 132 252 / 0.03) 55%, transparent 78%)',
  xenos: 'radial-gradient(ellipse at center, hsl(var(--plasma) / 0.10) 0%, hsl(var(--plasma) / 0.03) 55%, transparent 78%)',
};

const VECTOR_STROKE = {
  continuation: 'hsl(var(--auspex))',
  deepening: 'hsl(var(--gold))',
  pivot: 'hsl(var(--plasma))',
};

// Gentle curved connector (spec §10): a quadratic bezier bowed perpendicular
// to the straight line between the two points, so a vector reads as a
// deliberate arc rather than a ruler-straight line slicing through unrelated
// nodes. Not true obstacle-avoidance routing -- a fixed, readable curvature
// is enough at this node density.
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

// Tiny deterministic PRNG (mulberry32) -- a fixed seed means the decorative
// starfield's dot positions are stable across every render AND every resize
// (they're generated once in fractional 0-1 space and scaled to the
// container's real pixels at render time), never reshuffling underfoot.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STARFIELD_SEED = 1337;
const STARFIELD_COUNT = 110;

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
  onSelectFaction,
  positionKey = null,
  vectors = [],
  hoveredIndex = null,
  onHoverVector,
}) {
  const [containerRef, { width, height }] = useMeasuredSize();
  const hasSize = width > 0 && height > 0;

  const maxBookCount = Math.max(
    1,
    ...tree.alliances.flatMap((a) => a.nodes.map((n) => n.bookCount))
  );

  // Decorative background dust: a fixed seed generates the SAME dots every
  // render, in fractional 0-1 coordinates so a resize just rescales them
  // rather than reshuffling the field underfoot. Purely a pseudo-depth cue --
  // never interactive, never read for layout.
  const starfield = useMemo(() => {
    const rand = mulberry32(STARFIELD_SEED);
    return Array.from({ length: STARFIELD_COUNT }, () => ({
      fx: rand(),
      fy: rand(),
      r: 0.5 + rand() * 0.7,
      opacity: 0.12 + rand() * 0.23,
    }));
  }, []);

  // Curated constellation layout -- all coordinates are GLOBAL canvas pixels,
  // region rects and the label/size metrics come from the SAME call.
  const layout = useMemo(() => {
    if (!hasSize) return { metrics: null, regions: {}, anchors: [], edges: [], requiredHeight: height };
    return layoutConstellations(tree.alliances, width, height, maxBookCount);
    // eslint-disable-next-line
  }, [tree, width, height]);

  const simNodes = useMemo(
    () => layout.anchors.map((a) => ({ key: a.key, x: a.x, y: a.y, r: a.r })),
    [layout]
  );

  const bounds = useMemo(() => ({ width, height }), [width, height]);
  const positions = useForceLayout(simNodes, bounds);

  // Resolve each recommendation vector's endpoint -- the target's own
  // faction is always a real, visible top-level node now (no nesting to
  // fall back through).
  const resolvedVectors = vectors
    .map((v) => {
      const target = positions[v.targetKey];
      const origin = positionKey ? positions[positionKey] : null;
      if (!target || !origin) return null;
      return { ...v, target, origin };
    })
    .filter(Boolean);

  const handleNodeClick = (node) => {
    onSelectFaction?.(node.key);
  };

  const renderNode = ({ key, label, sigil, bookCount, isRead, allianceKey, onClick }) => {
    const pos = positions[key];
    if (!pos) return null;
    const tint = ALLIANCE_COLOR[allianceKey];
    const { glowScale, sigilScale, labelWidth, labelLines, fontSize, lineHeight, labelGap } = layout.metrics;
    // Prominence maps to halo brightness within a narrow band -- the star
    // reads brighter, never bigger-sphere.
    const glowAlpha = 0.3 + 0.3 * Math.sqrt(bookCount / maxBookCount);
    const ringDiameter = pos.r * 2 * RING_SCALE;

    return (
      <div key={key}>
        <div
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center cursor-pointer transition-[opacity,filter] duration-300 hover:brightness-125"
          style={{
            left: pos.x,
            top: pos.y,
            width: pos.r * 2,
            height: pos.r * 2,
            opacity: isRead ? 0.35 : 1,
          }}
          title={`${label} (${bookCount})`}
        >
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{
              width: pos.r * 2 * glowScale,
              height: pos.r * 2 * glowScale,
              background: `radial-gradient(circle, ${tint(glowAlpha)} 0%, ${tint(glowAlpha * 0.4)} 40%, transparent 70%)`,
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{ width: 4, height: 4, background: tint(0.95), boxShadow: `0 0 6px 2px ${tint(0.7)}` }}
          />
          {key === positionKey && (
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none animate-pulse"
              style={{
                width: ringDiameter,
                height: ringDiameter,
                border: '2px solid hsl(var(--auspex) / 0.9)',
                boxShadow: '0 0 16px 3px hsl(var(--auspex) / 0.6)',
              }}
            />
          )}
          <FactionSigil sigil={sigil} alliance={allianceKey} sizePx={Math.round(pos.r * 2 * sigilScale)} className="relative" />
        </div>
        <div
          className={cn(
            'absolute -translate-x-1/2 pointer-events-none font-tactical uppercase text-center leading-tight',
            'overflow-hidden',
            ALLIANCE_TEXT[allianceKey]
          )}
          style={{
            left: pos.x,
            top: pos.y + pos.r + labelGap,
            width: labelWidth,
            fontSize,
            lineHeight: `${lineHeight}px`,
            display: '-webkit-box',
            WebkitLineClamp: labelLines,
            WebkitBoxOrient: 'vertical',
            overflowWrap: 'anywhere',
            opacity: 0.75,
          }}
        >
          {label}
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[320px]">
      {/* Background starfield: pseudo-depth dust, sits behind everything. */}
      {hasSize && (
        <svg
          className="absolute inset-0 pointer-events-none"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
        >
          {starfield.map((s, i) => (
            <circle
              key={`dust-${i}`}
              cx={s.fx * width}
              cy={s.fy * height}
              r={s.r}
              fill="white"
              opacity={s.opacity}
            />
          ))}
        </svg>
      )}

      {/* Nebula layer: borderless soft colour fields, one ellipse per
          alliance REGION (never a visible box/border). NEBULA_SCALE is
          derived, not tuned: ALLIANCE_FIELD's gradients reach full
          transparency at their 78% stop, and 1.28 * 0.78 ~= 1, so the
          visible glow boundary lands almost exactly on the region rect. */}
      {hasSize && tree.alliances.map((alliance) => {
        if (alliance.nodes.length === 0) return null;
        const region = layout.regions[alliance.key];
        if (!region) return null;
        return (
          <div
            key={`nebula-${alliance.key}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: region.x + region.w / 2,
              top: region.y + region.h / 2,
              width: region.w * NEBULA_SCALE,
              height: region.h * NEBULA_SCALE,
              background: ALLIANCE_FIELD[alliance.key],
            }}
          />
        );
      })}

      {/* One caption per alliance, anchored to a fixed canvas corner (see
          CAPTION_CORNER) -- independent of region/cluster geometry, so it
          never drifts toward the middle of the canvas or over another
          alliance's content. */}
      {hasSize && tree.alliances.map((alliance) => {
        if (alliance.nodes.length === 0) return null;
        return (
          <span
            key={`caption-${alliance.key}`}
            className={cn(
              'absolute pointer-events-none font-tactical text-base font-bold tracking-[0.35em] uppercase opacity-90',
              ALLIANCE_TEXT[alliance.key]
            )}
            style={CAPTION_CORNER[alliance.key]}
          >
            {alliance.label}
          </span>
        );
      })}

      {hasSize && tree.alliances.map((alliance) => (
        <React.Fragment key={alliance.key}>
          {alliance.nodes.map((node) =>
            renderNode({
              key: node.key,
              label: node.label,
              sigil: node.sigil,
              bookCount: node.bookCount,
              isRead: node.isRead,
              allianceKey: alliance.key,
              onClick: () => handleNodeClick(node),
            })
          )}
        </React.Fragment>
      ))}

      {hasSize && (
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
