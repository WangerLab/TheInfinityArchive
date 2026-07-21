import React, { useState } from 'react';
import { cn } from 'lib/utils';
import { FactionMark } from './FactionMark';

// Per-faction sigil: a white silhouette PNG (public/sigils/<sigil>.png) tinted
// to its grand-alliance colour via a CSS mask, so the SHAPE reads "which
// faction" (the POV-bearer, faction_sigil) while the TINT echoes FactionMark's
// alliance semantics (grandAlliance, NOT NULL). Falls back to the alliance-level
// FactionMark when no sigil is mapped (faction_sigil NULL) or the asset 404s.

// Alliance -> background-colour class the mask reveals. Mirrors FactionMark's
// four tints, expressed as bg-* against the same palette tokens as its text-*.
const TINT_BG = {
  imperium:  'bg-gold',
  chaos:     'bg-purple-400',
  xenos:     'bg-plasma',
  unaligned: 'bg-slate-400',
};

// Which alliance a sigil BELONGS to, independent of the book it appears on.
// The silhouette names the POV-bearing faction (faction_sigil); grand_alliance
// names the faction the book is ABOUT. They agree on all but two entries — a
// Tyranid novel told by an Ultramarine, a Word Bearers novel told by an Imperial
// Fist. Tinting by grand_alliance painted those two POV marks in the enemy's
// colour. The mark is tinted by its own allegiance; the alliance filter still
// keys off grand_alliance, so each field keeps answering its own question.
export const SIGIL_ALLIANCE = {
  admech: 'imperium', arbites: 'imperium', astartes_generic: 'imperium',
  astra_militarum: 'imperium', black_templars: 'imperium', blood_angels: 'imperium',
  carcharodons: 'imperium', custodes: 'imperium', dark_angels: 'imperium',
  deathwatch: 'imperium', grey_knights: 'imperium', imperial_fists: 'imperium',
  imperial_knights: 'imperium', imperium: 'imperium', inquisition: 'imperium',
  iron_hands: 'imperium', navis: 'imperium', raven_guard: 'imperium',
  salamanders: 'imperium', sororitas: 'imperium', space_wolves: 'imperium',
  ultramarines: 'imperium', white_scars: 'imperium',

  alpha_legion: 'chaos', black_legion: 'chaos', chaos_generic: 'chaos',
  death_guard: 'chaos', emperors_children: 'chaos', iron_warriors: 'chaos',
  night_lords: 'chaos', thousand_sons: 'chaos', word_bearers: 'chaos',
  world_eaters: 'chaos',

  aeldari: 'xenos', drukhari: 'xenos', genestealer: 'xenos', necrons: 'xenos',
  orks: 'xenos', tau: 'xenos', tyranids: 'xenos', votann: 'xenos', xenos: 'xenos',
};

// Display name for a sigil key. The keys are asset filenames; these are the
// names. Not derivable by prettifying the key — 'admech' is the Adeptus
// Mechanicus, 'sororitas' the Adepta Sororitas, 'tau' the T'au.
export const SIGIL_LABEL = {
  admech: 'Adeptus Mechanicus',
  arbites: 'Adeptus Arbites',
  astartes_generic: 'Adeptus Astartes',
  astra_militarum: 'Astra Militarum',
  black_templars: 'Black Templars',
  blood_angels: 'Blood Angels',
  carcharodons: 'Carcharodons',
  custodes: 'Adeptus Custodes',
  dark_angels: 'Dark Angels',
  deathwatch: 'Deathwatch',
  grey_knights: 'Grey Knights',
  imperial_fists: 'Imperial Fists',
  imperial_knights: 'Imperial Knights',
  imperium: 'Imperium',
  inquisition: 'Inquisition',
  iron_hands: 'Iron Hands',
  navis: 'Navis Nobilite',
  raven_guard: 'Raven Guard',
  salamanders: 'Salamanders',
  sororitas: 'Adepta Sororitas',
  space_wolves: 'Space Wolves',
  ultramarines: 'Ultramarines',
  white_scars: 'White Scars',

  alpha_legion: 'Alpha Legion',
  black_legion: 'Black Legion',
  chaos_generic: 'Chaos',
  death_guard: 'Death Guard',
  emperors_children: "Emperor's Children",
  iron_warriors: 'Iron Warriors',
  night_lords: 'Night Lords',
  thousand_sons: 'Thousand Sons',
  word_bearers: 'Word Bearers',
  world_eaters: 'World Eaters',

  aeldari: 'Aeldari',
  drukhari: 'Drukhari',
  genestealer: 'Genestealer Cults',
  necrons: 'Necrons',
  orks: 'Orks',
  tau: "T'au",
  tyranids: 'Tyranids',
  votann: 'Leagues of Votann',
  xenos: 'Xenos',
};

// Box sizes mirror FactionMark.SIZES so sigil and fallback share a footprint.
const SIZES = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
  xxl: 'w-10 h-10',
};

// public/ assets aren't fingerprinted, so a replaced PNG keeps its URL and can be
// served stale from browser/CDN cache. Bump this whenever a sigil file is
// replaced — the query string changes the cache key and forces a fresh fetch.
const ASSET_VERSION = 2;

export function FactionSigil({ sigil, alliance, size = 'sm', sizePx, className, title }) {
  const [failed, setFailed] = useState(false);

  // No mapped sigil, or the asset failed to load: degrade to the alliance mark.
  if (!sigil || failed) {
    return (
      <FactionMark alliance={alliance} size={size} sizePx={sizePx} className={className} title={title} />
    );
  }

  const url = `/sigils/${sigil}.png?v=${ASSET_VERSION}`;
  // sizePx is an escape hatch for callers computing a size at runtime (e.g.
  // the Strategium map scaling a sigil to a star's live radius) -- a
  // Tailwind arbitrary class can't see a value that only exists at runtime,
  // so this sets the box via inline style instead and skips the token class.
  const box = sizePx ? undefined : (SIZES[size] || SIZES.sm);
  const tint = TINT_BG[SIGIL_ALLIANCE[sigil]] || TINT_BG[alliance] || TINT_BG.unaligned;

  return (
    <>
      {/* Tinted silhouette: the bg colour shows through the PNG's alpha mask. */}
      <span
        role="img"
        aria-label={title || alliance || sigil}
        className={cn(box, tint, 'shrink-0 inline-block', className)}
        style={{
          ...(sizePx ? { width: sizePx, height: sizePx } : null),
          WebkitMaskImage: `url(${url})`,
          maskImage: `url(${url})`,
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        }}
      />
      {/* Invisible load-probe: the only reliable onError signal for a mask URL.
          Same URL as the mask, so the browser fetches it once. */}
      <img
        src={url}
        alt=""
        aria-hidden="true"
        className="hidden"
        onError={() => setFailed(true)}
      />
    </>
  );
}

export default FactionSigil;
