export async function leyuSpokenAnswer(message: string): Promise<string | null> {
  const heard = message.replace(/\s+/g, ' ').trim();
  if (heard.split(' ').length < 5 || !/[\u1200-\u137F]/.test(heard)) return null;
  try {
    const response = await fetch('/api/v1/amharic/reply', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: heard }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { reply?: string; fromCorpus?: boolean };
    if (!body.fromCorpus || !body.reply?.trim()) return null;
    return body.reply.trim();
  } catch {
    return null;
  }
}
