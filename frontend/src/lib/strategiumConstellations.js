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
// `members` array -- this positional pairing is what `layoutClusters.js`
// relies on, and is exactly the invariant this file's single-source
// structure exists to protect.
export const REGION_PLANS = {
  wide: {
    imperium: {
      rows: 7,
      blocks: [
        {
          key: 'astartes', rowStart: 0, rowSpan: 3, xStart: 0, xSpan: 1, cols: 4,
          slots: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 1], [1, 2], [1, 3], [2, 1], [2, 2]],
        },
        {
          key: 'ordos', rowStart: 3, rowSpan: 2, xStart: 0, xSpan: 0.5, cols: 2,
          slots: [[0, 0], [0, 1], [1, 1], [1, 0]],
        },
        {
          key: 'militarum', rowStart: 3, rowSpan: 2, xStart: 0.5, xSpan: 0.5, cols: 2,
          slots: [[0, 1], [1, 1], [1, 0]],
        },
        {
          key: 'forge', rowStart: 5, rowSpan: 2, xStart: 0, xSpan: 1 / 3, cols: 1,
          slots: [[0, 0], [1, 0]],
        },
        {
          key: 'throne', rowStart: 5, rowSpan: 2, xStart: 1 / 3, xSpan: 1 / 3, cols: 1,
          slots: [[0, 0], [1, 0]],
        },
        {
          key: 'lex', rowStart: 5, rowSpan: 2, xStart: 2 / 3, xSpan: 1 / 3, cols: 1,
          slots: [[0, 0], [1, 0]],
        },
      ],
    },
    chaos: {
      rows: 4,
      blocks: [
        {
          key: 'undivided', rowStart: 0, rowSpan: 2, xStart: 0, xSpan: 1, cols: 3,
          slots: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2]],
        },
        {
          key: 'ruinous', rowStart: 2, rowSpan: 2, xStart: 0, xSpan: 2 / 3, cols: 2,
          slots: [[0, 0], [0, 1], [1, 1], [1, 0]],
        },
        {
          key: 'renegades', rowStart: 2, rowSpan: 2, xStart: 2 / 3, xSpan: 1 / 3, cols: 1,
          slots: [[0, 0], [1, 0]],
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
