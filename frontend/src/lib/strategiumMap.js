// Pure derivation for the Strategium meta-map: turns the flat catalog + read
// state into a two-tier faction tree (alliance -> faction node -> optional
// chapter/legion children) plus the "position" the recommendation moment
// anchors on. No React, no d3 here -- StrategiumMap.jsx and Strategium.jsx
// consume this; kept separate so the tree-building logic is testable and
// independent of physics/rendering concerns.

const ALLIANCE_LABEL = { imperium: 'Imperium', chaos: 'Chaos', xenos: 'Xenos' };
const ALLIANCE_ORDER = ['imperium', 'chaos', 'xenos'];

// A faction NODE's sigil is about the faction itself, never about who
// narrates one of its books -- pooling book-level POV sigils (the old
// approach) gave Tyranids an orange Ultramarines glyph, because Tyranids'
// only book (Leviathan) happens to be Ultramarine-narrated. This is a
// straight inversion of FactionSigil.jsx's SIGIL_LABEL (sigil key -> label)
// back to label -> key, plus explicit overrides for umbrella/generic nodes
// that have no single narrating book to derive from. Curated once, here --
// never re-derived from votes. A name absent from this table (e.g. a
// catch-all that was resolved to NULL faction_primary) returns null, which
// FactionSigil already renders as the correctly-tinted alliance fallback
// glyph -- never a crash, never a wrong glyph.
const FACTION_SIGIL = {
  // Imperium
  'Astra Militarum': 'astra_militarum',
  'Adeptus Astartes': 'astartes_generic',
  'Space Marines': 'astartes_generic',
  'Soul Drinkers': 'astartes_generic', // no dedicated asset, per I-1 migration
  'Adepta Sororitas': 'sororitas',
  'Inquisition': 'inquisition',
  'Adeptus Mechanicus': 'admech',
  'Ultramarines': 'ultramarines',
  'Blood Angels': 'blood_angels',
  'Dark Angels': 'dark_angels',
  'Adeptus Custodes': 'custodes',
  'Imperial Knights': 'imperial_knights',
  'Adeptus Arbites': 'arbites',
  'Space Wolves': 'space_wolves',
  'Salamanders': 'salamanders',
  'Deathwatch': 'deathwatch',
  'Imperial Fists': 'imperial_fists',
  'Grey Knights': 'grey_knights',
  'Officio Assassinorum': null,
  'Navis Nobilite': 'navis',
  'Imperial Navy': null, // distinct in-universe body from Navis Nobilite (M-2)
  'Enforcers': null,

  // Chaos
  'Chaos Undivided': 'chaos_generic',
  'Chaos Space Marines': 'chaos_generic',
  'Red Corsairs': 'chaos_generic',
  'Word Bearers': 'word_bearers',
  'Night Lords': 'night_lords',
  'Alpha Legion': 'alpha_legion',
  'Black Legion': 'black_legion',
  'Iron Warriors': 'iron_warriors',
  'Death Guard': 'death_guard',
  'Thousand Sons': 'thousand_sons',
  'World Eaters': 'world_eaters',
  "Emperor's Children": 'emperors_children',

  // Xenos
  'Aeldari': 'aeldari',
  'Drukhari': 'drukhari',
  'Necrons': 'necrons',
  'Orks': 'orks',
  "T'au": 'tau',
  'Tyranids': 'tyranids',
  'Genestealer Cults': 'genestealer',
  'Leagues of Votann': 'votann',
};

function sigilForFaction(name) {
  return FACTION_SIGIL[name] ?? null;
}

// Flatten every book row -- entries, omnibus parents, and their children --
// into one list, each unit carrying its own faction identity. An omnibus
// parent and its children are each counted, mirroring the DB's own row-count
// semantics (the same counting the parent_faction taxonomy was dry-run
// verified against), so "catalog frequency" prominence stays consistent with
// what was actually seeded.
function flattenAll(projectData) {
  const out = [];
  for (const phase of projectData.phases) {
    for (const book of phase.books) {
      out.push({ unit: book, phase });
      if (Array.isArray(book.contents)) {
        for (const child of book.contents) {
          out.push({ unit: child, phase, parentTitle: book.title, parentEntryId: book.entryId });
        }
      }
    }
  }
  return out;
}

function isUnitRead(entryId, bookProgress) {
  const p = bookProgress[entryId];
  if (!p) return false;
  return (p.status ?? (p.isRead ? 'read' : 'unread')) === 'read';
}

function voteFor(votesMap, value) {
  if (!value) return;
  votesMap.set(value, (votesMap.get(value) || 0) + 1);
}

function winnerOf(votesMap) {
  let best = null;
  let bestN = 0;
  for (const [key, n] of votesMap) {
    if (n > bestN) { bestN = n; best = key; }
  }
  return best;
}

// Build the FLAT faction tree, grouped by grand_alliance. Every distinct
// faction (factionPrimary) becomes its own top-level node, whether or not it
// carries a parentFaction -- there is no nesting and no click-to-expand
// (reversed from the original two-tier design: with the constellation
// rework's bigger, well-spread stars there was no longer real cover to hide
// chapters/legions behind an umbrella; Tim's call after that live test).
// Umbrella values that carry zero direct books of their own (Chaos Undivided,
// Nurgle, Tzeentch, Khorne, Slaanesh) exist purely as parent_faction values,
// never as any book's own faction -- they contribute no node of their own,
// only their children, each promoted to a normal top-level node.
export function buildFactionTree(projectData, bookProgress) {
  if (!projectData) return { alliances: [] };
  const units = flattenAll(projectData).filter((u) => u.unit.factionPrimary);

  const top = new Map(); // nodeKey -> { allianceVotes, entryIds }
  const children = new Map(); // parentKey -> Map<childKey, { allianceVotes, entryIds }>

  const touch = (map, key) => {
    if (!map.has(key)) map.set(key, { allianceVotes: new Map(), entryIds: [] });
    return map.get(key);
  };

  for (const { unit } of units) {
    const own = unit.factionPrimary;
    const parent = unit.parentFaction || null;

    if (parent) {
      const kids = children.get(parent) || new Map();
      const child = touch(kids, own);
      voteFor(child.allianceVotes, unit.grandAlliance);
      child.entryIds.push(unit.entryId);
      children.set(parent, kids);
      touch(top, parent); // register the umbrella even with zero direct books
    } else {
      const node = touch(top, own);
      voteFor(node.allianceVotes, unit.grandAlliance);
      node.entryIds.push(unit.entryId);
    }
  }

  // Pool alliance votes across every child of an umbrella. Used whenever the
  // umbrella has no votes of its own (no direct books) -- it must still
  // resolve to a real alliance rather than fall through to 'unaligned'.
  const poolChildAllianceVotes = (key) => {
    const kids = children.get(key);
    if (!kids) return new Map();
    const pooled = new Map();
    for (const child of kids.values()) {
      for (const [value, n] of child.allianceVotes) {
        pooled.set(value, (pooled.get(value) || 0) + n);
      }
    }
    return pooled;
  };

  const allianceOf = (key, node) => {
    const own = winnerOf(node.allianceVotes);
    if (own) return own;
    return winnerOf(poolChildAllianceVotes(key)) || 'unaligned';
  };

  const byAlliance = new Map();
  const pushNode = (allianceKey, node) => {
    if (!byAlliance.has(allianceKey)) byAlliance.set(allianceKey, []);
    byAlliance.get(allianceKey).push(node);
  };

  for (const [key, node] of top) {
    const alliance = allianceOf(key, node);

    // Every child is promoted to its OWN top-level node, resolving its OWN
    // alliance from its own votes -- almost always identical to the
    // umbrella's, but resolved independently rather than inherited. Falls
    // back to the umbrella's alliance only if a child somehow carried no
    // votes of its own.
    const kids = children.get(key);
    if (kids) {
      for (const [childKey, child] of kids) {
        const childAlliance = winnerOf(child.allianceVotes) || alliance;
        pushNode(childAlliance, {
          key: childKey,
          label: childKey,
          sigil: sigilForFaction(childKey),
          bookCount: child.entryIds.length,
          isRead: child.entryIds.length > 0 && child.entryIds.every((id) => isUnitRead(id, bookProgress)),
        });
      }
    }

    // An umbrella with no books of its own (Chaos Undivided, the four Chaos
    // gods) exists purely as a parent_faction value -- it carried no real
    // content of its own, so it contributes no node of its own now that its
    // children have been promoted above.
    const ownBookCount = node.entryIds.length;
    if (ownBookCount === 0) continue;

    pushNode(alliance, {
      key,
      label: key,
      sigil: sigilForFaction(key),
      bookCount: ownBookCount,
      isRead: node.entryIds.every((id) => isUnitRead(id, bookProgress)),
    });
  }

  const alliances = ALLIANCE_ORDER.map((key) => {
    const nodes = (byAlliance.get(key) || []).sort((a, b) => b.bookCount - a.bookCount);
    return { key, label: ALLIANCE_LABEL[key], factionCount: nodes.length, nodes };
  });

  return { alliances };
}

// The reader's current position: the faction of the most recently completed
// book (by completed_at), across entries and sub-items alike. Null if
// nothing has been finished yet -- the recommendation moment has no anchor.
// nodeKey is the book's OWN faction (never its parentFaction) -- every
// faction is its own flat node on the map now, so a chapter/legion always
// resolves to a real, visible node.
export function getPosition(projectData, bookProgress) {
  if (!projectData) return null;
  const units = flattenAll(projectData);
  let best = null;
  let bestAt = -Infinity;

  for (const { unit } of units) {
    if (!unit.factionPrimary) continue;
    const p = bookProgress[unit.entryId];
    const status = p?.status ?? (p?.isRead ? 'read' : 'unread');
    if (status !== 'read') continue;
    const t = p.completedAt ? Date.parse(p.completedAt) : 0;
    if (t >= bestAt) {
      bestAt = t;
      best = {
        entryId: unit.entryId,
        title: unit.title,
        factionPrimary: unit.factionPrimary,
        parentFaction: unit.parentFaction || null,
        grandAlliance: unit.grandAlliance,
        nodeKey: unit.factionPrimary,
      };
    }
  }
  return best;
}

// Unread candidates for the LLM contract's stable prefix (spec §6): every
// entry/sub-item not yet read, with only the fields the advisor needs to
// reason about them -- nothing it would have to invent.
export function getUnreadCandidates(projectData, bookProgress) {
  if (!projectData) return [];
  const units = flattenAll(projectData);
  const out = [];

  for (const { unit, phase } of units) {
    if (!unit.factionPrimary) continue;
    const p = bookProgress[unit.entryId];
    const status = p?.status ?? (p?.isRead ? 'read' : 'unread');
    if (status === 'read') continue;
    out.push({
      entryId: unit.entryId,
      title: unit.title,
      summary: unit.summary || null,
      semanticTags: unit.semanticTags || [],
      factionPrimary: unit.factionPrimary,
      parentFaction: unit.parentFaction || null,
      grandAlliance: unit.grandAlliance,
      phase: phase.title,
    });
  }
  return out;
}

// Look up a single book unit (entry or sub-item) by entryId, for the
// advisory panel to resolve a recommendation's entry_id back to a full
// book object (title, summary, sigil) without the edge function ever
// needing to send one.
export function resolveBookByEntryId(projectData, entryId) {
  if (!projectData || !entryId) return null;
  for (const { unit, phase, parentTitle, parentEntryId } of flattenAll(projectData)) {
    if (unit.entryId === entryId) return { ...unit, phase: phase.title, parentTitle: parentTitle || null, parentEntryId: parentEntryId || null };
  }
  return null;
}

// The reader's taste profile input for the LLM contract (spec §6): derived
// from EXISTING reflections, never a new field collected for this purpose.
// Capped to the most recent N read books (by completed_at) so the payload
// doesn't grow unbounded over years of reading.
const MAX_REFLECTIONS = 20;

export function getReflections(projectData, bookProgress) {
  if (!projectData) return [];
  const units = flattenAll(projectData);
  const read = [];

  for (const { unit } of units) {
    const p = bookProgress[unit.entryId];
    const status = p?.status ?? (p?.isRead ? 'read' : 'unread');
    if (status !== 'read') continue;
    if (!p?.rating && !p?.auspexReading) continue; // nothing to learn from
    read.push({
      entryId: unit.entryId,
      title: unit.title,
      factionPrimary: unit.factionPrimary,
      rating: p.rating || null,
      auspexReading: p.auspexReading || null,
      completedAt: p.completedAt || null,
    });
  }

  read.sort((a, b) => (Date.parse(b.completedAt || 0) || 0) - (Date.parse(a.completedAt || 0) || 0));
  return read.slice(0, MAX_REFLECTIONS);
}
