# Seller Setup Guide — Simula umpisa hanggang handoff (+ protect)

Sundin **nang sunod-sunod**. Pag natapos ito, hindi mo na kailangan ng AI para sa setup.

**Live example:** `https://ygmail.cfd`

**Seller files (ikaw lang):** folder `_seller/` — **hindi** sine-serve ng GitHub Pages.  
**Editable code:** `_src/js/` → pagkatapos `npm run protect` → obfuscated `js/` ang nasa site.

---

## Proteksyon laban sa copy (basahin muna)

Walang 100% lock sa web — pero gawin lahat ng ito:

| Layer | Ano |
|-------|-----|
| 1 | **Private** GitHub repo (Settings → Danger zone / Change visibility) |
| 2 | Apps Script URL **huwag** ilagay sa website — nasa Worker `GAS_WEBAPP_URL` lang |
| 3 | Site gumagamit ng `apiUrl: "/api"` → Cloudflare route papunta sa Worker |
| 4 | `npm run protect` bago mag-push (obfuscate ang JS) |
| 5 | Guides + `Code.gs` + Worker source nasa `_seller/` lang |

Kapag may nag-View Source sa site: makikita nila ang obfuscated JS + `/api`, **hindi** ang Google Script URL o playbook.

---

## Ano ang system?

```
Email → Cloudflare Catch-all → Worker (email)
                              ↘ GAS_WEBAPP_URL (secret)
Website → /api → same Worker (fetch proxy) → Apps Script → Sheet
```

| Bahagi | Sino |
|--------|------|
| Domain, Worker, Sheet, `config`, Pages | **Seller** |
| Customize (logo, theme, password) | **Client** |

**Huwag** i-point ang domain sa Apps Script. Website = **GitHub Pages**. API = **Worker `/api`**.

---

## Checklist (bawat client)

1. [ ] Domain → Cloudflare (Active) — DNS **Proxied** (orange cloud) kung gagamit ng `/api` route
2. [ ] Sheet + paste `_seller/backend/Code.gs` → Deploy Web App → kopyahin `/exec`
3. [ ] Worker + paste `_seller/backend/worker.js` → `GAS_WEBAPP_URL` + optional `ALLOWED_ORIGIN`
4. [ ] Worker **Route:** `yourdomain.com/api*` → Worker
5. [ ] Email Routing → **Catch-all → Worker**
6. [ ] Test email → may row sa Sheet
7. [ ] I-edit `_src/js/config.js` (`apiUrl: "/api"`, `googleScriptUrl: ""`, `demoMode: false`)
8. [ ] `npm run protect` → push → Pages + `CNAME`
9. [ ] Purge cache → test login + Refresh Inbox
10. [ ] Repo = **Private** kung pwede
11. [ ] Ibigay sa client: URL + password lang

---

## STEP 1 — Domain sa Cloudflare

1. Domain → [dash.cloudflare.com](https://dash.cloudflare.com) → Add site → Free.
2. Palitan nameservers → hintayin **Active**.
3. Para sa `/api` Worker route: DNS record papunta sa GitHub Pages ay **Proxied** (orange cloud).

---

## STEP 2 — Google Sheet + Apps Script

1. Blank spreadsheet → `ClientName Inbox`.
2. **Extensions → Apps Script**.
3. Paste buong `_seller/backend/Code.gs`.
4. Save → **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Kopyahin ang `/exec` URL — **ilagay sa Worker lang**, hindi sa website.
6. Test: buksan ang `/exec` → `{"ok":true,"emails":[]}`.

---

## STEP 3 — Cloudflare Worker (email + API proxy)

1. Workers & Pages → Create Worker.
2. Paste `_seller/backend/worker.js` → Deploy.
3. **Settings → Variables**:
   - `GAS_WEBAPP_URL` = Apps Script `/exec` URL
   - `ALLOWED_ORIGIN` = `https://yourdomain.com` (recommended)
4. **Triggers / Settings → Domains & Routes** → Add route:

```text
yourdomain.com/api*
```

Worker: yung Worker na ito.

5. (Optional) Test: buksan `https://yourdomain.com/api?action=list` → JSON (hindi HTML ng Pages).

**Kung ayaw ng route:** gamitin ang `*.workers.dev` URL ng Worker bilang `apiUrl` sa config.

---

## STEP 4 — Email Routing (catch-all)

1. Domain → Email → Email Routing → Enable.
2. Catch-all → **Send to a Worker** → same Worker.
3. Save.
4. Send test to `test@yourdomain.com` → Sheet **Inbox** may row.

---

## STEP 5 — Website config + protect

### I-edit `_src/js/config.js`

```js
window.APP_CONFIG = {
  brandTitle: "yourdomain.com",
  brandLogo: "",
  domains: ["yourdomain.com"],
  defaultPrefix: "",
  defaultPassword: "palitan-mo-ito",

  contactAdminLabel: "Contact admin",
  contactAdminLink: "https://t.me/yourhandle",

  footerName: "GRASHIEX",
  footerLink: "https://t.me/grashiex",
  footerYear: 2026,

  apiUrl: "/api",          // Worker route
  googleScriptUrl: "",     // ALWAYS empty on public site
  demoMode: false,

  sessionKey: "webmail_session_ok",
  settingsKey: "webmail_settings",
  themeKey: "webmail_theme",
  customPaletteKey: "webmail_custom_palette",
};
```

### Obfuscate bago mag-push

```powershell
cd "C:\path\to\email website"
npm install
npm run protect
```

Ito ang magsusulat ng scrambled code sa `js/` (maliban sa `config.js`).

### `CNAME` (root)

```text
yourdomain.com
```

### Huwag i-upload / huwag ibigay sa client

- `_seller/` (backend + playbooks)
- `_src/` (readable source) — OK sa **private** repo; huwag sa public zip para sa client

---

## STEP 6 — GitHub Pages + DNS

1. Push sa repo (Private recommended).
2. Settings → Pages → `main` / `(root)`.
3. Custom domain = `yourdomain.com`.
4. Cloudflare DNS → GitHub Pages IPs (apex) o CNAME (subdomain), **Proxied** kung may `/api` route.
5. Purge Everything kung luma ang cache.

Apex A records:

```text
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

---

## STEP 7 — Test

1. Open site → password → username → Refresh Inbox.
2. OTP / Access Link OK.
3. View Source: dapat **walang** `script.google.com/macros` URL.
4. Customize → Custom 4-Color Palette → live preview → Save.

---

## STEP 8 — Handoff

Ibigay: **URL + password** + paano mag-Customize.  
Huwag: Worker, Script URL, `_seller`, `_src`, git repo (kung private).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| API error / inbox fail | Route `domain/api*` → Worker? Proxied DNS? `GAS_WEBAPP_URL`? |
| View Source may Script URL | Alisin sa config; `npm run protect`; purge cache |
| 0 messages, Sheet may row | `demoMode: false`, tama ang prefix@domain |
| Walang row sa Sheet | Catch-all → Worker |
| `window is not defined` | Domain naka-point sa Apps Script — ilipat sa Pages |
| Plain CSS | Purge CF cache; hard refresh |
| Garbled `Weâre` | Latest `_seller/backend/worker.js` → Redeploy Worker |

---

## File map

| Path | Published on Pages? | Role |
|------|---------------------|------|
| `index.html`, `css/`, `js/` | Yes | Live site (JS obfuscated) |
| `_src/js/` | No (underscore) | Readable source — edit here |
| `_seller/` | No (underscore) | Backend + this playbook |
| `scripts/protect.mjs` | No need | Obfuscator |

---

## Quick blank config

```js
brandTitle: "",
domains: [""],
defaultPassword: "",
apiUrl: "/api",
googleScriptUrl: "",
demoMode: false,
footerName: "GRASHIEX",
footerLink: "",
```

**Order:** Sheet OK → Worker + `/api` route + catch-all → config + `npm run protect` → push → purge → test → handoff.
