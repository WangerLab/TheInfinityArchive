// Anchor layout for the Strategium meta-map: grid-packs each alliance box's
// faction nodes into fixed rest positions. Physics (wired in a later commit)
// only ever displaces nodes AWAY from these anchors and settles them back --
// this grid IS the rest state (spec §4: "anchored, not free-drift"), not a
// placeholder that gets replaced.

export const BOX_HEIGHT = 260;
export const BOX_GAP = 24;
export const BOX_PADDING = 28;
export const NODE_RADIUS_MIN = 14;
export const NODE_RADIUS_MAX = 30;

// Node radius scales with book count (catalog frequency = prominence, per
// the Strategium planning decision) between a floor and a ceiling so a
// single-book faction never disappears and a 70-book one never swallows
// its box.
export function radiusFor(bookCount, maxBookCount) {
  if (maxBookCount <= 0) return NODE_RADIUS_MIN;
  const t = Math.sqrt(bookCount / maxBookCount);
  return NODE_RADIUS_MIN + t * (NODE_RADIUS_MAX - NODE_RADIUS_MIN);
}

// Lay out one alliance's nodes on a grid inside its box (local coordinates,
// origin top-left of the box). Returns { key, x, y, r } per node.
export function layoutBox(nodes, boxWidth, boxHeight, maxBookCount) {
  const n = nodes.length;
  if (n === 0) return [];
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
      r: radiusFor(node.bookCount, maxBookCount),
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
