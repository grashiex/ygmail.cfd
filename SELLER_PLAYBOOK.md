# Seller Playbook — Setup per Client (walang Cursor/AI)

Sundin ito **bawat bagong client**. Ikaw lang ang magse-set. Client = password + Customize (logo/theme) lang.

---

## Ano ang ibibigay mo sa client

| Ibigay | Huwag ibigay / huwag ituro |
|--------|----------------------------|
| Site URL (hal. `https://clientdomain.cfd`) | Google Apps Script URL |
| Inbox password | Cloudflare Worker / Email Routing |
| Paano mag-Customize (logo, theme, password) | Footer (GRASHIEX) — **ikaw lang** sa `config.js` |
| | `backend/`, playbooks (optional tanggalin sa zip) |

---

## Checklist (overview)

1. Domain ng client → Cloudflare  
2. Google Sheet + Apps Script (bagong sheet per client OK)  
3. Cloudflare Worker + Catch-all → Worker  
4. Kopyahin ang website files / bagong GitHub repo  
5. I-edit `js/config.js`  
6. GitHub Pages + custom domain  
7. Test email → Refresh Inbox  
8. Ibigay login sa client  

---

## STEP 1 — Domain sa Cloudflare

1. Client may domain na (o ikaw bumili).  
2. [dash.cloudflare.com](https://dash.cloudflare.com) → **Add a site** → Free.  
3. Palitan ang **nameservers** sa registrar.  
4. Hintayin **Active**.

---

## STEP 2 — Google Sheet + Apps Script (database + API)

1. [sheets.google.com](https://sheets.google.com) → **Blank spreadsheet**  
   - Pangalan: `ClientName Inbox`  
2. **Extensions → Apps Script**  
3. Burahin ang default code.  
4. I-paste ang buong laman ng file: `backend/Code.gs`  
5. **Save** (Ctrl+S).  
6. **Deploy → New deployment**:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
7. **Deploy** → Authorize (Allow).  
8. **Kopyahin ang Web App URL** (`…/exec`) — ilalagay sa `config.js` later.  
9. Test: buksan ang URL sa browser → dapat `{"ok":true,"emails":[]}`.

> **Important:** Huwag mag-paste ng `config.js` / HTML dito. `Code.gs` lang.

---

## STEP 3 — Cloudflare Worker (email → Sheet)

### 3A. Worker (minsan isang Worker lang para sa lahat ng client — o isa per client)

**Option A — Isang Worker, maraming client (mas madali):**  
Same Worker `email-to-sheet`, same `GAS_WEBAPP_URL` **kung shared sheet**.  
Para **hiwalay per client**, gumawa ng bagong Worker + bagong Script URL.

**Option B — Per client (recommended kung ibebenta):**

1. Cloudflare → **Workers & Pages** → **Create** → **Hello World** Worker.  
2. Name: `email-clientname`  
3. **Edit code** → paste `backend/worker.js` → **Deploy**.  
4. **Settings → Variables**:
   - Name: `GAS_WEBAPP_URL`
   - Value: Web App URL mula Step 2  
5. Save.

### 3B. Email Routing (domain ng client)

1. Cloudflare → **client domain** → **Email → Email Routing** → Enable.  
2. **Routing rules** → i-edit ang **Catch-all**:
   - Action: **Send to a Worker**
   - Worker: `email-clientname` (o shared worker)  
3. **Save**.  
4. (Optional) delete old Gmail forward / specific rules kung hindi kailangan.

### 3C. Test ingest

Mag-send sa `test@clientdomain.com` mula Gmail.  
Hintay 10–30s → **Google Sheet → Inbox tab** → dapat may row.

---

## STEP 4 — Website files (GitHub)

### Paraan A — Bagong repo per client (linis)

1. Gumawa ng bagong GitHub repo (Public OK para sa free Pages).  
2. I-upload ang files ng project:
   - `index.html`, `css/`, `js/`, `CNAME`  
3. **Huwag isama** kung ayaw mong makita ng client sa repo:
   - `backend/`
   - `SETUP_GUIDE.md`
   - `SELLER_PLAYBOOK.md`
   - `js/snippets.js`

### Paraan B — Clone / copy folder

1. Kopyahin ang buong project folder.  
2. Palitan ang `js/config.js` (Step 5).  
3. Push sa repo ng client.

### CNAME file

Sa root, file name: `CNAME` (walang extension), laman:

```text
clientdomain.com
```

(o `mail.clientdomain.com` kung subdomain)

---

## STEP 5 — I-edit `js/config.js` (PINAKA-IMPORTANT)

Buksan `js/config.js` at palitan:

```js
window.APP_CONFIG = {
  brandTitle: "clientdomain.com",
  brandLogo: "",
  domains: ["clientdomain.com"],
  defaultPrefix: "info",              // starting prefix
  defaultPassword: "palitan-mo-ito",  // ibigay sa client

footerName: "GRASHIEX",
footerLink: "https://t.me/grashiex", // SELLER ONLY — hindi nae-edit ng client
footerYear: 2026,

  // LIVE — seller only (huwag ipakita sa client UI)
  googleScriptUrl: "https://script.google.com/macros/s/XXXX/exec",
  demoMode: false,   // ALWAYS false kapag ibebenta

  sessionKey: "webmail_session_ok",
  settingsKey: "webmail_settings",
  themeKey: "webmail_theme",
  customPaletteKey: "webmail_custom_palette",
};
```

**Checklist:**
- [ ] `demoMode: false`
- [ ] Tama ang `googleScriptUrl`
- [ ] Tama ang `domains`
- [ ] Bagong `defaultPassword`

---

## STEP 6 — GitHub Pages + Domain

1. Repo → **Settings → Pages**  
2. Source: **Deploy from a branch** → `main` / `(root)`  
3. Custom domain: `clientdomain.com` (o subdomain)  
4. Cloudflare DNS:
   - **Apex** (`clientdomain.com`): A records to GitHub Pages IPs  
     (o CNAME flattening kung supported)
   - **Subdomain** (`mail.`): CNAME → `USERNAME.github.io`  
5. Hintayin mag-verify ang GitHub.  
6. Kung may lumang cache: Cloudflare → **Caching → Purge Everything**.

GitHub Pages IPs (apex), usual:

```text
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

---

## STEP 7 — Final test (ikaw)

1. Buksan `https://clientdomain.com`  
2. Unlock gamit ang password sa `config.js`  
3. Prefix: `test` (o kahit ano)  
4. Mag-send ng email / OTP papunta doon  
5. **Refresh Inbox** → dapat may message + OTP badge  

Kung **0 messages** pero may row sa Sheet:
- Hard refresh `Ctrl+Shift+R`
- Check `demoMode: false`
- Check tama ang prefix@domain

---

## STEP 8 — I-hand off sa client

Sabihin:

1. URL: `https://clientdomain.com`  
2. Password: `(yung sa config)` — puwede nilang palitan sa **Customize**  
3. Paano gamitin:
   - Type ang username (prefix)  
   - Copy Address  
   - Gamitin sa signup  
   - Refresh Inbox → copy OTP  
4. Customize: logo, background, theme, footer link, bagong password  

**Huwag turuan** ang Apps Script / Worker / `config.js`.

---

## Kapag may problema

| Symptom | Check |
|---------|--------|
| Unstyled / plain HTML | Purge Cloudflare cache + hard refresh |
| 0 messages, Sheet may row | `demoMode: false`, tama ba ang prefix, hard refresh |
| Walang row sa Sheet | Catch-all → Worker? `GAS_WEBAPP_URL` tama? |
| `window is not defined` sa domain | Maling naka-point ang domain sa Apps Script — dapat GitHub Pages |
| OTP maraming basura | Latest `extractors.js` (strict OTP) |

---

## Template timing (estimate)

| Task | Oras |
|------|------|
| Cloudflare + DNS | 15–60 min (nameserver wait) |
| Sheet + Script deploy | 10 min |
| Worker + Email Routing | 10 min |
| Repo + config + Pages | 15–30 min |
| Test | 5 min |

---

## Quick copy — `config.js` blanks

```js
brandTitle: "",
domains: [""],
defaultPrefix: "",
defaultPassword: "",
footerName: "GRASHIEX",
footerLink: "",
footerYear: 2026,
googleScriptUrl: "",
demoMode: false,
```

Tapos — **Save → push/upload → purge cache → test → bigay sa client.**
