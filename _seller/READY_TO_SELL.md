# Ready to sell — per client (ikaw magse-set manually)

Bawat client = **sariling domain**. Ikaw ang mag-setup. Client = URL + password + Customize lang.

---

## Ano ang ibibigay sa client

| Ibigay | Huwag ibigay |
|--------|----------------|
| `https://clientdomain.com` | Apps Script URL |
| Password | Worker / `GAS_WEBAPP_URL` |
| Paano: username → Copy Address → signup → Refresh Inbox | `_seller/`, `_src/` |
| Customize (logo, theme, password) | Footer (ikaw lang sa config) |

---

## Per-client checklist (kopyahin bawat order)

**Client name:** _______________  
**Domain:** _______________  
**Password:** _______________  
**Gmail copy (optional):** _______________  

1. [ ] Domain → Cloudflare → Active  
2. [ ] Bagong Google Sheet → paste `_seller/backend/Code.gs` → Deploy Web App → `/exec` URL  
3. [ ] Worker (bago o clone) → paste `_seller/backend/worker.js` → Deploy  
4. [ ] Worker variables:
   - `GAS_WEBAPP_URL` = `/exec` URL  
   - `ALLOWED_ORIGIN` = `https://clientdomain.com`  
   - `FORWARD_TO` = Gmail mo (optional) — **verify muna** sa Email Routing → Destination addresses  
5. [ ] Route: `clientdomain.com/api*` → Worker  
6. [ ] Email Routing → Catch-all → **Send to Worker**  
7. [ ] DNS → GitHub Pages (**Proxied** / orange)  
8. [ ] Site files: bagong repo o folder  
   - Edit `_src/js/config.js`: `domains`, `brandTitle`, `defaultPassword`, `apiUrl: "/api"`, `googleScriptUrl: ""`, `demoMode: false`  
   - `CNAME` = client domain  
   - `npm run protect` → push → Pages on  
9. [ ] Purge Cloudflare cache  
10. [ ] Test: login → random username → send email → Sheet row + Inbox  
11. [ ] Kung may `FORWARD_TO`: check Gmail (at Spam)  
12. [ ] Handoff: URL + password only  

---

## Gmail copy (FORWARD_TO) — para sa’yo / client admin

Apps Script MailApp madalas **hindi** reliable sa live ingest. Gamitin ang **Worker**:

1. Cloudflare → domain → **Email → Email Routing → Destination addresses**  
2. **Add** `glitterhost0@gmail.com` (o kung ano) → verify sa Gmail (click link)  
3. Worker → Variables → `FORWARD_TO` = `glitterhost0@gmail.com`  
4. Paste latest `_seller/backend/worker.js` → Deploy  

Catch-all → Worker pa rin. Worker magfo-forward sa Gmail **at** magse-save sa Sheet.

---

## Config template (`_src/js/config.js`)

```js
brandTitle: "clientdomain.com",
domains: ["clientdomain.com"],
defaultPrefix: "",
defaultPassword: "palitan-per-client",
contactAdminLink: "https://t.me/grashiex",
footerName: "GRASHIEX",
footerLink: "https://t.me/grashiex",
footerYear: 2026,
apiUrl: "/api",
googleScriptUrl: "",
demoMode: false,
```

Then:

```powershell
npm run protect
git add . ; git commit -m "Deploy clientdomain" ; git push
```

---

## Client UX (sabihin mo lang)

1. Open site → enter password  
2. Tap **random** (🎲) for username — hindi umuulit locally  
3. **Copy Address** → gamitin sa Netflix / Canva / etc.  
4. **Refresh Inbox** → OTP / Open Access Link  
5. **Customize** → logo, colors, bagong password  

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Pages 404 | Repo Public (free) o Pro; Pages = `main` / root |
| Inbox empty, Sheet may row | `demoMode: false`, tama ang `user@domain` |
| Walang Sheet row | Catch-all → Worker? `GAS_WEBAPP_URL`? |
| Walang Gmail copy | `FORWARD_TO` set? Destination **verified**? Worker redeployed? |
| `/api` HTML not JSON | Route `domain/api*` + orange cloud |

Buong detalye: `SELLER_PLAYBOOK.md`
