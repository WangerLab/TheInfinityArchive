// POST /api/context-drop
// Takes a raw dictated reflection + book context, calls Claude Sonnet 4.6 to
// structure it into two blocks, returns them to the client. Does NOT persist —
// the client writes the result through the RLS-authenticated progress hook.
//
// Block A (chronicle)      = human-facing prose, spoilers allowed
// Block B (auspex_reading) = machine-readable, Strategium input
//
// Structure is enforced via tool_use (input_schema) rather than "return JSON",
// so the model cannot prepend prose — the API shape guarantees a schema object.

const MODEL = 'claude-sonnet-4-6';
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
    'recommendation model; never shown to the reader by default. Infer every ' +
    'field ONLY from what the reader actually said — do not invent enthusiasm ' +
    'or fatigue that is not in the dictation. If the reader was lukewarm, say ' +
    'so (register "distant", low intensity). Write in English.',
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
              'A full, rich reflection (two to three short paragraphs): what ' +
              'the book did to the reader, why it stuck (or did not), how it ' +
              'sat within the wider 40K reading. Draw out everything the reader ' +
              'gestured at in their dictation — do not compress it. SEPARATE ' +
              'the paragraphs with a blank line (\\n\\n) so it reads as ' +
              'distinct thoughts, not one wall of text. Aim for 2-3 paragraphs ' +
              'of 2-4 sentences each. Their voice, warm, first-person-friendly. ' +
              'Spoilers fine.',
          },
          standout_moments: {
            type: 'array',
            description:
              'The 2-4 beats, characters, images, or ideas that will remain ' +
              'with the reader. Each a single vivid sentence. Pull out ' +
              'everything distinct they emphasised — do not collapse several ' +
              'into one. Spoilers ok.',
            items: { type: 'string' },
            minItems: 1,
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
    },
    required: ['chronicle', 'auspex_reading'],
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
  const existingBlock =
    existing && typeof existing === 'object' && existing.chronicle
      ? `The reader already has this Chronicle for the book and wants to KEEP ` +
        `its substance while weaving in a new addition. Do not discard what is ` +
        `here — enrich and extend it, integrating the new thought naturally. ` +
        `Produce a single coherent Chronicle covering both.\n\n` +
        `Existing Chronicle:\n"""${JSON.stringify(existing.chronicle, null, 2)}"""\n\n`
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
        max_tokens: 1500,
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

    const { chronicle, auspex_reading } = toolUse.input;

    return res.status(200).json({
      chronicle,
      auspex_reading,
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
