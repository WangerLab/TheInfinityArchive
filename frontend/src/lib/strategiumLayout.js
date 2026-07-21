// Anchor layout for the Strategium meta-map: packs each alliance box's
// faction nodes into fixed rest positions on a prominence-ranked radial
// scatter (see layoutBox below). Physics only ever displaces nodes AWAY from
// these anchors and settles them back -- this scatter IS the rest state
// (spec §4: "anchored, not free-drift"), not a placeholder.
//
// All dimensions here are REAL measured pixels (StrategiumMap.jsx measures
// its container via ResizeObserver), not a fixed virtual unit -- the map
// fills whatever space its panel actually has, and node radius scales with
// that real box height so a bigger panel reads as a bigger, richer map
// instead of the same small grid floating in extra padding.

export const BOX_GAP = 20;
export const BOX_PADDING = 24;

// Radius bounds as a FRACTION of the box's own height, not a fixed pixel
// value -- so the map uses whatever room it's given rather than staying
// pinned to a small constant regardless of panel size. Every node carries
// a CONSTANT-size sigil (24px) regardless of sphere size (Tim's explicit
// ask -- prominence reads through sphere size, never through the symbol),
// so the floor is raised from the earlier 0.05 to comfortably contain that
// sigil with real padding even on the smallest sphere.
const RADIUS_MIN_FRACTION = 0.075;
const RADIUS_MAX_FRACTION = 0.12;

// Every node's label sits below it -- reserved uniformly out of the
// ellipse's usable radius so rest-state anchors don't crowd labels against
// each other or the box edge. The physics clamp (useForceLayout.js) adds a
// stricter, asymmetric bottom-only reservation on top of this for the
// live-displaced case.
const LABEL_CLEARANCE = 24;

export function radiusFor(bookCount, maxBookCount, boxHeight) {
  const min = boxHeight * RADIUS_MIN_FRACTION;
  const max = boxHeight * RADIUS_MAX_FRACTION;
  if (maxBookCount <= 0) return min;
  const t = Math.sqrt(bookCount / maxBookCount);
  return min + t * (max - min);
}

// The golden angle (~137.5°) -- the phyllotaxis constant that spaces
// successive points around a spiral with no two rings ever aligning, so a
// prominence-ranked sequence reads as an organic cluster rather than a grid.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// A blind ring(i) = sqrt(i) formula (classic phyllotaxis for EQUAL-sized
// points) badly overlaps here: rings are closest together at low i, and low
// i is exactly where the BIGGEST circles land (sorted descending by
// prominence) -- verified with realistic book-count data before shipping
// this: a 12-node Imperium cluster overlapped by up to 48px at rest. Fixed
// with a greedy radial packing instead: walk the golden-angle spiral
// outward per node (biggest first) until it clears every circle already
// placed, so placement respects actual circle sizes rather than assuming
// uniform points. Still fully deterministic (same input -> same output,
// anchors never reshuffle between renders) and still puts the most
// prominent factions in the cluster core, since node 0 sits at dead center
// and each subsequent node searches outward from there.
const PACK_RADIAL_STEP = 2;
const PACK_GAP = 6;

function packNodesRadially(sortedNodes, radii) {
  const placed = [];
  for (let i = 0; i < sortedNodes.length; i++) {
    const r = radii[i];
    const angle = i * GOLDEN_ANGLE;
    let radius = 0;
    if (i > 0) {
      let clear = false;
      while (!clear) {
        radius += PACK_RADIAL_STEP;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        clear = placed.every((p) => {
          const dx = x - p.x;
          const dy = y - p.y;
          return Math.sqrt(dx * dx + dy * dy) >= r + p.r + PACK_GAP;
        });
        if (radius > 20000) clear = true; // safety valve, never expected to hit
      }
    }
    placed.push({ key: sortedNodes[i].key, x: radius * Math.cos(angle), y: radius * Math.sin(angle), r });
  }
  return placed;
}

// Lay out one alliance's nodes as a prominence-ranked radial scatter,
// deterministic and non-overlapping at rest: the most-prominent factions
// land in the cluster CORE, the long tail scatters toward the rim. Fitted
// to an ELLIPSE matching the box's own aspect ratio (not a circle inscribed
// in its shorter side, so a wide box actually uses its width) by uniformly
// scaling the packed cluster down if it doesn't fit -- shrinking every node
// together rather than letting any of them overlap. This makes spec §5's
// "deepening = into the cluster core" literally true in the geometry, not
// only in the vector's label. Returns { key, x, y, r } per node, all in real
// pixels relative to the box's own top-left.
export function layoutBox(nodes, boxWidth, boxHeight, maxBookCount) {
  const n = nodes.length;
  if (n === 0 || boxWidth <= 0 || boxHeight <= 0) return [];

  const sorted = [...nodes].sort((a, b) => b.bookCount - a.bookCount);
  const radii = sorted.map((node) => radiusFor(node.bookCount, maxBookCount, boxHeight));
  const maxNodeRadius = Math.max(...radii);

  const packed = packNodesRadially(sorted, radii);

  const cx = boxWidth / 2;
  const cy = boxHeight / 2;
  const availableX = Math.max(1, boxWidth / 2 - BOX_PADDING - maxNodeRadius);
  const availableY = Math.max(1, boxHeight / 2 - BOX_PADDING - maxNodeRadius - LABEL_CLEARANCE);
  const farthestX = Math.max(...packed.map((p) => Math.abs(p.x)), 1);
  const farthestY = Math.max(...packed.map((p) => Math.abs(p.y)), 1);
  const scale = Math.min(1, availableX / farthestX, availableY / farthestY);

  return packed.map((p) => ({
    key: p.key,
    x: cx + p.x * scale,
    y: cy + p.y * scale,
    r: p.r * scale,
  }));
}

// Positions a parent's children as a ring of satellites AROUND its own
// anchor (spec §10: "expand this parent + dock here" -- explicitly not
// promote-and-pin). Additive, not a replacement: the parent stays exactly
// where it was, so the existing collide force genuinely has more nodes to
// push apart on expand and fewer once collapsed (spec §4's "expanding a
// group pushes neighbours aside, they settle back on collapse" -- the
// previous swap-the-parent-for-its-children model never triggered this,
// since node count never changed). Returns satellite anchors only, in the
// SAME local coordinate space as the parent's own anchor.
export function satelliteAnchors(parentAnchor, children, boxHeight, maxBookCount) {
  const n = children.length;
  if (n === 0) return [];
  const radii = children.map((c) => radiusFor(c.bookCount, maxBookCount, boxHeight));
  const avgRadius = radii.reduce((s, r) => s + r, 0) / n;
  const ring = parentAnchor.r * 1.15 + avgRadius + 16;

  return children.map((child, i) => {
    const angle = -Math.PI / 2 + i * ((2 * Math.PI) / n);
    return {
      key: child.key,
      x: parentAnchor.x + ring * Math.cos(angle),
      y: parentAnchor.y + ring * Math.sin(angle),
      r: radii[i],
    };
  });
}

// Widths for the alliance boxes, proportional to faction count (spec §3/§7:
// "box size proportional to alliance faction count"), floored so an alliance
// with few factions still reads as a real box rather than a sliver.
const MIN_WIDTH_FRACTION = 0.16;

export function boxWidths(alliances, totalWidth) {
  const totalFactions = alliances.reduce((s, a) => s + Math.max(a.factionCount, 1), 0);
  const gaps = (alliances.length - 1) * BOX_GAP;
  const usable = totalWidth - gaps;
  const raw = alliances.map((a) => Math.max(a.factionCount, 1) / totalFactions);
  const floored = raw.map((f) => Math.max(f, MIN_WIDTH_FRACTION));
  const flooredTotal = floored.reduce((s, f) => s + f, 0);
  return floored.map((f) => (f / flooredTotal) * usable);
}
