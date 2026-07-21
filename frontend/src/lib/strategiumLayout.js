import { CONSTELLATIONS, REGION_PLANS } from './strategiumConstellations';

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

// ============================================================================
// CONSTELLATION LAYOUT (additive, not yet consumed) -- replaces the search-
// based approach above. `layoutClusters` picks a position by growing a
// radius/scale until a collision check passes; four different collision
// checks in a row (isotropic circle, per-axis rectangle + fit-scale, three
// PACK_GAP tunings, a shared cross-cluster list) each failed differently,
// because a search that "keeps going until clear" will eventually terminate
// somewhere wrong -- most visibly, a blocked node marching a FIXED angle
// straight through a neighbouring alliance's cluster once the collision list
// became shared.
//
// `layoutConstellations` has no search at all: every faction has a curated
// home (strategiumConstellations.js) in a disjoint lattice cell inside a
// disjoint block inside a disjoint region. Irregularity and the live wobble
// (see hooks/useStellarDrift.js) are budgeted OUT of each cell's proven
// slack, so they can never consume it -- overlap becomes impossible by
// construction rather than something a collision check has to keep proving.
//
// This coexists with layoutClusters for now; StrategiumMap.jsx switches over
// (and the old packer is deleted) in a follow-up commit.
// ============================================================================

// Label metrics: ONE exported source consumed by both this geometry AND the
// label JSX in StrategiumMap.jsx. Every prior failure in this file came from
// two places disagreeing about the same number (footprint math vs render
// style) -- this removes that possibility structurally.
export const CONSTELLATION_LABEL_WIDTH = 112;
export const CONSTELLATION_LABEL_LINES = 2;
export const CONSTELLATION_FONT_SIZE = 10;
export const CONSTELLATION_LINE_HEIGHT = CONSTELLATION_FONT_SIZE * 1.25; // Tailwind leading-tight
export const CONSTELLATION_LABEL_GAP = 8;
const LABEL_BLOCK = CONSTELLATION_LABEL_GAP + CONSTELLATION_LABEL_LINES * CONSTELLATION_LINE_HEIGHT;

const MIN_GAP_X = 10;
const MIN_GAP_Y = 10;
export const WOBBLE_AMPLITUDE = 4;
const MIN_JITTER_Y = 4;
const JITTER_CAP = 24;
const INSET_X = 8;
const MIN_PITCH_X = CONSTELLATION_LABEL_WIDTH + MIN_GAP_X + INSET_X;

// Region padding keeps content clear of the corner captions (CAPTION_CORNER,
// StrategiumMap.jsx); gutters are the dark lanes between regions.
const PAD_TOP = 60;
const PAD_BOTTOM = 54;
const PAD_X = 24;
const GUTTER_X = 34;
const GUTTER_Y = 30;

// Imperium's share of the horizontal split, tied to today's curated 22/11/8
// node distribution across the three alliances (verified: within 5% of pure
// area-per-node parity against the row-count-driven chaos/xenos vertical
// split below). Revisit this constant, not the row lattice, if that
// distribution changes materially.
const IMPERIUM_WIDTH_FRACTION = 22 / 41;

export const CONSTELLATION_SIGIL_SCALE = 0.8;
export const CONSTELLATION_GLOW_SCALE = 2.2;
export const NEBULA_SCALE = 1.28;

// Deterministic per-node jitter, remapped so every node is displaced at
// least 35% of its budget (nothing sits dead-centre) -- FNV-1a keyed on the
// faction string + an axis salt, so x and y are independent and stable
// across renders/resizes without Math.random().
function fnv1aUnit(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 4294967296; // [0, 1)
}

function jitterSign(key, axis) {
  const t = fnv1aUnit(`${key}|${axis}`) * 2 - 1; // [-1, 1)
  return Math.sign(t) * (0.35 + 0.65 * Math.abs(t));
}

function radiusForRange(bookCount, maxBookCount, rMin, rMax) {
  if (maxBookCount <= 0) return rMin;
  const t = Math.sqrt(bookCount / maxBookCount);
  return rMin + t * (rMax - rMin);
}

// Three disjoint regions: Imperium the full-height left column; Chaos/Xenos
// splitting the right column top/bottom by REQUIRED ROW COUNT (4:3), not
// raw node count (11:8) -- with a row lattice the quantity that must match
// across regions is row PITCH, and row-count is what drives that; node-count
// parity falls out as a side effect (verified within 5%), not the goal.
function computeRegions(width, height) {
  const usableW = width - 2 * PAD_X;
  const usableH = height - PAD_TOP - PAD_BOTTOM;
  const splitBudget = usableW - GUTTER_X;
  const imperiumW = splitBudget * IMPERIUM_WIDTH_FRACTION;
  const rightW = splitBudget - imperiumW;
  const rightX = PAD_X + imperiumW + GUTTER_X;

  const chaosRows = REGION_PLANS.wide.chaos.rows;
  const xenosRows = REGION_PLANS.wide.xenos.rows;
  const rightH = usableH - GUTTER_Y;
  const chaosH = rightH * (chaosRows / (chaosRows + xenosRows));
  const xenosH = rightH - chaosH;

  return {
    imperium: { x: PAD_X, y: PAD_TOP, w: imperiumW, h: usableH, rows: REGION_PLANS.wide.imperium.rows },
    chaos: { x: rightX, y: PAD_TOP, w: rightW, h: chaosH, rows: chaosRows },
    xenos: { x: rightX, y: PAD_TOP + chaosH + GUTTER_Y, w: rightW, h: xenosH, rows: xenosRows },
  };
}

// Filters each curated constellation's members down to factions actually
// present in the catalog, then collects everything unclaimed into a
// synthetic `<alliance>-unaligned` group -- a new faction never crashes,
// never silently vanishes, and never overlaps; it just visibly degrades
// (dev-only console.warn) until the curated table is updated.
function buildGroups(allianceKey, nodeKeys) {
  const nodeSet = new Set(nodeKeys);
  const curated = CONSTELLATIONS[allianceKey] || [];
  const claimed = new Set();
  const groups = [];
  for (const c of curated) {
    const members = c.members.filter((m) => nodeSet.has(m));
    if (members.length === 0) continue;
    members.forEach((m) => claimed.add(m));
    groups.push({ ...c, members });
  }
  const orphans = nodeKeys.filter((k) => !claimed.has(k));
  if (orphans.length > 0) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        `[strategiumLayout] ${allianceKey}: unassigned factions, falling back to generic placement for this alliance:`,
        orphans
      );
    }
    groups.push({ key: `${allianceKey}-unaligned`, label: 'Unaligned', hub: orphans[0], members: orphans });
  }
  return groups;
}

// The curated block plan is only trusted for THIS alliance if every group
// (including a would-be orphan group, which by definition has no authored
// block) has a matching block whose slot count equals its member count --
// otherwise the whole alliance falls back to placeGeneric. Per-alliance, not
// per-block: patching just the one broken block while trusting the rest
// risks its own edge cases, and a blunt, safe fallback is cheap here.
function validatePlan(groups, plan) {
  if (!plan) return false;
  if (groups.some((g) => g.key.endsWith('-unaligned'))) return false;
  const blocksByKey = new Map(plan.blocks.map((b) => [b.key, b]));
  return groups.every((g) => {
    const block = blocksByKey.get(g.key);
    return !!block && block.slots.length === g.members.length;
  });
}

function pushEdges(group, edges, allianceKey) {
  const memberSet = new Set(group.members);
  if (Array.isArray(group.edges)) {
    for (const [a, b] of group.edges) {
      if (memberSet.has(a) && memberSet.has(b)) {
        edges.push({ id: `${a}~${b}`, a, b, allianceKey });
      }
    }
    return;
  }
  if (group.hub && memberSet.has(group.hub)) {
    for (const m of group.members) {
      if (m !== group.hub) edges.push({ id: `${group.hub}~${m}`, a: group.hub, b: m, allianceKey });
    }
  }
}

// Curated path: each group placed via its authored block (rowStart/rowSpan +
// xStart/xSpan fractions + per-block column count), members mapped 1:1 to
// `block.slots` in the SAME order as `group.members`.
function placeCurated(groups, plan, nodesByKey, region, maxBookCount, rMin, rMax, fh, allianceKey) {
  const anchors = [];
  const edges = [];
  const pitchY = region.h / region.rows;
  const jitterY = Math.max(0, (pitchY - fh - MIN_GAP_Y - 2 * WOBBLE_AMPLITUDE) / 2);
  const blocksByKey = new Map(plan.blocks.map((b) => [b.key, b]));

  for (const group of groups) {
    const block = blocksByKey.get(group.key);
    const blockX = region.x + region.w * block.xStart;
    const blockW = region.w * block.xSpan;
    const subW = (blockW - 2 * INSET_X) / block.cols;
    const jitterX = Math.min(JITTER_CAP, Math.max(0, (subW - CONSTELLATION_LABEL_WIDTH - MIN_GAP_X - 2 * WOBBLE_AMPLITUDE) / 2));

    group.members.forEach((key, i) => {
      const [row, col] = block.slots[i];
      const node = nodesByKey.get(key);
      const x = blockX + INSET_X + (col + 0.5) * subW + jitterSign(key, 'x') * jitterX;
      const y = region.y + (block.rowStart + row + 0.5) * pitchY - LABEL_BLOCK / 2 + jitterSign(key, 'y') * jitterY;
      anchors.push({ key, x, y, r: radiusForRange(node.bookCount, maxBookCount, rMin, rMax), allianceKey });
    });
    pushEdges(group, edges, allianceKey);
  }
  return { anchors, edges };
}

// Fallback path: full-width bands, one per constellation in order, each
// wrapped into `cols` columns -- same lattice mechanism (disjoint rows,
// disjoint sub-columns), just without the hand-authored block shape.
function placeGeneric(groups, nodesByKey, region, maxBookCount, rMin, rMax, fh, allianceKey) {
  const anchors = [];
  const edges = [];
  const cols = Math.max(1, Math.floor((region.w - 2 * INSET_X) / MIN_PITCH_X));
  const subW = (region.w - 2 * INSET_X) / cols;
  const jitterX = Math.min(JITTER_CAP, Math.max(0, (subW - CONSTELLATION_LABEL_WIDTH - MIN_GAP_X - 2 * WOBBLE_AMPLITUDE) / 2));

  let rowCursor = 0;
  const bands = groups.map((group) => {
    const rowSpan = Math.ceil(group.members.length / cols);
    const band = { group, rowStart: rowCursor, rowSpan };
    rowCursor += rowSpan;
    return band;
  });
  const totalRows = Math.max(1, rowCursor);
  const pitchY = region.h / totalRows;
  const jitterY = Math.max(0, (pitchY - fh - MIN_GAP_Y - 2 * WOBBLE_AMPLITUDE) / 2);

  for (const { group, rowStart } of bands) {
    const ordered = group.hub && group.members.includes(group.hub)
      ? [group.hub, ...group.members.filter((m) => m !== group.hub)]
      : group.members;
    ordered.forEach((key, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const node = nodesByKey.get(key);
      const x = region.x + INSET_X + (col + 0.5) * subW + jitterSign(key, 'x') * jitterX;
      const y = region.y + (rowStart + row + 0.5) * pitchY - LABEL_BLOCK / 2 + jitterSign(key, 'y') * jitterY;
      anchors.push({ key, x, y, r: radiusForRange(node.bookCount, maxBookCount, rMin, rMax), allianceKey });
    });
    pushEdges({ ...group, members: ordered }, edges, allianceKey);
  }
  return { anchors, edges };
}

// Lays out every alliance's factions via curated constellations, falling
// back to a plain lattice per-alliance when that alliance's curated data no
// longer matches the catalog (see buildGroups/validatePlan). Returns GLOBAL
// canvas-pixel anchors/edges plus the metrics StrategiumMap.jsx's label JSX
// and physics-free wobble hook both need to read from this SAME source.
export function layoutConstellations(alliances, width, height, maxBookCount) {
  if (width <= 0 || height <= 0) {
    return { metrics: null, regions: {}, anchors: [], edges: [], requiredHeight: height };
  }

  const regions = computeRegions(width, height);
  const minRowPitch = Math.min(...Object.values(regions).map((r) => r.h / r.rows));
  const rMax = Math.min(
    28,
    Math.max(10, Math.floor((minRowPitch - LABEL_BLOCK - MIN_GAP_Y - 2 * WOBBLE_AMPLITUDE - 2 * MIN_JITTER_Y) / 2))
  );
  const rMin = Math.round(rMax * 0.58);
  const fh = 2 * rMax + LABEL_BLOCK;

  const anchors = [];
  const edges = [];

  for (const alliance of alliances) {
    if (alliance.nodes.length === 0) continue;
    const region = regions[alliance.key];
    if (!region) continue;

    const nodesByKey = new Map(alliance.nodes.map((n) => [n.key, n]));
    const groups = buildGroups(alliance.key, [...nodesByKey.keys()]);
    const plan = REGION_PLANS.wide[alliance.key];

    const { anchors: regionAnchors, edges: regionEdges } = validatePlan(groups, plan)
      ? placeCurated(groups, plan, nodesByKey, region, maxBookCount, rMin, rMax, fh, alliance.key)
      : placeGeneric(groups, nodesByKey, region, maxBookCount, rMin, rMax, fh, alliance.key);

    anchors.push(...regionAnchors);
    edges.push(...regionEdges);
  }

  return {
    metrics: {
      labelWidth: CONSTELLATION_LABEL_WIDTH,
      labelLines: CONSTELLATION_LABEL_LINES,
      fontSize: CONSTELLATION_FONT_SIZE,
      lineHeight: CONSTELLATION_LINE_HEIGHT,
      labelGap: CONSTELLATION_LABEL_GAP,
      rMin,
      rMax,
      glowScale: CONSTELLATION_GLOW_SCALE,
      sigilScale: CONSTELLATION_SIGIL_SCALE,
      wobble: WOBBLE_AMPLITUDE,
    },
    regions,
    anchors,
    edges,
    requiredHeight: height,
  };
}
