// Anchor layout for the Strategium meta-map: ONE shared canvas holding three
// alliance clusters, each packed as a prominence-ranked radial scatter around
// its own centroid. Physics only ever displaces nodes AWAY from these anchors
// and settles them back -- this scatter IS the rest state (spec §4: "anchored,
// not free-drift"), not a placeholder.
//
// DELIBERATE REVERSAL of the original pre-build constraint "box size
// proportional to alliance faction count": the per-alliance bounding boxes are
// gone entirely (Tim's decision after the first live build). The
// count-proportional box width gave Chaos a sliver so narrow that the isotropic
// ellipse-fit collapsed its whole cluster to a single point -- while node radii
// kept scaling with the full box HEIGHT. In the shared space, alliance
// membership is carried by colour alone and every star uses a GLOBAL pixel
// size, so no cluster can starve another of room.
//
// All dimensions are REAL measured pixels (StrategiumMap.jsx measures its
// container via ResizeObserver), not a fixed virtual unit.

// Global star radius bounds in pixels. Bumped from 11-16 after Tim's live
// test of the flattened, ~41-node map: with every faction visible at once
// and real canvas room now that the hierarchy is flat (no satellite fan to
// budget for), small icons were the binding legibility problem, not cluster
// crowding. Prominence still expresses as a subtle size/brightness step
// within this range, never as the dominant visual signal.
export const STAR_R_MIN = 18;
export const STAR_R_MAX = 30;

export function radiusFor(bookCount, maxBookCount) {
  if (maxBookCount <= 0) return STAR_R_MIN;
  const t = Math.sqrt(bookCount / maxBookCount);
  return STAR_R_MIN + t * (STAR_R_MAX - STAR_R_MIN);
}

// The golden angle (~137.5°) -- the phyllotaxis constant that spaces
// successive points around a spiral with no two rings ever aligning, so a
// prominence-ranked sequence reads as an organic cluster rather than a grid.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// Greedy radial packing (see the pre-rework commit history): walk the
// golden-angle spiral outward per node until it clears every circle already
// placed. Deterministic, non-overlapping, most-prominent node at dead center.
const PACK_RADIAL_STEP = 2;
const PACK_GAP = 14;

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

// Cluster centroids as fractions of the canvas. Landscape: Imperium (most
// nodes) owns the left half; Chaos and Xenos split the right side
// vertically. A tall/narrow panel (mobile single column) stacks the three
// clusters vertically instead.
const TALL_ASPECT = 1.1;

// Chaos and Xenos share the right half stacked vertically, so their region
// budget is bound by their mutual distance as much as by any canvas edge;
// fy 0.25/0.75 is the isotropic optimum for two circles splitting a column
// (equal distance to the shared canvas edge and to each other), and fx 0.74
// (was 0.72) claims a little more of the right edge's own margin.
const CLUSTER_ANCHORS_WIDE = {
  imperium: { fx: 0.3, fy: 0.52 },
  chaos: { fx: 0.74, fy: 0.25 },
  xenos: { fx: 0.74, fy: 0.75 },
};

const CLUSTER_ANCHORS_TALL = {
  imperium: { fx: 0.5, fy: 0.25 },
  chaos: { fx: 0.5, fy: 0.55 },
  xenos: { fx: 0.5, fy: 0.82 },
};

// Keep-out margin subtracted from each cluster's region radius so rest
// anchors never hug the canvas edge or a neighbouring cluster's half-way line.
const EDGE_KEEPOUT = 18;

// How much of its available region a cluster fills at rest (positions only,
// never radii -- see the scale computation below for why).
const FILL_FRACTION = 0.9;

// Lay out all alliances into the shared width×height canvas. Returns
// { [allianceKey]: { cx, cy, spread, anchors: [{ key, x, y, r }] } } with all
// coordinates GLOBAL canvas pixels. `spread` = farthest anchor distance from
// the centroid incl. its radius -- feeds the nebula size and caption position.
export function layoutClusters(alliances, width, height, maxBookCount) {
  if (width <= 0 || height <= 0) return {};
  const config = width / height < TALL_ASPECT ? CLUSTER_ANCHORS_TALL : CLUSTER_ANCHORS_WIDE;

  const centers = alliances.map((alliance) => {
    const cfg = config[alliance.key] || { fx: 0.5, fy: 0.5 };
    return { alliance, cx: cfg.fx * width, cy: cfg.fy * height };
  });

  const result = {};
  for (const { alliance, cx, cy } of centers) {
    if (alliance.nodes.length === 0) {
      result[alliance.key] = { cx, cy, spread: 0, anchors: [] };
      continue;
    }

    // Region radius: nearest canvas edge, or half the distance to any other
    // cluster centroid -- whichever is tighter -- minus a keep-out margin.
    let regionRadius = Math.min(cx, width - cx, cy, height - cy);
    for (const other of centers) {
      if (other.alliance.key === alliance.key) continue;
      regionRadius = Math.min(regionRadius, Math.hypot(other.cx - cx, other.cy - cy) / 2);
    }
    regionRadius = Math.max(1, regionRadius - EDGE_KEEPOUT);

    const sorted = [...alliance.nodes].sort((a, b) => b.bookCount - a.bookCount);
    const radii = sorted.map((node) => radiusFor(node.bookCount, maxBookCount));
    const packed = packNodesRadially(sorted, radii);

    // Positional scale ONLY (never radii -- every star keeps its global,
    // prominence-driven size regardless of cluster geometry): fills the
    // available region rather than merely avoiding overflow. The previous
    // Math.min(1, ...) could only ever SHRINK a cluster that overflowed its
    // region -- it never grew one to use extra room, which is exactly what
    // left a small-node-count cluster (Chaos) huddled tiny in the middle of
    // a canvas half full of empty space, the bug Tim's live screenshot
    // showed. Floored at 1 (never shrinks below the natural pack): shrinking
    // would pull stars closer together without shrinking their radii too,
    // breaking the greedy packer's own non-overlap guarantee. A cluster
    // whose natural pack already exceeds its nominal region (a large
    // Imperium, many nodes) is simply left at its natural size -- the shared
    // canvas clamp (useForceLayout) and the real distance between cluster
    // centroids are the actual backstop, not this scale.
    const packedSpread = Math.max(1, ...packed.map((p) => Math.hypot(p.x, p.y) + p.r));
    const scale = Math.max(1, (regionRadius * FILL_FRACTION) / packedSpread);

    const anchors = packed.map((p) => ({
      key: p.key,
      x: cx + p.x * scale,
      y: cy + p.y * scale,
      r: p.r,
    }));
    const spread = Math.max(
      STAR_R_MAX,
      ...anchors.map((a) => Math.hypot(a.x - cx, a.y - cy) + a.r)
    );
    result[alliance.key] = { cx, cy, spread, anchors };
  }
  return result;
}
