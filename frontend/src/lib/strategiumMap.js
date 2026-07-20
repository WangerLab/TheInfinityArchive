// Pure derivation for the Strategium meta-map: turns the flat catalog + read
// state into a two-tier faction tree (alliance -> faction node -> optional
// chapter/legion children) plus the "position" the recommendation moment
// anchors on. No React, no d3 here -- StrategiumMap.jsx and Strategium.jsx
// consume this; kept separate so the tree-building logic is testable and
// independent of physics/rendering concerns.

const ALLIANCE_LABEL = { imperium: 'Imperium', chaos: 'Chaos', xenos: 'Xenos' };
const ALLIANCE_ORDER = ['imperium', 'chaos', 'xenos'];

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

// Build the two-tier faction tree, grouped by grand_alliance. A book's own
// faction (factionPrimary) is a top-level node when its parentFaction is
// NULL, or a child nested under parentFaction otherwise. Umbrella nodes with
// zero direct books of their own (Chaos Undivided, Nurgle, Tzeentch, Khorne,
// Slaanesh) still appear -- they exist purely as parent_faction values, never
// as any book's own faction, but they are the mid-tier expansion target for
// their children.
export function buildFactionTree(projectData, bookProgress) {
  if (!projectData) return { alliances: [] };
  const units = flattenAll(projectData).filter((u) => u.unit.factionPrimary);

  const top = new Map(); // nodeKey -> { allianceVotes, sigilVotes, entryIds }
  const children = new Map(); // parentKey -> Map<childKey, { allianceVotes, sigilVotes, entryIds }>

  const touch = (map, key) => {
    if (!map.has(key)) map.set(key, { allianceVotes: new Map(), sigilVotes: new Map(), entryIds: [] });
    return map.get(key);
  };

  for (const { unit } of units) {
    const own = unit.factionPrimary;
    const parent = unit.parentFaction || null;

    if (parent) {
      const kids = children.get(parent) || new Map();
      const child = touch(kids, own);
      voteFor(child.allianceVotes, unit.grandAlliance);
      voteFor(child.sigilVotes, unit.factionSigil);
      child.entryIds.push(unit.entryId);
      children.set(parent, kids);
      touch(top, parent); // register the umbrella even with zero direct books
    } else {
      const node = touch(top, own);
      voteFor(node.allianceVotes, unit.grandAlliance);
      voteFor(node.sigilVotes, unit.factionSigil);
      node.entryIds.push(unit.entryId);
    }
  }

  // Pool a vote-map field (allianceVotes or sigilVotes) across every child of
  // an umbrella, weighted implicitly since each child's map already holds one
  // vote per book. Used whenever the umbrella has no votes of its own (no
  // direct books) -- it must still resolve to a real alliance/sigil rather
  // than fall through to the unaligned/no-sigil default.
  const poolChildVotes = (key, field) => {
    const kids = children.get(key);
    if (!kids) return new Map();
    const pooled = new Map();
    for (const child of kids.values()) {
      for (const [value, n] of child[field]) {
        pooled.set(value, (pooled.get(value) || 0) + n);
      }
    }
    return pooled;
  };

  const allianceOf = (key, node) => {
    const own = winnerOf(node.allianceVotes);
    if (own) return own;
    return winnerOf(poolChildVotes(key, 'allianceVotes')) || 'unaligned';
  };

  const byAlliance = new Map();
  for (const [key, node] of top) {
    const alliance = allianceOf(key, node);
    if (!byAlliance.has(alliance)) byAlliance.set(alliance, []);

    const kids = children.get(key);
    const childNodes = kids
      ? [...kids.entries()].map(([childKey, child]) => ({
          key: childKey,
          label: childKey,
          sigil: winnerOf(child.sigilVotes),
          bookCount: child.entryIds.length,
          isRead: child.entryIds.length > 0 && child.entryIds.every((id) => isUnitRead(id, bookProgress)),
          parentKey: key,
        })).sort((a, b) => b.bookCount - a.bookCount)
      : [];

    const ownBookCount = node.entryIds.length;
    const childBookCount = childNodes.reduce((sum, c) => sum + c.bookCount, 0);

    // A pure single-child umbrella (no books of its own, exactly one child --
    // the four Chaos gods, each hiding one legion) carries no information: it
    // just relabels its only child behind a name the sigil can't show. Emit
    // the child directly at top level instead of the umbrella wrapper.
    if (ownBookCount === 0 && childNodes.length === 1) {
      const only = childNodes[0];
      byAlliance.get(alliance).push({ ...only, parentKey: null, children: [] });
      continue;
    }

    // An umbrella with real grouping value (2+ children, or its own books)
    // may still have no sigil votes of its own -- derive one from its
    // children's sigils (mirrors useCatalog's own omnibus-parent fallback)
    // instead of silently degrading every such node to the same generic
    // alliance glyph.
    const sigil = winnerOf(node.sigilVotes) || winnerOf(poolChildVotes(key, 'sigilVotes'));

    byAlliance.get(alliance).push({
      key,
      label: key,
      sigil,
      bookCount: ownBookCount + childBookCount,
      isRead:
        ownBookCount + childBookCount > 0 &&
        node.entryIds.every((id) => isUnitRead(id, bookProgress)) &&
        childNodes.every((c) => c.isRead),
      children: childNodes,
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
        nodeKey: unit.parentFaction || unit.factionPrimary,
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
