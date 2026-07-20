// POST /api/strategium-advise
// Takes the reader's current position, the unread candidate pool, their
// taste profile (derived from existing reflections, not a new input), and an
// optional free-text intent, and returns exactly 3 recommendations as
// classified vectors (spec §5/§6). Structure is enforced via tool_use
// (input_schema), same pattern as api/context-drop.js, so the model cannot
// prepend prose and cannot return a fourth or second recommendation.
//
// Recommendations reference an existing candidate by entry_id only -- the
// client already holds the full book object (summary, sigil, etc.) and
// looks it up locally, so the model is never asked to retype a summary it
// could invent details into. Low-volume, quality-critical call (a handful
// of queries per reading session), same reasoning as context-drop's choice
// of Opus over Sonnet: cost is irrelevant at single-user volume, fidelity
// is the only thing that matters.

const MODEL = 'claude-opus-4-8';

// No settings module exists (or should exist) for a single-user/curator
// app -- these mirror the physics anchor strength as fixed code values
// rather than a new preferences UI. Adjust here if they ever change.
const HARD_CONSTRAINTS = [
  'Kindle-only formats (no audio-exclusive releases)',
  'Spoiler-free reasoning only -- never reveal plot points from books not yet read',
  'Treat any Adeptus Astra Telepathica / Black Library "banned" content notes with caution',
];

const ADVISE_TOOL = {
  name: 'give_recommendations',
  description:
    'Return the Strategium\'s advisory read for this query: a short overall ' +
    'assessment, then exactly 3 recommendations drawn ONLY from the supplied ' +
    'unread candidates. Each recommendation is a classified vector from the ' +
    'reader\'s current position: continuation (short, same alliance), ' +
    'deepening (into the cluster core), or pivot (long, cross-alliance). ' +
    'Never invent a candidate -- entry_id must exactly match one from the ' +
    'supplied list.',
  input_schema: {
    type: 'object',
    properties: {
      assessment: {
        type: 'string',
        description:
          'One short paragraph framing the overall read of where the reader ' +
          'stands and what these three recommendations are responding to. ' +
          'Reference their taste profile and current position where it ' +
          'genuinely informs the framing -- do not pad with generic praise.',
      },
      recommendations: {
        type: 'array',
        minItems: 3,
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            entry_id: {
              type: 'string',
              description: 'MUST exactly match one entry_id from the supplied candidate list.',
            },
            vector_class: {
              type: 'string',
              enum: ['continuation', 'deepening', 'pivot'],
              description:
                'continuation = short vector, same alliance as the current position. ' +
                'deepening = moves further into the current faction cluster\'s core. ' +
                'pivot = long vector, crosses into a different alliance entirely.',
            },
            rationale: {
              type: 'string',
              description:
                'Personalised rationale for THIS reader -- reference their prior ' +
                'reflections (taste profile) where it genuinely applies. Never ' +
                'invent a reflection that was not supplied.',
            },
            deviation_consequence: {
              type: 'string',
              description:
                'What breaking the curated phase sequence to read this now costs ' +
                'or gains, grounded in the supplied phase context. Empty string if ' +
                'this candidate is not a deviation from the current phase.',
            },
            interlude_awareness: {
              type: 'string',
              description:
                'One brief note on how this sits relative to the reader\'s current ' +
                'phase/series position -- a short aside, a longer jump, or a return ' +
                'to something left open.',
            },
          },
          required: ['entry_id', 'vector_class', 'rationale', 'deviation_consequence', 'interlude_awareness'],
        },
      },
    },
    required: ['assessment', 'recommendations'],
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

  const { position, candidates, reflections, freeText, phases } = req.body || {};

  if (!Array.isArray(candidates) || candidates.length < 3) {
    return res.status(400).json({ error: 'Need at least 3 unread candidates' });
  }

  const candidateIds = new Set(candidates.map((c) => c.entryId));

  const phaseContext = Array.isArray(phases) && phases.length > 0
    ? `Reading plan phases (for deviation-consequence context):\n"""${JSON.stringify(
        phases.map((p) => ({ title: p.title, subtitle: p.subtitle, theme: p.theme })),
        null, 2
      )}"""\n\n`
    : '';

  const positionBlock = position
    ? `Current position -- the faction of the reader's most recently completed book:\n"""${JSON.stringify(position, null, 2)}"""\n\n`
    : 'The reader has not completed anything yet -- there is no position to anchor from. Recommend broadly appealing entry points instead of vectors from a faction.\n\n';

  const reflectionsBlock = Array.isArray(reflections) && reflections.length > 0
    ? `The reader's taste profile, derived from their own past reflections ` +
      `(never invent beyond this):\n"""${JSON.stringify(reflections, null, 2)}"""\n\n`
    : 'No prior reflections exist yet -- recommend on catalog signal alone, without inventing a taste profile.\n\n';

  const freeTextBlock = freeText && String(freeText).trim()
    ? `The reader's stated intent for this query:\n"""${String(freeText).trim()}"""\n\n`
    : '';

  const candidatesBlock =
    `Unread candidates to choose from (return entry_id EXACTLY as given, never ` +
    `a different candidate):\n"""${JSON.stringify(candidates, null, 2)}"""\n\n`;

  const constraintsBlock =
    `Hard constraints:\n` + HARD_CONSTRAINTS.map((c) => `- ${c}`).join('\n') + '\n\n';

  const userText =
    `You are the Strategium, an in-universe reading advisor for a curated ` +
    `Warhammer 40,000 reading journey. Recommend exactly 3 books to read next.\n\n` +
    phaseContext + positionBlock + reflectionsBlock + freeTextBlock + candidatesBlock + constraintsBlock +
    `Call give_recommendations now.`;

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
        tool_choice: { type: 'tool', name: 'give_recommendations' },
        tools: [ADVISE_TOOL],
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
      return res.status(502).json({ error: 'Model did not return structured output' });
    }

    const { assessment, recommendations } = toolUse.input;

    // Defensive check even under a forced schema: reject any hallucinated
    // entry_id rather than trust the model didn't invent a fourth candidate
    // that happens to look like one of the real ones.
    const invalid = (recommendations || []).find((r) => !candidateIds.has(r.entry_id));
    if (invalid) {
      return res.status(502).json({
        error: 'Model returned an unknown entry_id',
        detail: invalid.entry_id,
      });
    }

    return res.status(200).json({
      assessment,
      recommendations,
      meta: { model: MODEL, at: new Date().toISOString() },
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Function failure',
      detail: String(err).slice(0, 300),
    });
  }
}
