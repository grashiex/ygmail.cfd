/**
 * Cloudflare Email Routing Worker
 * Dashboard → Workers & Pages → Create → paste this module.
 * Bind Email Routing → route catch-all (or specific) to this Worker.
 * Set GAS_WEBAPP_URL in Worker → Settings → Variables.
 */

export default {
  async email(message, env) {
    const gasUrl = env.GAS_WEBAPP_URL;
    if (!gasUrl) {
      message.setReject('GAS_WEBAPP_URL not configured');
      return;
    }

    const text = await new Response(message.raw).text();

    const from = message.from || '';
    const to = message.to || '';
    const subject = message.headers.get('subject') || '(no subject)';
    const date = message.headers.get('date') || new Date().toISOString();

    const bodyText = extractText_(text);
    const bodyHtml = extractHtml_(text);

    const payload = {
      action: 'ingest',
      id: crypto.randomUUID(),
      to,
      from,
      subject,
      date: new Date(date).toISOString(),
      bodyText,
      bodyHtml,
    };

    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      message.setReject('Upstream ingest failed: ' + res.status);
    }
  },
};

function extractText_(raw) {
  const textPart = raw.match(/Content-Type:\s*text\/plain[\s\S]*?\r?\n\r?\n([\s\S]*?)(?=\r?\n--)/i);
  if (textPart) return decodeQuoted_(textPart[1]).trim();
  const split = raw.split(/\r?\n\r?\n/);
  return (split.slice(1).join('\n') || '').slice(0, 50000);
}

function extractHtml_(raw) {
  const htmlPart = raw.match(/Content-Type:\s*text\/html[\s\S]*?\r?\n\r?\n([\s\S]*?)(?=\r?\n--)/i);
  if (htmlPart) return decodeQuoted_(htmlPart[1]).trim();
  return '';
}

function decodeQuoted_(s) {
  const unfolded = String(s || "").replace(/=\r?\n/g, "");
  const bytes = [];
  for (let i = 0; i < unfolded.length; ) {
    if (
      unfolded[i] === "=" &&
      i + 2 < unfolded.length &&
      /^[0-9A-Fa-f]{2}$/.test(unfolded.slice(i + 1, i + 3))
    ) {
      bytes.push(parseInt(unfolded.slice(i + 1, i + 3), 16));
      i += 3;
    } else {
      bytes.push(unfolded.charCodeAt(i) & 0xff);
      i += 1;
    }
  }
  try {
    return new TextDecoder("utf-8").decode(Uint8Array.from(bytes));
  } catch {
    return unfolded;
  }
}
