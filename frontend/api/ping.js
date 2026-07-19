export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    message: 'pong',
    hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
    node: process.version,
  });
}
