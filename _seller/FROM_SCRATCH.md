# GRASHIEX — Setup Guide (From Scratch)
### Ikaw lang ang magse-set. Hindi mo na kailangan ng AI.

Bawat buyer = **sariling domain**.  
**Isang Cloudflare account** mo lang — madaming domain ang pwedeng i-add.

**Ibigay sa buyer:** site URL + password (+ paano mag-Customize).  
**Huwag ibigay:** Worker, Apps Script URL, `_seller`, `_src`, config secrets.

---

## Ano ang system

```
Buyer email → Cloudflare Email Routing (catch-all)
            → Worker (email-to-sheet-BUYER)
            → Google Apps Script → Google Sheet
            → Website (GitHub Pages) magbabasa via /api
```

Optional: Worker `FORWARD_TO` = Gmail mo (copy ng lahat ng incoming).

---

# PART 0 — Isang beses lang sa PC mo

1. Install [Node.js](https://nodejs.org) (LTS).
2. Buksan PowerShell sa project folder:

```powershell
cd "C:\web-creations\email website"
npm install
```

3. Seller files nandito:
   - `_seller/backend/Code.gs` → Apps Script
   - `_seller/backend/worker.js` → Cloudflare Worker
   - `_src/js/config.js` → i-edit per buyer
   - `npm run protect` → bago mag-push

---

# PART 1 — Bawat BAGONG BUYER (sunod-sunod)

Ilagay muna:

| Field | Example |
|-------|---------|
| Buyer name | Juan |
| Domain | `juanmail.cfd` |
| Site password | `JuanMail2026!` |
| Gmail copy (optional) | `glitterhost0@gmail.com` |

---

## STEP 1 — Domain sa Cloudflare (same account)

1. Login [dash.cloudflare.com](https://dash.cloudflare.com) (account mo).
2. **Add a site** → type domain ng buyer → **Free**.
3. Palitan ang **nameservers** sa registrar (Namecheap / GoDaddy / etc.) papunta sa Cloudflare.
4. Hintayin status = **Active** (minsan 5 min–24 hrs).

✅ Checkpoint: domain naka-**Active** sa Cloudflare.

---

## STEP 2 — Google Sheet + Apps Script (database)

1. [sheets.google.com](https://sheets.google.com) → **Blank spreadsheet**.
2. Pangalan: `Juan Inbox` (buyer name).
3. **Extensions → Apps Script**.
4. Burahin ang default code.
5. Buksan sa PC: `_seller/backend/Code.gs` → Ctrl+A → Ctrl+C.
6. Paste sa Apps Script → **Save** (💾).
7. **Deploy → New deployment**:
   - ⚙️ → **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
8. **Deploy** → Allow permissions.
9. **Kopyahin ang Web App URL** (nagtatapos sa `/exec`).
10. Test: buksan ang URL sa browser → dapat may JSON tulad ng `{"ok":true,...}`.

✅ Checkpoint: may `/exec` URL. **Huwag ito ilagay sa website** — sa Worker lang.

> Kapag nag-edit ulit ng Code.gs later: Deploy → Manage deployments → ✏️ → **New version** → Deploy.

---

## STEP 3 — Cloudflare Worker (email + /api)

### 3A. Gumawa ng Worker (isa per buyer)

1. Cloudflare → **Workers & Pages** → **Create** → Worker.
2. Name example: `email-juanmail`.
3. **Edit code** → burahin lahat.
4. Paste buong `_seller/backend/worker.js` → **Deploy**.

### 3B. Variables

Worker → **Settings → Variables**:

| Name | Value |
|------|--------|
| `GAS_WEBAPP_URL` | `/exec` URL mula Step 2 |
| `ALLOWED_ORIGIN` | `https://juanmail.cfd` |
| `FORWARD_TO` | `glitterhost0@gmail.com` *(optional)* |

Save / Deploy ulit kung kailangan.

### 3C. Route para sa `/api`

1. Worker → **Domains / Triggers / Routes** → **Add route**  
   **OR** domain → **Workers Routes** → Add route.

2. Route:

```text
juanmail.cfd/api*
```

Worker: `email-juanmail`.

✅ Checkpoint: `https://juanmail.cfd/api?action=list` → **JSON** (hindi web page).  
*(Gagana ito after Steps 5–6 DNS; pwede i-test later.)*

---

## STEP 4 — Email Routing (para matanggap ang mail)

1. Cloudflare → **domain ng buyer** → **Email → Email Routing** → Enable.
2. **Routing rules** → **Catch-all**:
   - Action: **Send to a Worker**
   - Worker: `email-juanmail`
3. **Save**.

### Kung may Gmail copy (`FORWARD_TO`)

1. Same Email Routing → **Destination addresses**.
2. **Add** `glitterhost0@gmail.com`.
3. Buksan Gmail → click **verify** link.
4. Status = **Verified**.
5. Siguraduhing naka-set ang Worker variable `FORWARD_TO`.

✅ Checkpoint: mag-send mula personal Gmail papunta `test@juanmail.cfd`.  
Hintay 10–30s → Google Sheet **Inbox** tab may bagong row.  
Kung may `FORWARD_TO` → may copy din sa Gmail (check Spam).

---

## STEP 5 — Website files + config

### 5A. Prep folder / repo

1. Gumawa ng **bagong GitHub repo** para sa buyer (Public OK sa free Pages).  
   Example name: `juanmail.cfd`
2. Kopyahin ang project files (o clone then palitan config).  
   **Huwag isama sa client zip:** `_seller/`, `_src/` optional itago; playbooks seller-only.

### 5B. I-edit config

Buksan `_src/js/config.js` (o `js/config.js` kung editable copy):

```js
window.APP_CONFIG = {
  brandTitle: "juanmail.cfd",
  brandLogo: "",
  domains: ["juanmail.cfd"],
  defaultPrefix: "",
  defaultPassword: "JuanMail2026!",

  contactAdminLabel: "Contact admin",
  contactAdminLink: "https://t.me/grashiex",

  footerName: "GRASHIEX",
  footerLink: "https://t.me/grashiex",
  footerYear: 2026,

  apiUrl: "/api",
  googleScriptUrl: "",
  demoMode: false,

  sessionKey: "webmail_session_ok",
  settingsKey: "webmail_settings",
  themeKey: "webmail_theme",
  customPaletteKey: "webmail_custom_palette",
};
```

**Checklist:**
- [ ] `domains` = exact domain ng buyer  
- [ ] `demoMode: false`  
- [ ] `googleScriptUrl: ""` (laging empty)  
- [ ] `apiUrl: "/api"`  
- [ ] Bagong `defaultPassword`

### 5C. CNAME file (root ng site)

File name: `CNAME` (walang .txt)

```text
juanmail.cfd
```

### 5D. Protect + push

```powershell
cd "C:\web-creations\email website"
npm run protect
git add .
git commit -m "Deploy juanmail.cfd"
git push
```

*(Kung bagong repo: `git remote set-url origin https://github.com/YOU/juanmail.cfd.git` tapos push.)*

### 5E. GitHub Pages

1. Repo → **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / folder: `/ (root)` → Save
4. Custom domain: `juanmail.cfd`
5. Hintayin mag-verify

> Free GitHub: repo dapat **Public** para gumana ang Pages.  
> Private Pages = kailangan GitHub Pro.

---

## STEP 6 — DNS (domain → GitHub Pages)

Cloudflare → buyer domain → **DNS**:

### Apex (`juanmail.cfd`) — A records

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | `185.199.108.153` | **Proxied (orange)** |
| A | `@` | `185.199.109.153` | **Proxied** |
| A | `@` | `185.199.110.153` | **Proxied** |
| A | `@` | `185.199.111.153` | **Proxied** |

### O subdomain (`mail.juanmail.cfd`)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `mail` | `YOURUSER.github.io` | **Proxied** |

**Orange cloud (Proxied) = required** para gumana ang `/api` Worker route.

Pagkatapos: Cloudflare → **Caching → Purge Everything**.

---

## STEP 7 — Final test (ikaw)

1. Buksan `https://juanmail.cfd`
2. Password = nasa config
3. Tap 🎲 random username → **Copy Address**
4. Mag-send ng email / OTP doon
5. **Refresh Inbox** → may message + OTP / Access Link
6. Mobile: scroll OK, links open new tab
7. Customize: theme / logo → Save

✅ Kung lahat OK → ready i-handoff.

---

## STEP 8 — Ibigay sa buyer

Sabihin:

1. **URL:** `https://juanmail.cfd`
2. **Password:** `(yung sa config)` — puwedeng palitan sa Customize
3. Paano:
   - Random / type username  
   - Copy Address  
   - Gamitin sa signup (Netflix, Canva, etc.)  
   - Refresh Inbox → copy OTP o Open Access Link  
4. Customize: logo, colors, password, contact admin  

**Huwag turuan:** Apps Script, Worker, Email Routing, `config.js`.

---

# PART 2 — Quick copy checklist (print / notes)

```
Buyer: __________
Domain: __________
Password: __________

[ ] Cloudflare Active
[ ] Sheet + Code.gs deployed (/exec saved)
[ ] Worker created + worker.js pasted
[ ] GAS_WEBAPP_URL set
[ ] ALLOWED_ORIGIN set
[ ] FORWARD_TO set + Gmail verified (optional)
[ ] Route: domain/api* → Worker
[ ] Catch-all → Worker
[ ] config.js edited (demoMode false)
[ ] CNAME file
[ ] npm run protect + push
[ ] Pages on + DNS Proxied
[ ] Purge cache
[ ] Test inbox OK
[ ] Handoff URL + password
```

---

# PART 3 — Kapag may sira

| Problema | Ayusin |
|----------|--------|
| Pages 404 “no GitHub Pages site” | Repo **Public**; Pages = `main` / root |
| Unstyled / old site | Purge Cloudflare cache + hard refresh |
| Inbox 0, Sheet may row | Prefix@domain tama? `demoMode: false`? |
| Walang row sa Sheet | Catch-all → Worker? `GAS_WEBAPP_URL`? |
| `/api` = website HTML | Route `domain/api*` + DNS **Proxied** |
| Walang Gmail copy | Destination **Verified**? `FORWARD_TO`? Worker redeployed? |
| `window is not defined` | Domain naka-point sa Apps Script — ilipat sa Pages |
| White screen sa email button | Latest site; links open new tab |

---

# PART 4 — Ano ang seller-only vs client

| Seller (ikaw) | Client |
|---------------|--------|
| Domain + Cloudflare | Login password |
| Sheet + Apps Script | Username / random |
| Worker + Email Routing | Refresh Inbox |
| `config.js` + Pages | Customize look |
| Footer GRASHIEX | Bagong password |

---

**Tapos.** Sundin PART 1 bawat buyer. File na ito: `_seller/FROM_SCRATCH.md` — buksan anytime, walang AI.
