/**
 * Live inbox API — Cloudflare Worker /api → Apps Script.
 */
window.Api = (() => {
  function getBaseUrl() {
    const api = String(APP_CONFIG.apiUrl || "").trim();
    if (api) return api.replace(/\/$/, "");
    return String(APP_CONFIG.googleScriptUrl || "").trim();
  }

  async function postAction(body) {
    const base = getBaseUrl();
    if (!base) throw new Error("Inbox backend is not configured.");
    const url = new URL(base, window.location.origin);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      if (!data.ok && data.error) throw new Error(data.error);
      return data;
    } catch (err) {
      if (err && err.name === "AbortError") {
        throw new Error("Taking too long — check Worker deploy / network");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async function listEmails(toAddress) {
    const base = getBaseUrl();
    if (!base) throw new Error("Inbox backend is not configured.");

    const url = new URL(base, window.location.origin);
    url.searchParams.set("action", "list");
    if (toAddress) url.searchParams.set("to", toAddress);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45000);
    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      if (!data.ok && data.error) throw new Error(data.error);
      return {
        emails: (data.emails || data.messages || []).map(normalize),
        sessionEpoch: data.sessionEpoch,
      };
    } catch (err) {
      if (err && err.name === "AbortError") {
        throw new Error("Inbox load timeout — tap Refresh again");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async function deleteEmail(id) {
    return postAction({ action: "delete", id });
  }

  async function verifyPassword(password) {
    return postAction({
      action: "auth",
      password: String(password || ""),
      bootstrap: String(APP_CONFIG.defaultPassword || ""),
    });
  }

  async function changePassword(ownerPin, newPassword) {
    return postAction({
      action: "setPassword",
      ownerPin: String(ownerPin || ""),
      ownerBootstrap: String(APP_CONFIG.ownerPin || ""),
      newPassword: String(newPassword || ""),
    });
  }

  function normalize(row) {
    const from = row.from || row.From || "";
    const parsed = parseFrom(from);
    return {
      id: String(row.id || row.Id || row.row || crypto.randomUUID()),
      from,
      fromName: row.fromName || parsed.name,
      fromEmail: row.fromEmail || parsed.email,
      to: row.to || row.To || "",
      subject: row.subject || row.Subject || "(no subject)",
      date: row.date || row.Date || row.receivedAt || new Date().toISOString(),
      bodyText: row.bodyText || row.body || row.Body || "",
      bodyHtml: row.bodyHtml || row.html || "",
    };
  }

  function parseFrom(from) {
    const m = String(from).match(/^(.*?)\s*<([^>]+)>$/);
    if (m) return { name: m[1].trim().replace(/^"|"$/g, "") || m[2], email: m[2] };
    if (from.includes("@")) return { name: from.split("@")[0], email: from };
    return { name: from || "Unknown", email: from || "" };
  }

  return {
    listEmails,
    deleteEmail,
    verifyPassword,
    changePassword,
    getBaseUrl,
    normalize,
    parseFrom,
  };
})();
