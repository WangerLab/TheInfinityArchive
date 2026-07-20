// Anchor layout for the Strategium meta-map: grid-packs each alliance box's
// faction nodes into fixed rest positions. Physics only ever displaces nodes
// AWAY from these anchors and settles them back -- this grid IS the rest
// state (spec §4: "anchored, not free-drift"), not a placeholder.
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

// Lay out one alliance's nodes on a grid inside its box (local coordinates,
// origin top-left of the box). Returns { key, x, y, r } per node, all in
// real pixels relative to the box's own top-left.
export function layoutBox(nodes, boxWidth, boxHeight, maxBookCount) {
  const n = nodes.length;
  if (n === 0 || boxWidth <= 0 || boxHeight <= 0) return [];
  const cols = Math.max(1, Math.ceil(Math.sqrt(n * (boxWidth / boxHeight))));
  const rows = Math.ceil(n / cols);
  const cellW = (boxWidth - 2 * BOX_PADDING) / cols;
  const cellH = (boxHeight - 2 * BOX_PADDING) / rows;

  return nodes.map((node, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      key: node.key,
      x: BOX_PADDING + cellW * (col + 0.5),
      y: BOX_PADDING + cellH * (row + 0.5),
      r: radiusFor(node.bookCount, maxBookCount, boxHeight),
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
