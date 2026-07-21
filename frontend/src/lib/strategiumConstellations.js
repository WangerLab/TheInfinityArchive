// Curated faction groupings for the Strategium meta-map, plus the hand-
// authored lattice block plan that places each group's members without
// overlap. Both live in ONE file because a block's `slots.length` must
// always equal its constellation's `members.length` -- splitting the
// grouping data from its placement data would let the two drift apart
// silently, exactly the kind of two-numbers-disagree bug that broke every
// prior algorithmic layout in this file's history.
//
// This REPLACES algorithmic placement (radial search, territory budgets,
// footprint-aware packing -- four rounds, each failing differently) with
// direct lookup: every faction has a fixed, curated home. There is no
// search to terminate somewhere wrong.
//
// Grouping semantics (Tim's picks, both confirmed):
// - Deathwatch sits in `ordos` (Ordo Xenos chamber militant) rather than
//   with the Astartes chapters.
// - Adepta Sororitas sits in `throne` with the Custodes ("the Emperor's
//   own") rather than with the Inquisition/Ecclesiarchy.
//
// A constellation's `edges` are keyed by FACTION STRING, not member index --
// if a faction later disappears from the catalog, only the edges touching
// it drop; the rest of the constellation is untouched. Edges default to
// hub-to-spoke when omitted. `hub: null` is a first-class case (Chaos
// Undivided has no books of its own, so it has no node -- `ruinous` has no
// hub and is wired as an explicit chain instead).
//
// `label` per constellation is documented reserve, not yet consumed by any
// renderer -- a future hover/tooltip naming the constellation ("THE INNER
// CIRCLE") can read it without a data-model change.

export const CONSTELLATIONS = {
  imperium: [
    {
      key: 'astartes',
      label: 'The Adeptus Astartes',
      hub: 'Adeptus Astartes',
      members: [
        'Blood Angels', 'Ultramarines', 'Salamanders', 'Soul Drinkers',
        'Adeptus Astartes', 'Space Marines', 'Imperial Fists',
        'Dark Angels', 'Space Wolves',
      ],
      edges: [
        ['Adeptus Astartes', 'Space Marines'],
        ['Adeptus Astartes', 'Ultramarines'],
        ['Adeptus Astartes', 'Blood Angels'],
        ['Adeptus Astartes', 'Dark Angels'],
        ['Space Marines', 'Salamanders'],
        ['Space Marines', 'Space Wolves'],
        ['Space Marines', 'Imperial Fists'],
        ['Imperial Fists', 'Soul Drinkers'],
      ],
    },
    {
      key: 'ordos',
      label: 'The Ordos',
      hub: 'Inquisition',
      members: ['Inquisition', 'Grey Knights', 'Deathwatch', 'Officio Assassinorum'],
    },
    {
      key: 'militarum',
      label: 'The Astra Militarum',
      hub: 'Astra Militarum',
      members: ['Imperial Navy', 'Navis Nobilite', 'Astra Militarum'],
      edges: [
        ['Astra Militarum', 'Imperial Navy'],
        ['Imperial Navy', 'Navis Nobilite'],
      ],
    },
    {
      key: 'forge',
      label: 'The Forge',
      hub: 'Adeptus Mechanicus',
      members: ['Adeptus Mechanicus', 'Imperial Knights'],
    },
    {
      key: 'throne',
      label: "The Emperor's Own",
      hub: 'Adeptus Custodes',
      members: ['Adepta Sororitas', 'Adeptus Custodes'],
    },
    {
      key: 'lex',
      label: 'The Lex Imperialis',
      hub: 'Adeptus Arbites',
      members: ['Adeptus Arbites', 'Enforcers'],
    },
  ],

  chaos: [
    {
      key: 'undivided',
      label: 'The Undivided Legions',
      hub: 'Black Legion',
      members: ['Word Bearers', 'Black Legion', 'Night Lords', 'Alpha Legion', 'Iron Warriors'],
    },
    {
      key: 'ruinous',
      label: 'The Ruinous Powers',
      hub: null,
      members: ['World Eaters', 'Death Guard', 'Thousand Sons', "Emperor's Children"],
      edges: [
        ['World Eaters', 'Death Guard'],
        ['Death Guard', 'Thousand Sons'],
        ['Thousand Sons', "Emperor's Children"],
      ],
    },
    {
      key: 'renegades',
      label: 'The Renegades',
      hub: 'Chaos Space Marines',
      members: ['Chaos Space Marines', 'Red Corsairs'],
    },
  ],

  xenos: [
    {
      key: 'hive',
      label: 'The Hive',
      hub: 'Tyranids',
      members: ['Tyranids', 'Genestealer Cults'],
    },
    {
      key: 'aeldari',
      label: 'The Aeldari',
      hub: 'Aeldari',
      members: ['Aeldari', 'Drukhari'],
    },
    {
      key: 'ancients',
      label: 'The Ancients',
      hub: 'Necrons',
      members: ['Necrons', 'Leagues of Votann'],
    },
    {
      key: 'upstarts',
      label: 'The Upstarts',
      hub: 'Orks',
      members: ['Orks', "T'au"],
    },
  ],
};

// Hand-authored lattice block plans, one per alliance, for the WIDE
// (landscape, >= 980x620) canvas split. `rows` is the region's own global
// row count; each block's `rowStart`/`rowSpan` are region-relative absolute
// rows, `xStart`/`xSpan` are fractions of the region's width. `slots` are
// BLOCK-relative [row, col] pairs (0-indexed from the block's own
// rowStart), one per member, in the SAME order as the constellation's
// `members` array -- this positional pairing is what `strategiumLayout.js`'s
// `layoutConstellations` relies on, and is exactly the invariant this file's
// single-source structure exists to protect.
export const REGION_PLANS = {
  wide: {
    // Ring-placed blocks (astartes, ordos -- see placeHubRing in
    // strategiumLayout.js) need a footprint sized for their IDEAL ring
    // radius, not the flat-grid dimensions they inherited when placeHubRing
    // was first added. `rows` stays 7 (unchanged) to avoid touching pitchY,
    // and thus the global star radius, as a side effect.
    //
    // Second pass, after a live test with the clearHub label-width fix
    // (strategiumLayout.js) showed Ordos still visibly cramped -- the fix
    // corrected the FORMULA (raising Ordos's ideal radius from ~66px to
    // ~130px, dominated by LABEL_WIDTH/2 clearance for its horizontally-
    // aligned spokes, not icon size), but the block dimensions from the
    // first pass were sized against the OLD, too-small ideal and still
    // capped the new one hard. Astartes' own ideal (~185px half-extent,
    // computed from real per-faction book counts, not a worst-case guess)
    // turned out to have real slack in its rowSpan=4 allocation -- shrunk
    // to rowSpan=3.6 (margin ~7px) to free height for Ordos's now-larger
    // footprint, moved beside a narrowed Militarum. Ordos widens
    // (xSpan 0.45->0.60, rowSpan 3->3.4) with Forge/Throne/Lex each
    // becoming a single 2-column row beside it instead of their old
    // 2-row single-column stacks -- verified at a 1230x900 reference
    // panel: Ordos now reaches ~181px of its own required ~173px half-
    // extent (margin ~8px), each Forge/Throne/Lex row's subW clears
    // LABEL_WIDTH by ~3px. Deliberately modest margins, not the ~15-20px
    // seen elsewhere in this file: two rings sharing one 616x786 region
    // is a genuine capacity constraint, verified arithmetically, not a
    // rounding choice -- flag for a closer live look if it still reads
    // tight.
    imperium: {
      rows: 7,
      blocks: [
        {
          key: 'astartes', rowStart: 0, rowSpan: 3.6, xStart: 0, xSpan: 0.65, cols: 4,
          slots: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 1], [1, 2], [1, 3], [2, 1], [2, 2]],
        },
        {
          key: 'militarum', rowStart: 0, rowSpan: 3, xStart: 0.65, xSpan: 0.35, cols: 1,
          slots: [[0, 0], [1, 0], [2, 0]],
        },
        {
          key: 'ordos', rowStart: 3.6, rowSpan: 3.4, xStart: 0, xSpan: 0.6, cols: 2,
          slots: [[0, 0], [0, 1], [1, 1], [1, 0]],
        },
        {
          key: 'forge', rowStart: 3.6, rowSpan: 1, xStart: 0.6, xSpan: 0.4, cols: 2,
          slots: [[0, 0], [0, 1]],
        },
        {
          key: 'throne', rowStart: 4.6, rowSpan: 1, xStart: 0.6, xSpan: 0.4, cols: 2,
          slots: [[0, 0], [0, 1]],
        },
        {
          key: 'lex', rowStart: 5.6, rowSpan: 1, xStart: 0.6, xSpan: 0.4, cols: 2,
          slots: [[0, 0], [0, 1]],
        },
      ],
    },
    // Same second-pass fix as Imperium's Ordos, applied to Undivided: the
    // clearHub label-width bug (strategiumLayout.js) raised its ideal
    // radius from ~80px to ~130px. Chaos only carries ONE ring (vs
    // Imperium's two), so there's real slack here -- Undivided gets full
    // ideal-radius clearance with margin on both axes (~16px width, ~8px
    // height), wider than Ordos needed to be. Ruinous keeps its single
    // row of 4 (its own chain order), now sitting right at the region's
    // lower edge -- its footprint spills a little into the inter-region
    // gutter, verified clear of Xenos's own content by ~40px.
    chaos: {
      rows: 4,
      blocks: [
        {
          key: 'undivided', rowStart: 0, rowSpan: 3.5, xStart: 0, xSpan: 0.74, cols: 3,
          slots: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2]],
        },
        {
          key: 'renegades', rowStart: 0, rowSpan: 2, xStart: 0.74, xSpan: 0.26, cols: 1,
          slots: [[0, 0], [1, 0]],
        },
        {
          key: 'ruinous', rowStart: 3.5, rowSpan: 0.5, xStart: 0, xSpan: 1, cols: 4,
          slots: [[0, 0], [0, 1], [0, 2], [0, 3]],
        },
      ],
    },
    xenos: {
      rows: 3,
      blocks: [
        {
          key: 'hive', rowStart: 0, rowSpan: 1, xStart: 0, xSpan: 2 / 3, cols: 2,
          slots: [[0, 0], [0, 1]],
        },
        {
          key: 'aeldari', rowStart: 0, rowSpan: 2, xStart: 2 / 3, xSpan: 1 / 3, cols: 1,
          slots: [[0, 0], [1, 0]],
        },
        {
          key: 'ancients', rowStart: 1, rowSpan: 2, xStart: 0, xSpan: 1 / 3, cols: 1,
          slots: [[0, 0], [1, 0]],
        },
        {
          key: 'upstarts', rowStart: 2, rowSpan: 1, xStart: 1 / 3, xSpan: 2 / 3, cols: 2,
          slots: [[0, 0], [0, 1]],
        },
      ],
    },
  },
};
