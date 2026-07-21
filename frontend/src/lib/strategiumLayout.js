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

// Global star radius bounds in pixels -- the constellation look wants small
// star-points whose 20px sigil fits inside the smallest hit-area, with
// prominence expressed as a subtle size/brightness step, never as big spheres.
export const STAR_R_MIN = 11;
export const STAR_R_MAX = 16;

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
const PACK_GAP = 10;

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

const CLUSTER_ANCHORS_WIDE = {
  imperium: { fx: 0.3, fy: 0.52 },
  chaos: { fx: 0.72, fy: 0.27 },
  xenos: { fx: 0.72, fy: 0.75 },
};

const CLUSTER_ANCHORS_TALL = {
  imperium: { fx: 0.5, fy: 0.25 },
  chaos: { fx: 0.5, fy: 0.55 },
  xenos: { fx: 0.5, fy: 0.82 },
};

// Keep-out margin subtracted from each cluster's region radius so rest
// anchors never hug the canvas edge or a neighbouring cluster's half-way line.
const EDGE_KEEPOUT = 24;

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

    // Positional safety scale ONLY (never radii) for degenerate panel sizes;
    // with global star sizes the packed spread normally fits with 2-3x room.
    const packedSpread = Math.max(1, ...packed.map((p) => Math.hypot(p.x, p.y) + p.r));
    const scale = Math.min(1, regionRadius / packedSpread);

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
