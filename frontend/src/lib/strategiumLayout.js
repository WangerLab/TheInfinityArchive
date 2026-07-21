import { CONSTELLATIONS, REGION_PLANS } from './strategiumConstellations';

// Anchor layout for the Strategium meta-map: every faction has a CURATED
// home (strategiumConstellations.js) in a disjoint lattice cell inside a
// disjoint block inside a disjoint alliance region. Positions are looked up,
// never searched for.
//
// This is the second architectural generation of this file. The first
// (deleted here) placed nodes via search: grow a radius/scale outward until
// a collision check passes. Four different collision checks in a row each
// failed differently -- isotropic circle territory (collapsed a narrow
// cluster to a point), per-axis rectangle territory + fit-scale (fell out of
// sync with footprint-aware packing and let clusters grow through their
// neighbours), three rounds of PACK_GAP tuning (never fixed the underlying
// geometry), and finally a shared cross-cluster collision list (a blocked
// node marched its one FIXED spiral angle straight through a neighbouring
// alliance's cluster once the list stopped resetting per alliance). The
// common failure shape: a search that "keeps going until clear" will
// eventually terminate somewhere wrong.
//
// Lookup instead of search removes that failure class structurally.
// Irregularity and the live wobble (hooks/useStellarDrift.js) are budgeted
// OUT of each lattice cell's proven slack, so they can never consume it --
// overlap is impossible by construction, not something a runtime check has
// to keep re-proving.
//
// All dimensions are REAL measured pixels (StrategiumMap.jsx measures its
// container via ResizeObserver), not a fixed virtual unit.

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

// A hub group this size or larger reads better as a compact ring (hub at
// the centre, spokes evenly spaced around it, Tim's explicit ask: "the
// other chapters grouped AROUND it") than as a flat multi-column grid --
// which, especially in a wide block, can put the hub and a spoke at
// opposite ends of a row with a long, crossing connector between them.
// Pairs/chains (3 members or fewer, or no hub at all) stay on the grid
// path below; a ring is meaningless for 2-3 members already sitting close.
const HUB_RING_MIN_MEMBERS = 4;

// Hub at the block's own centre; spokes evenly spaced on a ring around it
// (angle = -90° + i*360/n, starting straight up -- the same convention the
// pre-flatten satellite-ring mechanic used, now a fixed curated arrangement
// rather than a click-driven expand). Ring radius is the larger of "clears
// the hub's own footprint" and "enough circumference for n spoke
// footprints side by side", capped to whatever the block's OWN existing
// rowSpan/cols footprint actually allows -- the region/block split itself
// is not re-derived, only the arrangement inside an unchanged block.
function placeHubRing(group, block, nodesByKey, region, pitchY, maxBookCount, rMin, rMax, allianceKey) {
  const anchors = [];
  const spokes = group.members.filter((k) => k !== group.hub);
  const hubNode = nodesByKey.get(group.hub);
  const hubR = radiusForRange(hubNode.bookCount, maxBookCount, rMin, rMax);
  const spokeRadii = spokes.map((k) => radiusForRange(nodesByKey.get(k).bookCount, maxBookCount, rMin, rMax));
  const maxSpokeR = Math.max(...spokeRadii);
  const avgSpokeR = spokeRadii.reduce((s, r) => s + r, 0) / spokeRadii.length;
  const n = spokes.length;

  const clearHub = hubR + maxSpokeR + MIN_GAP_X + 2 * WOBBLE_AMPLITUDE;
  const circumferenceBudget = (n * (2 * avgSpokeR + CONSTELLATION_LABEL_WIDTH * 0.6 + MIN_GAP_X)) / (2 * Math.PI);
  const idealRadius = Math.max(clearHub, circumferenceBudget);

  const blockW = region.w * block.xSpan;
  const blockHalfW = blockW / 2 - INSET_X;
  const blockHalfH = (block.rowSpan * pitchY) / 2 - INSET_X;
  const maxRadius = Math.max(1, Math.min(blockHalfW, blockHalfH) - maxSpokeR - LABEL_BLOCK / 2 - MIN_GAP_X);
  const ringRadius = Math.min(idealRadius, maxRadius);

  const centerX = region.x + region.w * block.xStart + blockW / 2;
  const centerY = region.y + (block.rowStart + block.rowSpan / 2) * pitchY - LABEL_BLOCK / 2;

  anchors.push({ key: group.hub, x: centerX, y: centerY, r: hubR, allianceKey });
  spokes.forEach((key, i) => {
    const angle = -Math.PI / 2 + i * ((2 * Math.PI) / n);
    anchors.push({
      key,
      x: centerX + ringRadius * Math.cos(angle),
      y: centerY + ringRadius * Math.sin(angle),
      r: spokeRadii[i],
      allianceKey,
    });
  });
  return anchors;
}

// Curated path: each group placed via its authored block (rowStart/rowSpan +
// xStart/xSpan fractions + per-block column count). A hub group with
// HUB_RING_MIN_MEMBERS or more total members uses placeHubRing instead of
// the block's grid slots (its slots are still authored and reserved for the
// generic-fallback case, see validatePlan); everything else maps 1:1 to
// `block.slots` in the SAME order as `group.members`.
function placeCurated(groups, plan, nodesByKey, region, maxBookCount, rMin, rMax, fh, allianceKey) {
  const anchors = [];
  const edges = [];
  const pitchY = region.h / region.rows;
  const jitterY = Math.max(0, (pitchY - fh - MIN_GAP_Y - 2 * WOBBLE_AMPLITUDE) / 2);
  const blocksByKey = new Map(plan.blocks.map((b) => [b.key, b]));

  for (const group of groups) {
    const block = blocksByKey.get(group.key);

    if (group.hub && group.members.length >= HUB_RING_MIN_MEMBERS) {
      anchors.push(...placeHubRing(group, block, nodesByKey, region, pitchY, maxBookCount, rMin, rMax, allianceKey));
      pushEdges(group, edges, allianceKey);
      continue;
    }

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
// Three curated regions (imperium/chaos/xenos), each fitted to the given
// width/height via computeRegions.
//
// A width/height-gated STACKED fallback (single-column, generic placement)
// briefly lived here for a short/mobile panel Tim never actually reported a
// problem with -- and it fired on his real desktop panel, replacing the
// curated hub-adjacent layout with placeGeneric's row-major fill, which has
// no notion of which members are meant to sit near each other. That's what
// produced the "arbitrary, very long connector lines" and the forced
// scrolling Tim flagged live, on top of an unrelated caption-position bug
// (CAPTION_CORNER is pinned to canvas corners regardless of layout mode, so
// stacked regions left the Chaos caption clumped at the top instead of
// marking its own band). DELIBERATE REVERSAL: removed entirely rather than
// patched, per this project's own process lesson (Header-Overhaul sprint) --
// don't introduce a preventive architectural change for a problem the user
// didn't ask to solve. The existing rMax clamp (10-28, below) already
// provides a graceful size floor for a smaller panel; no second layout mode
// is needed.
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
