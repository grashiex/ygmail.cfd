# FULL BUYER SETUP — Simula umpisa (manual, walang AI)

Sundin **nang sunod-sunod**. Isang Cloudflare account mo; **bawat buyer = sariling domain**.

**Seller files (PC mo):**
| File | Gamit |
|------|--------|
| `_seller/backend/Code.gs` | Google Apps Script |
| `_seller/backend/worker.js` | Cloudflare Worker |
| `_src/js/config.js` | Site settings (domain, passwords) |

Pagkatapos i-edit ang config: `npm run protect` → push sa GitHub.

---

# Bago magsimula — isulat

```
Buyer name:     ________________
Domain:         ________________   (hal. juanmail.cfd)
Unlock password: ________________  (share sa buyer / users)
Owner PIN:      ________________   (BUYER ONLY — huwag i-share)
GitHub repo:    ________________
Worker name:    email-________________
```

**Ibigay sa buyer sa dulo:** Site URL + Unlock password + Owner PIN (private)  
**Huwag ibigay:** Cloudflare, Worker, Apps Script URL, `_seller`, config

---

# STEP 0 — PC setup (isang beses lang)

1. Install [Node.js LTS](https://nodejs.org)
2. PowerShell:

```powershell
cd "C:\web-creations\email website"
npm install
```

3. May GitHub account + [GitHub Desktop](https://desktop.github.com) o git sa terminal  
4. May Cloudflare account (isa lang para sa lahat ng domain)

---

# STEP 1 — Domain → Cloudflare

1. Buksan [dash.cloudflare.com](https://dash.cloudflare.com) (account **mo**)
2. **Add a site** → type domain ng buyer → plan **Free**
3. Cloudflare magbibigay ng **2 nameservers**
4. Punta sa registrar (Namecheap / GoDaddy / Porkbun / etc.)  
   → palitan nameservers → Cloudflare nameservers
5. Hintayin status = **Active** (5 min–48 hrs)

✅ Domain Active sa Cloudflare.

---

# STEP 2 — Google Sheet + Apps Script (database)

1. [sheets.google.com](https://sheets.google.com) → **Blank spreadsheet**
2. Pangalan: `BuyerName Inbox`
3. **Extensions → Apps Script**
4. Burahin ang default code
5. Buksan sa PC: `_seller/backend/Code.gs` → Ctrl+A → Ctrl+C
6. Paste sa Apps Script → **Save** (💾)
7. Dropdown ng functions → piliin **`resetAuth`** (walang underscore)
8. **▶ Run** → **Review permissions** → Allow  
   Log: `OK resetAuth`
9. **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
10. **Deploy** → kopyahin ang URL na nagtatapos sa **`/exec`**
11. I-save ang `/exec` URL (ilagay sa Worker later — **huwag** sa website)

✅ May `/exec` URL.

> Kapag nag-edit ulit ng Code.gs: Deploy → **Manage deployments** → ✏️ → **New version** → Deploy  
> (Huwag palaging New deployment = bagong URL.)

---

# STEP 3 — Cloudflare Worker (email + /api + fast login)

## 3A. Create Worker

1. Cloudflare → **Workers & Pages** → **Create** → Worker
2. Name: `email-juanmail` (unique per buyer)
3. **Edit code** → burahin lahat
4. Paste `_seller/backend/worker.js` → **Deploy**

## 3B. Variables (Settings → Variables and Secrets)

| Name | Value |
|------|--------|
| `GAS_WEBAPP_URL` | `/exec` URL mula Step 2 |
| `UNLOCK_PASSWORD` | unlock password ng buyer |
| `OWNER_PIN` | owner PIN ng buyer |
| `ALLOWED_ORIGIN` | `https://juanmail.cfd` |
| `FORWARD_TO` | `youremail@gmail.com` *(optional)* |

Save.

**Paano gamitin:**
- `UNLOCK_PASSWORD` = login sa site (pwede i-share sa Person 1/2/3)
- `OWNER_PIN` = kailangan sa Customize para **palitan** ang unlock (kick users)
- Website change password → gumagana; optional i-update din ang `UNLOCK_PASSWORD` variable pagkatapos

## 3C. Route `/api`

1. Worker → **Settings / Domains / Triggers** → **Add route**  
   **O** domain → **Workers** → **Routes** → Add
2. Route:

```text
juanmail.cfd/api*
```

Worker: `email-juanmail`

✅ `https://juanmail.cfd/api?action=ping` → `{"ok":true,"worker":true,...}`  
*(Gagana fully after DNS Step 6.)*

---

# STEP 4 — Email Routing (para matanggap ang mail)

1. Cloudflare → **domain ng buyer** → **Email** → **Email Routing** → Enable
2. **Destination addresses** (kung may `FORWARD_TO`):
   - Add Gmail mo → verify sa inbox/spam → status **Verified**
3. **Routing rules** → **Catch-all**:
   - Action: **Send to a Worker**
   - Worker: `email-juanmail`
4. Save

✅ Test: mag-send sa `test@juanmail.cfd` mula Gmail → Sheet may row (10–30s).  
Kung may FORWARD_TO → may copy sa Gmail.

---

# STEP 5 — GitHub repo + site files

## 5A. Bagong repo

1. [github.com/new](https://github.com/new)
2. Name: `juanmail.cfd` (o kahit ano)
3. **Public** (kailangan sa free GitHub Pages)
4. Create (walang README kung i-push mo ang existing folder)

## 5B. I-edit config

Buksan `_src/js/config.js`:

```js
window.APP_CONFIG = {
  brandTitle: "juanmail.cfd",
  brandLogo: "",
  domains: ["juanmail.cfd"],
  defaultPrefix: "",
  defaultPassword: "JuanUnlock2026",   // SAME as Worker UNLOCK_PASSWORD
  ownerPin: "JuanOwnerPin99",          // SAME as Worker OWNER_PIN

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

## 5C. CNAME file (root ng project)

File name: `CNAME` (walang .txt)

```text
juanmail.cfd
```

## 5D. Protect + push

```powershell
cd "C:\web-creations\email website"
npm run protect
```

Tapos i-push sa repo ng buyer:

```powershell
git remote set-url origin https://github.com/YOURUSER/juanmail.cfd.git
git add .
git commit -m "Deploy juanmail.cfd"
git branch -M main
git push -u origin main
```

*(O gamitin GitHub Desktop: publish folder sa bagong repo.)*

**Huwag isama sa client zip:** `_seller/`, playbooks (optional).

---

# STEP 6 — GitHub Pages + DNS

## 6A. Pages

1. Repo → **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / folder: `/ (root)` → Save
4. Custom domain: `juanmail.cfd`
5. Hintayin verify

## 6B. Cloudflare DNS (domain → GitHub Pages)

Cloudflare → buyer domain → **DNS** → records:

**Apex domain** (`juanmail.cfd`):

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | `185.199.108.153` | **Proxied (orange)** |
| A | `@` | `185.199.109.153` | **Proxied** |
| A | `@` | `185.199.110.153` | **Proxied** |
| A | `@` | `185.199.111.153` | **Proxied** |

**Subdomain** (optional `mail.juanmail.cfd`):

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `mail` | `YOURUSER.github.io` | **Proxied** |

⚠️ **Orange cloud (Proxied) required** para gumana ang `/api` Worker route.

## 6C. Cache

Cloudflare → **Caching → Configuration → Purge Everything**

---

# STEP 7 — Final test (ikaw)

1. `https://juanmail.cfd/api?action=ping` → `ok: true`
2. Buksan `https://juanmail.cfd`
3. Login gamit **Unlock password** (dapat mabilis)
4. 🎲 random username → Copy Address
5. Mag-send ng email doon → **Refresh Inbox**
6. Customize → Owner PIN + new unlock → Save  
   → ibang device: old unlock hindi na gumagana

✅ Kung OK → handoff.

---

# STEP 8 — Ibigay sa buyer

```
URL:            https://juanmail.cfd
Unlock password: (share OK — Person 1/2/3)
Owner PIN:       (PRIVATE — buyer only)
```

Sabihin:
1. Login → random username → Copy Address → gamitin sa signup  
2. Refresh Inbox → OTP / Open Access Link  
3. Customize: logo, theme, colors  
4. Para i-kick ang users: Customize → Owner PIN → bagong Unlock password → Save  
5. Huwag ibigay ang Owner PIN sa iba

---

# Printable checklist

```
[ ] Domain Active sa Cloudflare
[ ] Sheet + Code.gs + resetAuth + /exec URL
[ ] Worker + worker.js Deploy
[ ] Variables: GAS_WEBAPP_URL, UNLOCK_PASSWORD, OWNER_PIN
[ ] Route: domain/api* → Worker
[ ] Email catch-all → Worker
[ ] FORWARD_TO verified (optional)
[ ] config.js match passwords + domain
[ ] CNAME file
[ ] npm run protect + push
[ ] GitHub Pages on (Public repo)
[ ] DNS A records Proxied
[ ] Purge cache
[ ] ping OK + login OK + email OK
[ ] Handoff URL + unlock + owner PIN
```

---

# Troubleshooting

| Problema | Ayusin |
|----------|--------|
| Pages 404 | Repo **Public**; Pages = `main` / `(root)` |
| Login bagal / timeout | Latest `worker.js` + `UNLOCK_PASSWORD` / `OWNER_PIN` variables |
| `/api` = website HTML | Route `domain/api*` + DNS **Proxied** |
| Inbox empty, Sheet may row | Tama ba ang `user@domain`? `demoMode: false`? |
| Walang row sa Sheet | Catch-all → Worker? `GAS_WEBAPP_URL` tama? |
| Unknown action / luma | Manage deployments → ✏️ New version; Worker URL = same `/exec` |
| `window is not defined` | Domain naka-point sa Apps Script — dapat GitHub Pages |
| Hindi maka-change pass | Kailangan **Owner PIN**; unlock password lang hindi enough |

---

# Paalala

| Seller (ikaw) | Buyer |
|---------------|--------|
| Domain, CF, Worker, Sheet, GitHub, config | Login + use inbox |
| Footer GRASHIEX | Customize look |
| Set unlock + owner PIN | Share unlock only; keep Owner PIN |

**File na ito:** `_seller/BUYER_SETUP_FULL.md` — ito lang sundin para sa bawat bagong buyer.
