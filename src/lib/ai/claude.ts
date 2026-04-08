import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock ? textBlock.text : '';
}

/**
 * Call Claude with images (Vision) — for screenshot analysis
 * imageUrls: array of image URLs to analyze
 */
export async function callClaudeVision(
  systemPrompt: string,
  userMessage: string,
  imageUrls: string[],
): Promise<string> {
  const content: Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'url'; url: string } }> = [];

  // Add images first
  for (const url of imageUrls) {
    content.push({ type: 'image', source: { type: 'url', url } });
  }

  // Add text prompt
  content.push({ type: 'text', text: userMessage });

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock ? textBlock.text : '';
}

export async function callClaudeStream(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
) {
  // Limitar historial a últimos 10 mensajes para ahorrar tokens
  const trimmedMessages = messages.slice(-10);

  return anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: trimmedMessages,
    stream: true,
  });
}
