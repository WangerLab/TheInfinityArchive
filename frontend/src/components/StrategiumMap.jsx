import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from 'lib/utils';
import { FactionSigil } from './FactionSigil';
import { layoutClusters, satelliteAnchors } from 'lib/strategiumLayout';
import { useForceLayout } from 'hooks/useForceLayout';

// Living meta-map: ONE shared canvas holding three alliance clusters (the
// per-alliance bounding boxes are gone -- see strategiumLayout.js's header
// for the deliberate constraint reversal). Alliance membership is carried by
// colour; only the faction nodes move, via a real d3-force simulation
// anchored to a prominence-ranked radial scatter per cluster (spec §4,
// strategiumLayout.js). Read factions dim (spec §5's read-state overlay) so
// the unread flank stands out.
//
// Expansion is a two-state machine (spec §5/§7): TRANSIENT hover-expand
// (collapses the moment the pointer leaves) and LATCHED recommendation-
// expand (persists until the next query, overrides hover-collapse). Both
// resolve to the same `activeExpanded` key -- `expandedKey` (the latch, a
// controlled prop) always wins over the internal hover state.
//
// Expansion is IN-SITU and ADDITIVE (spec §10): the selected parent stays
// exactly where it is (just scales up slightly) and its children dock as a
// ring of satellites around it, joined by thin connectors; every other node
// across the whole field dims and blurs into the background. Because the
// children are ADDED rather than swapped in, forceCollide genuinely has more
// to push apart on expand and fewer once collapsed -- spec §4's behaviour.
//
// The canvas is a MEASURED pixel space (ResizeObserver on the outer
// container) -- the map genuinely fills whatever height/width its panel is
// given, and node radius scales as a fraction of that real box height.

const PARENT_EXPANDED_SCALE = 1.18;
const DEFOCUS_OPACITY = 0.25;
const DEFOCUS_BLUR = '2px';
// Star halo diameter as a multiple of the node's hit-area diameter. The halo
// is soft light, not a solid body -- overlap between neighbouring halos is
// fine (nebula feel), only the cores must stay apart (collide handles that).
const GLOW_SCALE = 2.6;

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

  const maxBookCount = Math.max(
    1,
    ...tree.alliances.flatMap((a) => a.nodes.map((n) => n.bookCount))
  );

  // Rest anchors for the TOP-LEVEL nodes only -- the base scatter never
  // reshuffles when something expands, since expansion is additive now.
  // All anchor coordinates are GLOBAL canvas pixels (the cluster centroid is
  // already added inside layoutClusters).
  const clusters = useMemo(() => {
    if (!hasSize) return {};
    return layoutClusters(tree.alliances, width, height, maxBookCount);
    // eslint-disable-next-line
  }, [tree, width, height]);

  // The expanded parent (if any) and its children, resolved once so both the
  // simulation and the render pass agree on exactly who is a satellite.
  const expandedParent = useMemo(() => {
    for (const alliance of tree.alliances) {
      const node = alliance.nodes.find((n) => n.key === activeExpanded && (n.children || []).length > 0);
      if (node) return { allianceKey: alliance.key, node };
    }
    return null;
    // eslint-disable-next-line
  }, [tree, activeExpanded]);

  const focusedKeys = useMemo(() => {
    if (!expandedParent) return null;
    const keys = new Set([expandedParent.node.key]);
    for (const child of expandedParent.node.children) keys.add(child.key);
    return keys;
    // eslint-disable-next-line
  }, [expandedParent]);

  const simNodes = useMemo(() => {
    if (!hasSize) return [];
    const flat = [];
    for (const alliance of tree.alliances) {
      const anchors = clusters[alliance.key]?.anchors || [];
      for (const anchor of anchors) {
        const isExpandedParent = expandedParent && anchor.key === expandedParent.node.key;
        flat.push({
          key: anchor.key,
          x: anchor.x,
          y: anchor.y,
          r: isExpandedParent ? anchor.r * PARENT_EXPANDED_SCALE : anchor.r,
        });
      }

      if (expandedParent && expandedParent.allianceKey === alliance.key) {
        const parentAnchor = anchors.find((a) => a.key === expandedParent.node.key);
        if (parentAnchor) {
          // Ring radius must clear the parent's SCALED-UP size, not its base
          // anchor radius, or satellites would start slightly inside it.
          const boostedParent = { ...parentAnchor, r: parentAnchor.r * PARENT_EXPANDED_SCALE };
          const sats = satelliteAnchors(boostedParent, expandedParent.node.children, maxBookCount);
          for (const s of sats) {
            flat.push({ key: s.key, x: s.x, y: s.y, r: s.r });
          }
        }
      }
    }
    return flat;
    // eslint-disable-next-line
  }, [clusters, expandedParent, width, height]);

  const bounds = useMemo(() => ({ width, height }), [width, height]);
  const positions = useForceLayout(simNodes, bounds);

  // Resolve each recommendation vector's endpoint: prefer the target's own
  // (satellite) position if its parent happens to be the expanded one right
  // now, else fall back to the target's top-level node, which is always
  // visible. Only one node can be expanded at a time (spec §3), so at most
  // one of several cross-parent recommendations gets its precise satellite
  // endpoint; the rest resolve to their umbrella node.
  const resolvedVectors = vectors
    .map((v) => {
      const target = (v.childKey && positions[v.childKey]) || positions[v.topKey];
      const origin = positionKey ? positions[positionKey] : null;
      if (!target || !origin) return null;
      return { ...v, target, origin };
    })
    .filter(Boolean);

  const handleTopNodeClick = (node) => {
    if ((node.children || []).length > 0) {
      onToggleExpand?.(node.key === expandedKey ? null : node.key);
    } else {
      onSelectFaction?.(node.key, null);
    }
  };

  const handleSatelliteClick = (child, parentKey) => {
    onSelectFaction?.(child.key, parentKey);
  };

  const renderNode = ({ key, label, sigil, bookCount, isRead, allianceKey, isSatellite, isExpandedParent, onClick, onEnter, onLeave }) => {
    const pos = positions[key];
    if (!pos) return null;
    // Focus (expansion) and read-state are independent signals -- a docked
    // satellite that happens to be fully read still dims for read-state,
    // exactly like any top-level node.
    const isFocused = !focusedKeys || focusedKeys.has(key);
    const tint = ALLIANCE_COLOR[allianceKey];
    // Prominence maps to halo brightness within a narrow band -- the star
    // reads brighter, never bigger-sphere.
    const glowAlpha = 0.3 + 0.3 * Math.sqrt(bookCount / maxBookCount);
    const ringDiameter = pos.r * 2 + 12;

    return (
      <div key={key}>
        <div
          role="button"
          tabIndex={0}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          onClick={onClick}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center cursor-pointer transition-[opacity,filter] duration-300 hover:brightness-125"
          style={{
            left: pos.x,
            top: pos.y,
            width: pos.r * 2,
            height: pos.r * 2,
            opacity: isFocused ? (isRead ? 0.35 : 1) : DEFOCUS_OPACITY,
            // undefined (not 'none') when focused, so the hover brightness
            // utility isn't overridden by an inline filter.
            filter: isFocused ? undefined : `blur(${DEFOCUS_BLUR})`,
          }}
          title={`${label} (${bookCount})`}
        >
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{
              width: pos.r * 2 * GLOW_SCALE,
              height: pos.r * 2 * GLOW_SCALE,
              background: `radial-gradient(circle, ${tint(glowAlpha)} 0%, ${tint(glowAlpha * 0.4)} 40%, transparent 70%)`,
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{ width: 4, height: 4, background: tint(0.95), boxShadow: `0 0 6px 2px ${tint(0.7)}` }}
          />
          {isExpandedParent && (
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
              style={{
                width: ringDiameter,
                height: ringDiameter,
                border: '1px solid hsl(var(--gold) / 0.85)',
                boxShadow: '0 0 10px hsl(var(--gold) / 0.5)',
              }}
            />
          )}
          {key === positionKey && (
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none animate-pulse"
              style={{
                width: ringDiameter,
                height: ringDiameter,
                border: '1px solid hsl(var(--auspex) / 0.85)',
                boxShadow: '0 0 10px hsl(var(--auspex) / 0.5)',
              }}
            />
          )}
          <FactionSigil sigil={sigil} alliance={allianceKey} size={isSatellite ? 'sm' : 'md'} className="relative" />
        </div>
        <div
          className={cn(
            'absolute -translate-x-1/2 pointer-events-none font-tactical uppercase text-center leading-tight',
            'transition-opacity duration-300 overflow-hidden',
            ALLIANCE_TEXT[allianceKey]
          )}
          style={{
            left: pos.x,
            top: pos.y + pos.r + 4,
            width: 140,
            fontSize: 10,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            opacity: isFocused ? 0.9 : DEFOCUS_OPACITY,
            filter: isFocused ? 'none' : `blur(${DEFOCUS_BLUR})`,
          }}
        >
          {label}
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[320px]">
      {/* Nebula layer: borderless soft colour fields behind each cluster --
          no boxes, no contours, no header rules. Sized from the cluster's
          actual spread so the field hugs its stars. */}
      {hasSize && tree.alliances.map((alliance) => {
        const cluster = clusters[alliance.key];
        if (!cluster || cluster.anchors.length === 0) return null;
        const nebulaDiameter = (cluster.spread + 60) * 2;
        return (
          <div
            key={`nebula-${alliance.key}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: cluster.cx,
              top: cluster.cy,
              width: nebulaDiameter,
              height: nebulaDiameter,
              background: ALLIANCE_FIELD[alliance.key],
            }}
          />
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
              expandable: (node.children || []).length > 0,
              isSatellite: false,
              isExpandedParent: expandedParent?.node.key === node.key,
              onClick: () => handleTopNodeClick(node),
              onEnter: () => (node.children || []).length > 0 && setHoverKey(node.key),
              onLeave: () => setHoverKey((k) => (k === node.key ? null : k)),
            })
          )}

          {expandedParent && expandedParent.allianceKey === alliance.key &&
            expandedParent.node.children.map((child) =>
              renderNode({
                key: child.key,
                label: child.label,
                sigil: child.sigil,
                bookCount: child.bookCount,
                isRead: child.isRead,
                allianceKey: alliance.key,
                expandable: false,
                isSatellite: true,
                isExpandedParent: false,
                onClick: () => handleSatelliteClick(child, expandedParent.node.key),
                onEnter: () => {},
                onLeave: () => {},
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
          {/* Satellite connectors -- hairline constellation edges from the
              expanded parent to each docked child, in the alliance tint. */}
          {expandedParent && expandedParent.node.children.map((child) => {
            const from = positions[expandedParent.node.key];
            const to = positions[child.key];
            if (!from || !to) return null;
            return (
              <line
                key={`connector-${child.key}`}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={ALLIANCE_COLOR[expandedParent.allianceKey](0.3)}
                strokeWidth={0.75}
              />
            );
          })}

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
