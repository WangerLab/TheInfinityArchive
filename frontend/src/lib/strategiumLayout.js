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
// pinned to a small constant regardless of panel size.
const RADIUS_MIN_FRACTION = 0.05;
const RADIUS_MAX_FRACTION = 0.12;

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

// Lay out one alliance's nodes as a prominence-ranked radial scatter (a
// phyllotaxis spiral, index-based and fully deterministic -- anchors never
// reshuffle between renders): the most-prominent factions land in the
// cluster CORE (small ring index), the long tail scatters toward the rim.
// Fitted to an ELLIPSE matching the box's own aspect ratio, not a circle
// inscribed in its shorter side, so a wide box actually uses its width.
// This makes spec §5's "deepening = into the cluster core" literally true
// in the geometry, not only in the vector's label. Returns { key, x, y, r }
// per node, all in real pixels relative to the box's own top-left.
export function layoutBox(nodes, boxWidth, boxHeight, maxBookCount) {
  const n = nodes.length;
  if (n === 0 || boxWidth <= 0 || boxHeight <= 0) return [];

  const sorted = [...nodes].sort((a, b) => b.bookCount - a.bookCount);
  const radii = sorted.map((node) => radiusFor(node.bookCount, maxBookCount, boxHeight));
  const maxNodeRadius = Math.max(...radii);

  const cx = boxWidth / 2;
  const cy = boxHeight / 2;
  const availableX = Math.max(0, boxWidth / 2 - BOX_PADDING - maxNodeRadius);
  const availableY = Math.max(0, boxHeight / 2 - BOX_PADDING - maxNodeRadius);
  // sqrt(i) is the phyllotaxis ring for index i; the outermost node (n-1)
  // must land at the box's usable edge, so that ring calibrates the scale.
  const maxRing = Math.sqrt(Math.max(1, n - 1));
  const scaleX = availableX / maxRing;
  const scaleY = availableY / maxRing;

  return sorted.map((node, i) => {
    const ring = Math.sqrt(i);
    const angle = i * GOLDEN_ANGLE;
    return {
      key: node.key,
      x: cx + ring * scaleX * Math.cos(angle),
      y: cy + ring * scaleY * Math.sin(angle),
      r: radii[i],
    };
  });
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
