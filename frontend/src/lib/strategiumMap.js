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

  // An umbrella's own votes may be empty (no direct books) -- fall back to
  // pooling its children's votes so it still lands in the right alliance box.
  const allianceOf = (key, node) => {
    const own = winnerOf(node.allianceVotes);
    if (own) return own;
    const kids = children.get(key);
    if (!kids) return 'unaligned';
    const pooled = new Map();
    for (const child of kids.values()) {
      for (const [alliance, n] of child.allianceVotes) {
        pooled.set(alliance, (pooled.get(alliance) || 0) + n);
      }
    }
    return winnerOf(pooled) || 'unaligned';
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

    byAlliance.get(alliance).push({
      key,
      label: key,
      sigil: winnerOf(node.sigilVotes),
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
