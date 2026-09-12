/**
 * Cloudflare Email Routing + API proxy + FAST auth
 *
 * Variables:
 *   GAS_WEBAPP_URL   = Apps Script /exec
 *   ALLOWED_ORIGIN   = https://clientdomain.com
 *   FORWARD_TO       = optional Gmail (verified destination)
 *   UNLOCK_PASSWORD  = bootstrap unlock (e.g. grashiex123)
 *   OWNER_PIN        = bootstrap owner PIN (e.g. grashiex-owner)
 *
 * Optional KV binding name: AUTH_KV (best persistence)
 * Without KV, auth hashes use Cache API (still fast).
 */

const AUTH_CACHE = "https://webmail-auth.internal";

export default {
  async email(message, env) {
    const gasUrl = env.GAS_WEBAPP_URL;
    if (!gasUrl) {
      message.setReject("GAS_WEBAPP_URL not configured");
      return;
    }

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

    const payload = {
      action: "ingest",
      id: crypto.randomUUID(),
      to,
      from,
      subject,
      date: new Date(date).toISOString(),
      bodyText: extractText_(text),
      bodyHtml: extractHtml_(text),
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
        const action = (incoming.searchParams.get("action") || "list").toLowerCase();

        if (action === "ping" || action === "version") {
          return json_(
            {
              ok: true,
              worker: true,
              auth: "worker-fast",
              codeVersion: "worker-auth-v1",
            },
            200,
            cors
          );
        }

        // Fast auth via GET too (optional)
        if (action === "auth") {
          const result = await authUnlock_(env, {
            password: incoming.searchParams.get("password") || "",
            bootstrap:
              incoming.searchParams.get("bootstrap") ||
              env.UNLOCK_PASSWORD ||
              "",
          });
          return json_(result, result.ok ? 200 : 401, cors);
        }

        const target = new URL(gasUrl);
        incoming.searchParams.forEach((v, k) => target.searchParams.set(k, v));
        if (!target.searchParams.has("action")) {
          target.searchParams.set("action", "list");
        }

        const res = await fetch(target.toString(), {
          method: "GET",
          signal: AbortSignal.timeout(55000),
        });
        const text = await res.text();
        let payload = text;
        try {
          const parsed = JSON.parse(text);
          parsed.sessionEpoch = await getEpoch_(env);
          payload = JSON.stringify(parsed);
        } catch (_) {
          /* keep raw */
        }
        return new Response(payload, {
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
        let parsed = {};
        try {
          parsed = JSON.parse(body);
        } catch (_) {
          parsed = {};
        }
        const action = String(parsed.action || "").toLowerCase();

        // Fast path — never wait for Apps Script
        if (action === "auth" || action === "login" || action === "verify") {
          const result = await authUnlock_(env, parsed);
          return json_(result, result.ok ? 200 : 401, cors);
        }
        if (action === "setpassword" || action === "changepassword") {
          const result = await setUnlockPassword_(env, parsed);
          return json_(result, result.ok ? 200 : 400, cors);
        }

        const target = new URL(gasUrl);
        if (parsed.action) target.searchParams.set("action", String(parsed.action));
        const res = await fetch(target.toString(), {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body,
          signal: AbortSignal.timeout(55000),
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
      const msg = String(err);
      const timedOut = /abort|timeout/i.test(msg);
      return json_(
        {
          ok: false,
          error: timedOut
            ? "Server timeout — try again"
            : msg,
        },
        502,
        cors
      );
    }
  },
};

// ─── Fast auth (Worker) ───────────────────────────────────

async function sha256Hex_(text) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(String(text || ""))
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function storageGet_(env, key) {
  if (env.AUTH_KV) {
    return env.AUTH_KV.get(key);
  }
  const hit = await caches.default.match(new Request(`${AUTH_CACHE}/${key}`));
  return hit ? hit.text() : null;
}

async function storagePut_(env, key, value) {
  if (env.AUTH_KV) {
    await env.AUTH_KV.put(key, value);
    return;
  }
  await caches.default.put(
    new Request(`${AUTH_CACHE}/${key}`),
    new Response(value, {
      headers: { "Cache-Control": "public, max-age=31536000" },
    })
  );
}

async function getEpoch_(env) {
  return (await storageGet_(env, "session_epoch")) || "0";
}

async function bumpEpoch_(env) {
  const v = String(Date.now());
  await storagePut_(env, "session_epoch", v);
  return v;
}

async function authUnlock_(env, p) {
  const password = String(p.password || "");
  if (!password) return { ok: false, error: "Missing password" };

  const bootstrap = String(
    p.bootstrap || env.UNLOCK_PASSWORD || ""
  ).trim();

  let hash = await storageGet_(env, "unlock_hash");
  if (!hash) {
    if (!bootstrap || password !== bootstrap) {
      return { ok: false, error: "Invalid password" };
    }
    hash = await sha256Hex_(password);
    await storagePut_(env, "unlock_hash", hash);
    const epoch = await bumpEpoch_(env);
    return { ok: true, auth: "worker", initialized: true, sessionEpoch: epoch };
  }

  const tryHash = await sha256Hex_(password);
  if (tryHash !== hash) {
    // Allow env password if storage drifted / cold cache
    if (env.UNLOCK_PASSWORD && password === String(env.UNLOCK_PASSWORD)) {
      await storagePut_(env, "unlock_hash", await sha256Hex_(password));
      const epoch = await getEpoch_(env);
      return { ok: true, auth: "worker", sessionEpoch: epoch };
    }
    return { ok: false, error: "Invalid password" };
  }

  return {
    ok: true,
    auth: "worker",
    sessionEpoch: await getEpoch_(env),
  };
}

async function setUnlockPassword_(env, p) {
  const next = String(p.newPassword || "");
  if (next.length < 4) {
    return { ok: false, error: "Password must be at least 4 characters" };
  }

  const pin = String(p.ownerPin || "");
  const pinBootstrap = String(p.ownerBootstrap || env.OWNER_PIN || "").trim();
  if (!pin) return { ok: false, error: "Owner PIN required" };

  let ownerHash = await storageGet_(env, "owner_hash");
  if (!ownerHash) {
    if (!pinBootstrap || pin !== pinBootstrap) {
      return { ok: false, error: "Owner PIN incorrect" };
    }
    ownerHash = await sha256Hex_(pin);
    await storagePut_(env, "owner_hash", ownerHash);
  } else if ((await sha256Hex_(pin)) !== ownerHash) {
    if (!(env.OWNER_PIN && pin === String(env.OWNER_PIN))) {
      return { ok: false, error: "Owner PIN incorrect" };
    }
    await storagePut_(env, "owner_hash", await sha256Hex_(pin));
  }

  await storagePut_(env, "unlock_hash", await sha256Hex_(next));
  // Keep env fallback in sync mentally — also store plain for recovery note
  await storagePut_(env, "unlock_hint_updated", new Date().toISOString());
  const epoch = await bumpEpoch_(env);

  return { ok: true, auth: "worker", sessionEpoch: epoch };
}

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
    status: status || 200,
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
