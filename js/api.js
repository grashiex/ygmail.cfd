/**
 * Live Google Apps Script API client.
 * Expects the Web App to accept:
 *   GET  ?action=list&to=user@domain  → { ok, emails: [...] }
 *   POST { action: "delete", id }     → { ok }
 *   POST from Cloudflare worker       → { ok } (ingest)
 */
window.Api = (() => {
  function getBaseUrl() {
    return String(APP_CONFIG.googleScriptUrl || "").trim();
  }

  async function listEmails(toAddress) {
    const base = getBaseUrl();
    if (!base) throw new Error("Inbox backend is not configured.");

    const url = new URL(base);
    url.searchParams.set("action", "list");
    if (toAddress) url.searchParams.set("to", toAddress);

    const res = await fetch(url.toString(), {
      method: "GET",
      mode: "cors",
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    if (!data.ok && data.error) throw new Error(data.error);
    return (data.emails || data.messages || []).map(normalize);
  }

  async function deleteEmail(id) {
    const base = getBaseUrl();
    if (!base) throw new Error("Inbox backend is not configured.");

    const res = await fetch(base, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    if (!data.ok && data.error) throw new Error(data.error);
    return data;
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

  return { listEmails, deleteEmail, getBaseUrl, normalize, parseFrom };
})();
