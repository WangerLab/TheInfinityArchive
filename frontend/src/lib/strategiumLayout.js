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

// WIDE (landscape) layout: three curated regions (imperium/chaos/xenos),
// each fitted to the given width/height via computeRegions.
function layoutWide(alliances, width, height, maxBookCount) {
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

// Below this size the map panel loses its height entirely (Strategium.jsx
// drops its calc-height class under `lg`, per its own comment on why -- the
// header shrinks and there's no reliable viewport-relative height left to
// divide three ways). The WIDE region split would silently starve every
// region of room in that regime, so STACKED is a distinct layout, not a
// smaller version of WIDE.
const WIDE_MIN_WIDTH = 980;
const WIDE_MIN_HEIGHT = 620;

// Fixed, deliberately smaller star size for the stacked/short-panel case --
// chosen once, not derived from a given height, because STACKED computes
// its OWN required height as an OUTPUT (there is no incoming height to fit).
const STACKED_R_MAX = 16;
const STACKED_R_MIN = Math.round(STACKED_R_MAX * 0.58);
const STACKED_FH = 2 * STACKED_R_MAX + LABEL_BLOCK;
const STACKED_PITCH_Y = STACKED_FH + MIN_GAP_Y + 2 * WOBBLE_AMPLITUDE + 2 * MIN_JITTER_Y;

// STACKED (short/mobile) layout: three full-width regions stacked
// vertically, each placed via placeGeneric -- curated multi-column blocks
// are tuned for the WIDE region widths and wouldn't read sensibly this
// narrow anyway, so there is no separate hand-authored stacked plan, just
// the same lattice mechanism in one column. Returns a `requiredHeight`
// StrategiumMap.jsx uses to size a scrollable inner canvas, since there is
// no real viewport height to fit into here.
function layoutStacked(alliances, width, maxBookCount) {
  const regionW = Math.max(1, width - 2 * PAD_X);
  const cols = Math.max(1, Math.floor((regionW - 2 * INSET_X) / MIN_PITCH_X));

  const anchors = [];
  const edges = [];
  const regions = {};
  let cursorY = PAD_TOP;

  for (const alliance of alliances) {
    if (alliance.nodes.length === 0) continue;
    const nodesByKey = new Map(alliance.nodes.map((n) => [n.key, n]));
    const groups = buildGroups(alliance.key, [...nodesByKey.keys()]);
    const rows = groups.reduce((sum, g) => sum + Math.ceil(g.members.length / cols), 0) || 1;
    const regionH = rows * STACKED_PITCH_Y;
    const region = { x: PAD_X, y: cursorY, w: regionW, h: regionH, rows };
    regions[alliance.key] = region;

    const { anchors: regionAnchors, edges: regionEdges } = placeGeneric(
      groups, nodesByKey, region, maxBookCount, STACKED_R_MIN, STACKED_R_MAX, STACKED_FH, alliance.key
    );
    anchors.push(...regionAnchors);
    edges.push(...regionEdges);

    cursorY += regionH + GUTTER_Y;
  }

  return {
    metrics: {
      labelWidth: CONSTELLATION_LABEL_WIDTH,
      labelLines: CONSTELLATION_LABEL_LINES,
      fontSize: CONSTELLATION_FONT_SIZE,
      lineHeight: CONSTELLATION_LINE_HEIGHT,
      labelGap: CONSTELLATION_LABEL_GAP,
      rMin: STACKED_R_MIN,
      rMax: STACKED_R_MAX,
      glowScale: CONSTELLATION_GLOW_SCALE,
      sigilScale: CONSTELLATION_SIGIL_SCALE,
      wobble: WOBBLE_AMPLITUDE,
    },
    regions,
    anchors,
    edges,
    requiredHeight: Math.max(1, cursorY - GUTTER_Y + PAD_BOTTOM),
  };
}

// Lays out every alliance's factions via curated constellations, falling
// back to a plain lattice per-alliance when that alliance's curated data no
// longer matches the catalog (see buildGroups/validatePlan). Returns GLOBAL
// canvas-pixel anchors/edges plus the metrics StrategiumMap.jsx's label JSX
// and physics-free wobble hook both need to read from this SAME source.
// Dispatches to the WIDE (curated, three side-by-side regions) or STACKED
// (generic, one column) layout depending on the measured panel size.
export function layoutConstellations(alliances, width, height, maxBookCount) {
  if (width <= 0) {
    return { metrics: null, regions: {}, anchors: [], edges: [], requiredHeight: height };
  }
  if (width >= WIDE_MIN_WIDTH && height >= WIDE_MIN_HEIGHT) {
    return layoutWide(alliances, width, height, maxBookCount);
  }
  return layoutStacked(alliances, width, maxBookCount);
}
