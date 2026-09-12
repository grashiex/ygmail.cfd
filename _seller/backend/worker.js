/**
 * Cloudflare Email Routing + API proxy Worker
 *
 * Variables:
 *   GAS_WEBAPP_URL  = https://script.google.com/macros/s/…/exec
 *   ALLOWED_ORIGIN  = https://clientdomain.com  (optional)
 *   FORWARD_TO      = glitterhost0@gmail.com   (optional Gmail copy)
 *                   → must be a verified Email Routing destination
 */

export default {
  async email(message, env) {
    const gasUrl = env.GAS_WEBAPP_URL;
    if (!gasUrl) {
      message.setReject("GAS_WEBAPP_URL not configured");
      return;
    }

    // Gmail / external copy (more reliable than Apps Script MailApp)
    const forwardTo = String(env.FORWARD_TO || "").trim();
    if (forwardTo) {
      try {
        await message.forward(forwardTo);
      } catch (err) {
        console.log("FORWARD_TO failed:", String(err));
      }
    }

    const text = await new Response(message.raw).text();

    const from = message.from || "";
    const to = message.to || "";
    const subject = message.headers.get("subject") || "(no subject)";
    const date = message.headers.get("date") || new Date().toISOString();

    const bodyText = extractText_(text);
    const bodyHtml = extractHtml_(text);

    const payload = {
      action: "ingest",
      id: crypto.randomUUID(),
      to,
      from,
      subject,
      date: new Date(date).toISOString(),
      bodyText,
      bodyHtml,
    };

    const res = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      message.setReject("Upstream ingest failed: " + res.status);
    }
  },

  async fetch(request, env) {
    const cors = corsHeaders_(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const gasUrl = env.GAS_WEBAPP_URL;
    if (!gasUrl) {
      return json_({ ok: false, error: "Not configured" }, 500, cors);
    }

    try {
      if (request.method === "GET") {
        const incoming = new URL(request.url);
        const target = new URL(gasUrl);
        incoming.searchParams.forEach((v, k) => target.searchParams.set(k, v));
        if (!target.searchParams.has("action")) {
          target.searchParams.set("action", "list");
        }

        const res = await fetch(target.toString(), { method: "GET" });
        const text = await res.text();
        return new Response(text, {
          status: res.status,
          headers: {
            ...cors,
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }

      if (request.method === "POST") {
        const body = await request.text();
        const res = await fetch(gasUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body,
        });
        const text = await res.text();
        return new Response(text, {
          status: res.status,
          headers: {
            ...cors,
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }

      return json_({ ok: false, error: "Method not allowed" }, 405, cors);
    } catch (err) {
      return json_({ ok: false, error: String(err) }, 502, cors);
    }
  },
};

function corsHeaders_(request, env) {
  const reqOrigin = request.headers.get("Origin") || "";
  const allowed = String(env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let origin = "*";
  if (allowed.length) {
    origin = allowed.includes(reqOrigin) ? reqOrigin : allowed[0];
  } else if (reqOrigin) {
    origin = reqOrigin;
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json_(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function extractText_(raw) {
  const textPart = raw.match(
    /Content-Type:\s*text\/plain[\s\S]*?\r?\n\r?\n([\s\S]*?)(?=\r?\n--)/i
  );
  if (textPart) return decodeQuoted_(textPart[1]).trim();
  const split = raw.split(/\r?\n\r?\n/);
  return (split.slice(1).join("\n") || "").slice(0, 50000);
}

function extractHtml_(raw) {
  const htmlPart = raw.match(
    /Content-Type:\s*text\/html[\s\S]*?\r?\n\r?\n([\s\S]*?)(?=\r?\n--)/i
  );
  if (htmlPart) return decodeQuoted_(htmlPart[1]).trim();
  return "";
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
