# Seller Playbook — Ready for clients (manual, per domain)

**Quick handoff sheet:** [`READY_TO_SELL.md`](./READY_TO_SELL.md)

Ikaw ang magse-set **bawat client** (iba-iba ang domain). Client = site URL + password + Customize.

Live reference: `ygmail.cfd`

---

## Architecture (huwag baguhin)

```
Email → Cloudflare Catch-all → Worker
         ├─ FORWARD_TO (optional Gmail copy)
         └─ GAS_WEBAPP_URL → Sheet

Website (GitHub Pages) → /api → same Worker → list/delete
```

**Seller only:** domain, Sheet, Worker, `config.js`, Pages, footer  
**Client only:** password, logo, theme, username

---

## One-time (your machine)

```powershell
cd "C:\web-creations\email website"
npm install
```

Edit sources in `_src/js/` → `npm run protect` → push `js/`

---

## Every new client (15–40 min)

### A. Domain
1. Client domain → Cloudflare → Free → nameservers → **Active**

### B. Sheet + Script
1. New Google Sheet: `ClientName Inbox`
2. Extensions → Apps Script → paste `_seller/backend/Code.gs`
3. Deploy → Web app → Me / Anyone → copy `/exec` URL

### C. Worker
1. New Worker (recommended per client) → paste `_seller/backend/worker.js`
2. Variables:
   - `GAS_WEBAPP_URL` = `/exec`
   - `ALLOWED_ORIGIN` = `https://clientdomain.com`
   - `FORWARD_TO` = your Gmail (optional) — must be **verified destination** first
3. Domains & Routes: `clientdomain.com/api*` → this Worker

### D. Email Routing
1. Domain → Email Routing → Enable  
2. Catch-all → **Send to a Worker** → this Worker  
3. (If Gmail copy) Destination addresses → add & verify Gmail

### E. Website
1. New GitHub repo (Public on free plan for Pages)  
2. `_src/js/config.js`:

```js
brandTitle: "clientdomain.com",
domains: ["clientdomain.com"],
defaultPassword: "unique-per-client",
apiUrl: "/api",
googleScriptUrl: "",
demoMode: false,
footerName: "GRASHIEX",
footerLink: "https://t.me/grashiex",
```

3. Root `CNAME` file = `clientdomain.com`  
4. `npm run protect` → push → Pages `main` / `(root)`  
5. DNS A/CNAME → GitHub Pages, **Proxied**  
6. Purge cache → test

### F. Handoff
- URL + password  
- “Use random username, Copy Address, Refresh Inbox, Customize OK”  
- Do **not** teach Worker / Script / config

---

## Your Gmail copy (`glitterhost0@gmail.com`)

1. Email Routing → **Destination addresses** → Add → verify email  
2. Worker variable `FORWARD_TO` = `glitterhost0@gmail.com`  
3. Redeploy Worker with latest `worker.js`  
4. Send test to `anything@ygmail.cfd` → Gmail + Sheet  

(Apps Script MailApp is backup only; leave `FORWARD_TO_GMAIL` empty in Code.gs.)

---

## Random usernames

🎲 button = large word pool + 4-digit number, remembers last ~800 locally so it **doesn’t repeat** on that browser.

---

## Protect reminder

| Do | Don’t |
|----|-------|
| `apiUrl: "/api"` | Put Script URL in website |
| `npm run protect` before push | Ship `_seller/` / `_src/` to clients |
| Proxied DNS for `/api` | Point domain at Apps Script |
| Public repo if free Pages | Expect Private Pages on free GitHub |
