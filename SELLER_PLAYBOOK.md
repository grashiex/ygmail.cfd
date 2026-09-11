# Seller Setup Guide — Simula umpisa hanggang handoff

Sundin **nang sunod-sunod**. Pag natapos ito, **hindi mo na kailangan ng AI** para mag-setup ng bagong client.

**Live example:** `https://ygmail.cfd` · Repo: `grashiex/ygmail.cfd`

---

## Ano ang system na ito?

```
Email → Cloudflare Email Routing (catch-all)
      → Worker (email-to-sheet)
      → Google Apps Script Web App
      → Google Sheet ("Inbox")
      → Website (GitHub Pages) magbabasa ng list
```

| Bahagi | Para saan | Sino ang nagse-set |
|--------|-----------|--------------------|
| Domain + Cloudflare | DNS + email receive | **Ikaw (seller)** |
| Google Sheet + Apps Script | Database + API | **Ikaw** |
| Cloudflare Worker | Email → Sheet | **Ikaw** |
| `js/config.js` | Script URL, domain, password, footer | **Ikaw** |
| GitHub Pages | Website | **Ikaw** |
| Customize UI | Logo, theme, password, contact admin | **Client** |

**Huwag:** i-point ang domain sa Apps Script URL. Dapat **GitHub Pages** ang website. Apps Script = API lang (`/exec`).

---

## Checklist (bawat bagong client)

1. [ ] Domain → Cloudflare (Active)
2. [ ] Google Sheet + paste `backend/Code.gs` → Deploy Web App → kopyahin `/exec` URL
3. [ ] Worker + paste `backend/worker.js` → variable `GAS_WEBAPP_URL`
4. [ ] Email Routing → **Catch-all → Send to Worker**
5. [ ] Test: send email → may row sa Sheet
6. [ ] I-edit `js/config.js` (`demoMode: false` + Script URL + domain)
7. [ ] GitHub Pages + custom domain (`CNAME`)
8. [ ] Purge Cloudflare cache → open site → login → Refresh Inbox
9. [ ] Ibigay sa client: URL + password lang

---

## STEP 1 — Domain sa Cloudflare

1. May domain na ang client (o ikaw bumili), hal. `clientdomain.cfd`.
2. [dash.cloudflare.com](https://dash.cloudflare.com) → **Add a site** → Free plan.
3. Palitan ang **nameservers** sa registrar (Namecheap / GoDaddy / etc.) papunta sa Cloudflare.
4. Hintayin status = **Active**.

---

## STEP 2 — Google Sheet + Apps Script (database)

1. [sheets.google.com](https://sheets.google.com) → **Blank spreadsheet**.
2. Pangalanan: `ClientName Inbox`.
3. **Extensions → Apps Script**.
4. Burahin ang default code.
5. I-paste ang **buong** laman ng `backend/Code.gs` mula sa project.
6. **Save** (Ctrl+S / Cmd+S).
7. **Deploy → New deployment**:
   - ⚙️ → type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
8. **Deploy** → Authorize / Allow.
9. **Kopyahin ang Web app URL** (dapat nagtatapos sa `/exec`).
10. Test: buksan ang URL sa browser → dapat may JSON tulad ng:

```json
{"ok":true,"emails":[]}
```

> Kapag nag-edit ka ulit ng `Code.gs` later: **Deploy → Manage deployments → Edit (pencil) → New version → Deploy**.

---

## STEP 3 — Cloudflare Worker (email → Script)

1. Cloudflare → **Workers & Pages** → **Create** → Worker (Hello World OK).
2. Name: `email-clientname` (o shared `email-to-sheet`).
3. **Edit code** → burahin default → paste **buong** `backend/worker.js` → **Deploy**.
4. Worker → **Settings → Variables and Secrets**:
   - Name: `GAS_WEBAPP_URL`
   - Value: Web App URL mula Step 2
5. Save / Deploy ulit kung kailangan.

**Per client (recommended kung ibebenta):** hiwalay na Sheet + Script + Worker.  
**Shared (mas mabilis):** isang Sheet/Worker para sa lahat — mas magulo ang data.

---

## STEP 4 — Email Routing (catch-all) — CRITICAL

Kung walang catch-all → Worker, **hindi papasok** ang `kahitano@clientdomain.com`.

1. Cloudflare → **domain ng client** → **Email → Email Routing** → Enable.
2. **Routing rules** → i-edit / gawin ang **Catch-all**:
   - Action: **Send to a Worker**
   - Worker: yung mula Step 3
3. **Save**.
4. Tanggalin ang lumang “Forward to Gmail” rules kung sumasalungat.
5. MX records: iwanang auto ang Cloudflare Email Routing.

### Test ingest

1. Mag-send mula Gmail papunta sa `test@clientdomain.com`.
2. Hintay 10–30s.
3. Buksan ang Google Sheet → tab **Inbox** → dapat may bagong row (`to`, `from`, `subject`, `bodyHtml`…).

Kung **walang row**: Worker logs + `GAS_WEBAPP_URL` + Catch-all rule.

---

## STEP 5 — Website files + `js/config.js`

### Files na kailangan sa GitHub Pages (root)

- `index.html`
- `css/`
- `js/` (lahat: `config.js`, `app.js`, `themes.js`, …)
- `CNAME` (custom domain)

### Optional tanggalin sa client repo (seller privacy)

- `backend/`
- `SETUP_GUIDE.md`
- `SELLER_PLAYBOOK.md`
- `js/snippets.js`

### `CNAME` file (root, walang extension)

```text
clientdomain.com
```

(o `mail.clientdomain.com` kung subdomain)

### I-edit `js/config.js` (PINAKA-IMPORTANT)

```js
window.APP_CONFIG = {
  brandTitle: "clientdomain.com",
  brandLogo: "",
  domains: ["clientdomain.com"],
  defaultPrefix: "",                 // blank = user types username
  defaultPassword: "palitan-mo-ito", // ibigay sa client

  contactAdminLabel: "Contact admin",
  contactAdminLink: "https://t.me/yourhandle",

  // Footer — SELLER ONLY (hindi editable sa Customize)
  footerName: "GRASHIEX",
  footerLink: "https://t.me/grashiex",
  footerYear: 2026,

  // LIVE backend — seller only
  googleScriptUrl: "https://script.google.com/macros/s/XXXX/exec",
  demoMode: false,   // ALWAYS false kapag live / ibebenta

  sessionKey: "webmail_session_ok",
  settingsKey: "webmail_settings",
  themeKey: "webmail_theme",
  customPaletteKey: "webmail_custom_palette",
};
```

**Bago mag-push, check:**

- [ ] `demoMode: false`
- [ ] `googleScriptUrl` = exact `/exec` URL
- [ ] `domains: ["clientdomain.com"]` tumutugma sa Email Routing domain
- [ ] Bagong `defaultPassword`
- [ ] Footer link mo

---

## STEP 6 — GitHub + Pages + DNS

### A. Repo

1. [github.com/new](https://github.com/new) → Public OK (free Pages).
2. Upload / push ang files (may `index.html` sa **root**).

PowerShell example (kung may git na):

```powershell
cd "C:\path\to\client-site"
git add .
git commit -m "Deploy client inbox"
git branch -M main
git remote add origin https://github.com/YOU/CLIENT_REPO.git
git push -u origin main
```

### B. GitHub Pages

1. Repo → **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / folder: `/ (root)` → Save
4. Custom domain: `clientdomain.com` (dapat match sa `CNAME` file)

### C. Cloudflare DNS → GitHub Pages (hindi Apps Script)

**Subdomain** (`mail.clientdomain.com`):

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `mail` | `YOURUSER.github.io` | DNS only (grey cloud) recommended |

**Apex** (`clientdomain.com`) — A records:

```text
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

5. Hintayin i-verify ng GitHub ang domain.
6. Kung luma ang CSS/JS: Cloudflare → **Caching → Configuration → Purge Everything**.

---

## STEP 7 — Final test (ikaw muna)

1. Buksan `https://clientdomain.com`
2. Unlock gamit ang password sa `config.js`
3. Mag-type ng username (prefix), hal. `test`
4. Address = `test@clientdomain.com`
5. Mag-send ng email / OTP doon
6. **Refresh Inbox** → dapat may message, OTP badge, Open Access Link
7. Buksan ang email → scroll OK sa mobile → CTA link → **new tab**

### Customize (client / ikaw)

**Customize** button:

- Brand, logo, background, contact admin link, password
- Theme presets **o** **Custom Palette**:
  - Primary / Secondary / Background / Card (4 hex)
  - **Live preview** habang nagta-type
  - **Save** para i-lock; Cancel = balik sa dati
- Footer (GRASHIEX) — **hindi** nasa Customize; nasa `config.js` lang

---

## STEP 8 — Handoff sa client

Sabihin lang:

1. **URL:** `https://clientdomain.com`
2. **Password:** (mula config) — puwede nilang palitan sa Customize
3. Paano gamitin:
   - Type username → Copy Address
   - Gamitin sa Netflix / Canva / etc.
   - Refresh Inbox → copy OTP o Open Access Link
4. Customize: logo, colors, password

**Huwag turuan / huwag ibigay:**

- Apps Script URL
- Worker / Email Routing
- `config.js` / `backend/`
- Paano i-edit ang footer

---

## Kapag may problema

| Symptom | Fix |
|---------|-----|
| Plain / unstyled site | Purge Cloudflare cache + hard refresh (`Ctrl+Shift+R`). I-off Auto Minify CSS kung sira. |
| 0 messages, Sheet may row | `demoMode: false`? Tama ba ang prefix@domain? Hard refresh. |
| Walang row sa Sheet | Catch-all → Worker? `GAS_WEBAPP_URL` tama? |
| `window is not defined` sa domain | Domain naka-point sa Apps Script — ilipat sa GitHub Pages |
| White screen sa “Create Account” sa email | Latest site (`sandbox` allow-popups). Hard refresh. |
| Garbled text `Weâre` | I-update Worker code (`backend/worker.js` UTF-8 decode) → Deploy. Bagong emails lang ang fixed. |
| OTP basura (000000, Enter, …) | Latest `js/extractors.js` |
| Pages 404 | `index.html` ba nasa root? Branch `main` / `(root)` |

---

## File map (para di malito)

| File | Role |
|------|------|
| `backend/Code.gs` | Paste sa Apps Script |
| `backend/worker.js` | Paste sa Cloudflare Worker |
| `js/config.js` | Seller secrets + domain + footer |
| `index.html` + `css/` + `js/` | Frontend (Pages) |
| `CNAME` | Custom domain name |
| `SELLER_PLAYBOOK.md` | **Itong guide** |

---

## Time estimate

| Task | Oras |
|------|------|
| Cloudflare + nameservers | 15–60 min |
| Sheet + Script deploy | 10 min |
| Worker + Catch-all | 10 min |
| Repo + config + Pages + DNS | 15–30 min |
| Test + handoff | 5–10 min |

---

## Quick blank `config.js`

```js
brandTitle: "",
domains: [""],
defaultPrefix: "",
defaultPassword: "",
contactAdminLink: "",
footerName: "GRASHIEX",
footerLink: "",
footerYear: 2026,
googleScriptUrl: "",
demoMode: false,
```

**Order lagi:** Sheet row OK → config live → Pages DNS → purge → test → bigay sa client.
