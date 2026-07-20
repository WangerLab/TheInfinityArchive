// POST /api/strategium-advise
// Health-check placeholder. Verifies the function's path resolves on Vercel
// and the ANTHROPIC_API_KEY env var is present in this runtime BEFORE
// wiring the real LLM contract on top -- same "isolate the one unknown
// cheaply" sequencing as the original api/ping.js health check before
// api/context-drop.js's real logic. Real recommendation logic replaces this
// in the next commit.

export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    message: 'strategium-advise placeholder',
    hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
    node: process.version,
  });
}
