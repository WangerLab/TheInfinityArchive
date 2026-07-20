// POST /api/context-drop
// Takes a raw dictated reflection + book context, calls Claude Opus 4.8 to
// structure it into two blocks, returns them to the client. Does NOT persist —
// the client writes the result through the RLS-authenticated progress hook.
//
// Block A (chronicle)      = human-facing prose, spoilers allowed
// Block B (auspex_reading) = machine-readable, Strategium input
//
// Structure is enforced via tool_use (input_schema) rather than "return JSON",
// so the model cannot prepend prose — the API shape guarantees a schema object.

const MODEL = 'claude-opus-4-8';
const SCHEMA_VERSION = 1;

const REGISTER_ENUM = [
  'harrowed', 'exhilarated', 'moved', 'unsettled', 'awed', 'gripped',
  'provoked', 'stirred', 'amused', 'distant', 'chilled', 'immersed',
  'unnerved', 'enthralled', 'inspired', 'wearied',
];

const APPETITE_ENUM = [
  'more-of-this', 'hard-contrast', 'adjacent-shift', 'palate-cleanser',
];

const STRUCTURE_TOOL = {
  name: 'record_reflection',
  description:
    'Structure the reader\'s raw dictated reflection into two blocks. ' +
    'Block A (chronicle) is warm human-facing prose the reader will re-read ' +
    'in years — full spoilers are fine, it is their private memory. Block B ' +
    '(auspex_reading) is cold machine-readable signal for a downstream ' +
    'recommendation model; never shown to the reader by default. ' +
    'FIDELITY OVER LENGTH: infer every field ONLY from what the reader ' +
    'actually said. Never invent enthusiasm, detail, drama, or significance ' +
    'that is not in the dictation. The output length must follow the input: ' +
    'a rich dictation yields a rich chronicle, a thin one yields a short ' +
    'chronicle — never pad a thin reflection to hit a length. If the reader ' +
    'was lukewarm, say so (register "distant", low intensity). Write in English.',
  input_schema: {
    type: 'object',
    properties: {
      chronicle: {
        type: 'object',
        description: 'Block A — human-facing, spoilers allowed.',
        properties: {
          resonance: {
            type: 'string',
            description:
              'A reflection in the reader\'s voice: what the book did to them, why ' +
              'it stuck (or did not), how it sat within their wider 40K reading. ' +
              'Structure and lift what they actually said into clear, warm prose — ' +
              'give shape to thoughts they expressed messily, but add NOTHING they ' +
              'did not gesture at. Do not invent motifs, scenes, or significance to ' +
              'fill space. LENGTH FOLLOWS THE INPUT: if they said a lot, write ' +
              'several paragraphs; if they said little, a few sentences is correct ' +
              'and honest — never inflate. When there are multiple distinct thoughts, ' +
              'separate paragraphs with a blank line (\\n\\n) so it does not read as ' +
              'one wall of text. First-person-friendly, their voice. Spoilers fine.',
          },
          standout_moments: {
            type: 'array',
            description:
              'Beats, characters, images, or ideas the reader genuinely ' +
              'emphasised as staying with them. Each a single vivid sentence in ' +
              'their voice. Include ONLY what they actually singled out — if they ' +
              'emphasised one thing, return one; if they dwelt on nothing in ' +
              'particular, return an empty array. Do not manufacture standouts to ' +
              'reach a count. Spoilers ok.',
            items: { type: 'string' },
            minItems: 0,
            maxItems: 4,
          },
          verdict_line: {
            type: 'string',
            description: 'A single punchy sentence — their epitaph for the book.',
          },
        },
        required: ['resonance', 'standout_moments', 'verdict_line'],
      },
      auspex_reading: {
        type: 'object',
        description: 'Block B — machine-readable Strategium input.',
        properties: {
          emotional_register: {
            type: 'array',
            description:
              'The reader\'s emotional RESPONSE (not the book\'s objective ' +
              'mood). Pick 1-3 that genuinely fit what they said.',
            items: { type: 'string', enum: REGISTER_ENUM },
            minItems: 1,
            maxItems: 3,
          },
          intensity: {
            type: 'integer',
            description: 'How demanding/dense it was FOR THEM, 1 (light) to 5 (heavy).',
            minimum: 1,
            maximum: 5,
          },
          appetite_direction: {
            type: 'string',
            description:
              'What the reader wants next, inferred from tone: more-of-this ' +
              '(sated, want the same), hard-contrast (need something opposite), ' +
              'adjacent-shift (same lane, new angle), palate-cleanser (need a break).',
            enum: APPETITE_ENUM,
          },
          fatigue_signals: {
            type: 'string',
            description:
              'What the reader is tiring of — a faction, tone, or setting. ' +
              'Empty string if none expressed. The sharpest next-read signal.',
          },
          faction_resonance: {
            type: 'string',
            description:
              'Which factions/characters landed, which left them cold. ' +
              'Empty string if not mentioned.',
          },
          thematic_hooks: {
            type: 'string',
            description:
              'Motifs the reader wants to follow further. Empty string if none.',
          },
        },
        required: [
          'emotional_register', 'intensity', 'appetite_direction',
          'fatigue_signals', 'faction_resonance', 'thematic_hooks',
        ],
      },
      music_scenes: {
        type: 'array',
        description:
          'Scenes the reader EXPLICITLY marked for their music project — ' +
          'triggered by phrases like "scene for music", "I could make a song ' +
          'from this", "I want to set this to music", or similar explicit ' +
          'intent. Extract ONLY scenes the reader deliberately flagged this ' +
          'way. Do NOT infer or invent musical scenes from general enthusiasm — ' +
          'if the reader marked none, return an empty array. This feeds a ' +
          'separate downstream music workflow, not the chronicle.',
        items: {
          type: 'object',
          properties: {
            scene: {
              type: 'string',
              description: 'The scene itself — what happens, vividly. Spoilers ok.',
            },
            note: {
              type: 'string',
              description:
                'Why it resonates / the song idea the reader gestured at. ' +
                'Empty string if they only named the scene.',
            },
          },
          required: ['scene', 'note'],
        },
      },
      open_questions: {
        type: 'array',
        description:
          'Points where the reflection would benefit from the reader ' +
          'clarifying or expanding — surfaced as questions back to them. ' +
          'Two kinds, with DELIBERATELY DIFFERENT thresholds:\n' +
          '- type "correction": a proper noun (character, faction, place, ' +
          'ship, planet) in the dictation that does not cleanly match known ' +
          'Warhammer 40,000 nomenclature and may be a dictation/transcription ' +
          'error. Be GENEROUS here — if a name looks even slightly off or you ' +
          'cannot place it, ask. A wrongly-kept name lodges permanently in the ' +
          'reader\'s Chronicle; a needless question costs one click. When in ' +
          'doubt about a name, ASK.\n' +
          '- type "deepening": a thread the reader clearly cared about but ' +
          'barely developed — worth inviting them to expand. Be SPARING here — ' +
          'only genuinely under-served threads they emphasised, never routine ' +
          '"you could say more about X". Most reflections need zero deepening ' +
          'questions.\n' +
          'No fixed maximum, but stay disciplined: an empty array is the normal ' +
          'case for a clear, complete dictation. Never invent questions to seem ' +
          'thorough.',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['correction', 'deepening'],
              description: 'correction = possible mis-transcribed proper noun; deepening = under-developed thread.',
            },
            question: {
              type: 'string',
              description:
                'The question addressed to the reader, first-person-friendly. ' +
                'For a correction: name the term and ask if it was meant, e.g. ' +
                '"I read the name \'Cepharil\' but can\'t place it in 40K lore — ' +
                'did you mean a different name?" For a deepening: invite them ' +
                'warmly to expand on the specific thread.',
            },
            context: {
              type: 'string',
              description:
                'For correction: the exact suspect term as it appeared. For ' +
                'deepening: the thread/topic in a few words. Lets the UI and the ' +
                'follow-up call know what the question refers to.',
            },
          },
          required: ['type', 'question', 'context'],
        },
      },
    },
    required: ['chronicle', 'auspex_reading', 'music_scenes', 'open_questions'],
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server missing ANTHROPIC_API_KEY' });
  }

  const { raw, book, existing } = req.body || {};
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return res.status(400).json({ error: 'Missing raw reflection text' });
  }

  // Book context helps the model ground faction/character references. Optional.
  const ctx = book && typeof book === 'object'
    ? [
        book.title ? `Title: ${book.title}` : null,
        book.author ? `Author: ${book.author}` : null,
        book.factionPrimary ? `Primary faction: ${book.factionPrimary}` : null,
        book.subFaction ? `Sub-faction: ${book.subFaction}` : null,
      ].filter(Boolean).join('\n')
    : '';

  // When appending, give the model the existing chronicle so it can weave the
  // new dictation INTO it — enriching, not replacing. The reader liked what was
  // there and is only adding.
  const existingScenes =
    existing && Array.isArray(existing.music_scenes) && existing.music_scenes.length > 0
      ? `The reader has ALSO already marked these music scenes. Preserve them ` +
        `ALL in music_scenes, and add any new scene the reader marks in this ` +
        `addition:\n"""${JSON.stringify(existing.music_scenes, null, 2)}"""\n\n`
      : '';

  const existingBlock =
    existing && typeof existing === 'object' && existing.chronicle
      ? `The reader already has this Chronicle for the book and wants to KEEP ` +
        `its substance while weaving in a new addition. Do not discard what is ` +
        `here — enrich and extend it, integrating the new thought naturally. ` +
        `Produce a single coherent Chronicle covering both.\n\n` +
        `Existing Chronicle:\n"""${JSON.stringify(existing.chronicle, null, 2)}"""\n\n` +
        existingScenes
      : '';

  const instruction = existingBlock
    ? `The reader dictated the following ADDITION to their reflection. ` +
      `Structure the combined result with the record_reflection tool.`
    : `The reader just finished this book and dictated the following raw ` +
      `reflection. Structure it with the record_reflection tool.`;

  const userText =
    (ctx ? `Book context:\n${ctx}\n\n` : '') +
    existingBlock +
    instruction + `\n\n` +
    `Raw ${existingBlock ? 'addition' : 'reflection'}:\n"""${raw.trim()}"""`;

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        tool_choice: { type: 'tool', name: 'record_reflection' },
        tools: [STRUCTURE_TOOL],
        messages: [{ role: 'user', content: userText }],
      }),
    });

    if (!anthropicRes.ok) {
      const detail = await anthropicRes.text();
      return res.status(502).json({
        error: 'Anthropic API error',
        status: anthropicRes.status,
        detail: detail.slice(0, 500),
      });
    }

    const data = await anthropicRes.json();
    const toolUse = Array.isArray(data.content)
      ? data.content.find((b) => b.type === 'tool_use')
      : null;

    if (!toolUse || !toolUse.input) {
      return res.status(502).json({
        error: 'Model did not return structured output',
      });
    }

    const { chronicle, auspex_reading, music_scenes, open_questions } = toolUse.input;

    return res.status(200).json({
      chronicle,
      auspex_reading,
      music_scenes: Array.isArray(music_scenes) ? music_scenes : [],
      open_questions: Array.isArray(open_questions) ? open_questions : [],
      meta: {
        model: MODEL,
        schema_version: SCHEMA_VERSION,
        at: new Date().toISOString(),
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Function failure',
      detail: String(err).slice(0, 300),
    });
  }
}
