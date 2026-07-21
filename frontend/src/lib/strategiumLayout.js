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
// golden-angle spiral outward per node until it clears every footprint
// already placed. Deterministic, non-overlapping, most-prominent node at
// dead center.
const PACK_RADIAL_STEP = 2;

// Every node's actual collision footprint is icon-circle PLUS the 100px-wide
// label hanging below it (StrategiumMap.jsx: width 100, 3 lines @ ~12.5px
// leading-tight, 8px gap below the icon) -- not just the bare circle. A
// single isotropic radius gap can't express "needs full label width apart
// horizontally, needs almost nothing apart vertically" at the same time:
// raising it twice (14 -> 18 -> 40) still let diagonally-close spiral points
// merge labels (e.g. Thousand Sons / Emperor's Children), because a value
// generous enough for horizontally-adjacent pairs is still checked
// isotropically against pairs that never needed that much room vertically.
const LABEL_WIDTH = 100;
const LABEL_GAP = 8;
const LABEL_HEIGHT = 38;
// Real, visible breathing room beyond bare non-touching -- every element
// should read as standing clearly on its own, not just technically clear.
const FOOTPRINT_MARGIN = 20;

// True if two nodes' footprints (icon + the label rectangle hanging below
// it) do NOT overlap, with FOOTPRINT_MARGIN of real clearance. Each node's
// footprint is a rectangle: half-width = max(its icon radius, half the
// label width) so the box always contains both the icon circle and the
// label; vertical span runs from the icon's own top edge down through the
// label's bottom edge. Two rectangles are clear if separated on EITHER axis
// (standard AABB non-overlap test) -- this is what correctly allows tight
// vertical packing (labels land in different height bands) while forcing
// wide horizontal separation (labels would otherwise run into each other),
// which a single isotropic radius could never express at once.
function footprintsClear(x, y, r, p) {
  const halfW = Math.max(r, LABEL_WIDTH / 2);
  const pHalfW = Math.max(p.r, LABEL_WIDTH / 2);
  if (Math.abs(x - p.x) >= halfW + pHalfW + FOOTPRINT_MARGIN) return true;

  const bottom = y + r + LABEL_GAP + LABEL_HEIGHT;
  const pBottom = p.y + p.r + LABEL_GAP + LABEL_HEIGHT;
  const top = y - r;
  const pTop = p.y - p.r;
  return bottom + FOOTPRINT_MARGIN <= pTop || pBottom + FOOTPRINT_MARGIN <= top;
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

// Lay out all alliances into the shared width×height canvas via ONE
// cross-cluster packing pass. Returns { [allianceKey]: { cx, cy, spread,
// anchors: [{ key, x, y, r }] } } with all coordinates GLOBAL canvas pixels.
// `spread` = farthest anchor distance from the centroid incl. its radius --
// feeds the nebula size and caption position.
//
// DELIBERATE REVERSAL of the prior per-cluster-territory approach: each
// alliance used to pack independently (its own local placed-list, reset per
// alliance) and then fit-scale its result into a `computeTerritory` budget
// computed from centroid distances alone. That budget measured "how much
// room does this cluster need" using only the bare icon radius -- never the
// much larger icon+label FOOTPRINT the packer actually respects (see
// footprintsClear above). Once labels became always-visible and the packer
// footprint-aware, every cluster's natural size grew well past its
// territory allocation, and the territory fit's own "never shrink" rule
// (needed to preserve the packer's non-overlap guarantee) let clusters
// simply grow straight through their neighbours -- exactly the seam-crowding
// a live test showed (Word Bearers/Tyranids, Alpha Legion/Drukhari/Navis
// Nobilite all tangled at the Chaos/Xenos/Imperium boundaries).
//
// Fix: pack every alliance into the SAME shared placed-list, in
// ALLIANCE_ORDER, each still spiralling out from its own centroid -- an
// alliance packed later sees every node already placed by an earlier one
// and routes around it directly, the same mechanism that already keeps
// same-alliance nodes apart, just no longer reset between alliances. This
// makes actual collision avoidance the ONLY thing keeping clusters apart --
// no separate territory-budget approximation to fall out of sync again.
export function layoutClusters(alliances, width, height, maxBookCount) {
  if (width <= 0 || height <= 0) return {};
  const config = width / height < TALL_ASPECT ? CLUSTER_ANCHORS_TALL : CLUSTER_ANCHORS_WIDE;

  const centers = alliances.map((alliance) => {
    const cfg = config[alliance.key] || { fx: 0.5, fy: 0.5 };
    return { alliance, cx: cfg.fx * width, cy: cfg.fy * height };
  });

  const placedGlobal = [];
  const result = {};

  for (const { alliance, cx, cy } of centers) {
    if (alliance.nodes.length === 0) {
      result[alliance.key] = { cx, cy, spread: 0, anchors: [] };
      continue;
    }

    const sorted = [...alliance.nodes].sort((a, b) => b.bookCount - a.bookCount);
    const anchors = [];
    for (let i = 0; i < sorted.length; i++) {
      const r = radiusFor(sorted[i].bookCount, maxBookCount);
      const angle = i * GOLDEN_ANGLE;
      let radius = 0;
      let x = cx;
      let y = cy;
      if (i > 0 || placedGlobal.length > 0) {
        let clear = false;
        while (!clear) {
          radius += PACK_RADIAL_STEP;
          x = cx + radius * Math.cos(angle);
          y = cy + radius * Math.sin(angle);
          clear = placedGlobal.every((p) => footprintsClear(x, y, r, p));
          if (radius > 20000) clear = true; // safety valve, never expected to hit
        }
      }
      const anchor = { key: sorted[i].key, x, y, r };
      anchors.push(anchor);
      placedGlobal.push(anchor);
    }

    const spread = Math.max(
      STAR_R_MAX,
      ...anchors.map((a) => Math.hypot(a.x - cx, a.y - cy) + a.r)
    );
    result[alliance.key] = { cx, cy, spread, anchors };
  }
  return result;
}
