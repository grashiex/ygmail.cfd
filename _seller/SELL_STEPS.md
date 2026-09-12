# Kapag magbebenta — Step-by-step (ikaw lang)

**Isang Cloudflare account** mo. Bawat buyer = **sariling domain + Worker + Sheet + site**.

---

## A) Saan ilalagay ang Worker code + password

### 1. Paste `worker.js`

1. [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Workers & Pages**
3. Buksan ang Worker (hal. `email-to-sheet` o `email-buyername`)
4. **Edit code**
5. Burahin lahat → paste buong file: `_seller/backend/worker.js`
6. **Deploy**

### 2. Variables (UNLOCK + OWNER PIN)

1. Same Worker → tab **Settings**
2. **Variables and Secrets** (o Environment Variables)
3. **Add** / **Add variable**:

| Variable name | Example value | Notes |
|---------------|---------------|--------|
| `GAS_WEBAPP_URL` | `https://script.google.com/.../exec` | mula Apps Script deploy |
| `UNLOCK_PASSWORD` | `JuanMail2026` | **unlock** — pwede i-share sa users |
| `OWNER_PIN` | `JuanOwner99` | **buyer only** — huwag i-share |
| `ALLOWED_ORIGIN` | `https://juanmail.cfd` | optional |
| `FORWARD_TO` | `glitterhost0@gmail.com` | optional Gmail copy |

4. Save  
5. Kung may “Encrypt” / Secret — OK gamitin Secret para sa passwords.

**Hindi** ito sa `config.js` lang — Worker Variables ang mabilis na login.  
I-match din sa `_src/js/config.js` (defaultPassword + ownerPin) para sa site bootstrap.

---

## B) Paano iba-iba ang pass/PIN per buyer

Bawat buyer → **sariling Worker** (recommended) → sariling Variables:

```
Buyer Juan:
  UNLOCK_PASSWORD = JuanUnlock2026
  OWNER_PIN       = JuanOwnerPin99

Buyer Ana:
  UNLOCK_PASSWORD = AnaUnlock2026
  OWNER_PIN       = AnaOwnerPin88
```

Sa website config (`_src/js/config.js`) ng site nila:

```js
defaultPassword: "JuanUnlock2026",  // same as UNLOCK_PASSWORD
ownerPin: "JuanOwnerPin99",         // same as OWNER_PIN
domains: ["juanmail.cfd"],
brandTitle: "juanmail.cfd",
apiUrl: "/api",
googleScriptUrl: "",
demoMode: false,
```

Then:

```powershell
npm run protect
git push
```

**Ibigay sa buyer:**
- Site URL  
- Unlock password (pwede nilang i-share sa Person 1/2/3)  
- Owner PIN (**lihim** — para magpalit ng unlock / kick users)

**Huwag ibigay:** Worker, Script URL, Cloudflare, `config.js`

---

## C) Buong setup per bagong buyer (checklist)

Isulat muna:

```
Buyer name: __________
Domain: __________
Unlock password: __________
Owner PIN: __________
```

### 1. Domain
- [ ] Cloudflare → **Add a site** → domain nila → Free → nameservers → **Active**

### 2. Google Sheet
- [ ] New Sheet → Extensions → Apps Script  
- [ ] Paste `_seller/backend/Code.gs` → Save  
- [ ] Run **`resetAuth`** → Allow  
- [ ] Deploy → Web app → Me / Anyone → copy **`/exec` URL**

### 3. Worker (bagong Worker per buyer)
- [ ] Create Worker → name `email-buyername`  
- [ ] Paste `_seller/backend/worker.js` → Deploy  
- [ ] Variables:
  - [ ] `GAS_WEBAPP_URL` = `/exec`
  - [ ] `UNLOCK_PASSWORD` = (unlock nila)
  - [ ] `OWNER_PIN` = (owner PIN nila)
  - [ ] `ALLOWED_ORIGIN` = `https://theirdomain.com`
  - [ ] `FORWARD_TO` = your Gmail (optional; must be verified destination)

### 4. Routes + Email
- [ ] Route: `theirdomain.com/api*` → their Worker  
- [ ] Email Routing → Catch-all → **Send to Worker** → their Worker  
- [ ] DNS for website → GitHub Pages → **Proxied (orange)**

### 5. Website
- [ ] Edit `_src/js/config.js` (domain, passwords, footer)  
- [ ] `CNAME` file = their domain  
- [ ] `npm run protect` → push → GitHub Pages on  
- [ ] Purge Cloudflare cache  

### 6. Test
- [ ] `https://theirdomain.com/api?action=ping` → `ok: true`  
- [ ] Login with unlock password (mabilis)  
- [ ] Send test email → Refresh Inbox  
- [ ] Customize → Owner PIN → change unlock → other device needs new password  

### 7. Handoff
Sabihin:
1. URL + unlock password  
2. Owner PIN (private)  
3. Random username → Copy Address → signup → Refresh Inbox  
4. Para i-kick ang users: Customize → Owner PIN + new unlock password → Save  

---

## D) Quick map (para di malito)

| Bagay | Saan |
|-------|------|
| Worker code | Workers → Edit code → `worker.js` |
| Unlock + Owner PIN (fast login) | Worker → **Settings → Variables** |
| Domain / brand on site | `_src/js/config.js` → `npm run protect` |
| Emails database | Google Sheet + `Code.gs` |
| Gmail copy | Worker variable `FORWARD_TO` + verified destination |

---

## E) Default for your ygmail.cfd (example)

Worker Variables:
- `UNLOCK_PASSWORD` = `grashiex123`
- `OWNER_PIN` = `grashiex-owner`

config.js:
- `defaultPassword: "grashiex123"`
- `ownerPin: "grashiex-owner"`

Hard refresh after Worker deploy.
