# Step-by-step: Domain → Email → Apps Script → GitHub Pages

Gabay para sa’yo (seller). Sundin **nang sunod-sunod**.

---

## Checklist (overview)

1. Domain naka-Cloudflare  
2. Google Sheet + Apps Script (Web App URL)  
3. Cloudflare Worker + Email Routing  
4. I-edit ang `js/config.js` (`demoMode: false` + Script URL)  
5. I-push sa GitHub → i-on ang GitHub Pages  
6. Test: send email → Refresh Inbox  

---

## Step 1 — Domain sa Cloudflare

1. Bumili / may domain ka na (hal. `grecev.cfd`).
2. Mag-sign up / login sa [Cloudflare](https://dash.cloudflare.com).
3. **Add a site** → ilagay ang domain → Free plan.
4. Palitan ang **nameservers** sa registrar (Namecheap, GoDaddy, etc.) papunta sa Cloudflare nameservers.
5. Hintayin maging **Active**.

---

## Step 2 — Google Sheet + Apps Script

1. Pumunta sa [Google Sheets](https://sheets.google.com) → **Blank spreadsheet**.
2. Pangalanan (hal. `Private Inbox DB`).
3. **Extensions → Apps Script**.
4. Burahin ang default code → i-paste ang laman ng `backend/Code.gs`.
5. **Save** (Ctrl+S).
6. **Deploy → New deployment**:
   - Gear ⚙️ → **Web app**
   - Description: `inbox-api`
   - Execute as: **Me**
   - Who has access: **Anyone**
7. **Deploy** → kopyahin ang **Web app URL**  
   (`https://script.google.com/macros/s/XXXX/exec`)
8. I-save ang URL — ilalagay mo sa `js/config.js` later.

**Quick test:** buksan ang URL sa browser. Dapat may JSON tulad ng  
`{"ok":true,"emails":[]}`.

---

## Step 3 — Cloudflare Worker (email → Apps Script)

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → Worker.
2. I-paste ang laman ng `backend/worker.js`.
3. **Deploy**.
4. Worker → **Settings → Variables** → Add:
   - Name: `GAS_WEBAPP_URL`
   - Value: ang Apps Script URL mula Step 2
5. Save.

---

## Step 4 — Email Routing (para matanggap ang mail)

1. Cloudflare → domain mo → **Email → Email Routing**.
2. **Get started** / Enable Email Routing.
3. **Routing rules**:
   - Catch-all **OR** specific address (hal. `*@grecev.cfd`)
   - Destination: **Send to a Worker** → piliin ang Worker mula Step 3
4. Kung hinihingi ng Cloudflare ang MX records, iwanang auto (Cloudflare ang magse-set).

**Test:** mag-send ng email sa `test@yourdomain.com` mula sa Gmail.  
Tingnan ang Google Sheet — dapat may bagong row (`to`, `from`, `subject`, `body`…).

---

## Step 5 — I-configure ang site (`js/config.js`)

Buksan `js/config.js` at i-set:

```js
brandTitle: "grecev.cfd",
domains: ["grecev.cfd"],
defaultPrefix: "grashiex",
defaultPassword: "bagong-password-mo",

footerName: "GRASHIEX",
footerLink: "https://t.me/grashiex",  // link kapag na-click ang GRASHIEX
footerYear: 2026,

googleScriptUrl: "https://script.google.com/macros/s/XXXX/exec",
demoMode: false,  // IMPORTANT kapag live / ibebenta
```

---

## Step 6 — I-upload sa GitHub + Pages

### A. Gumawa ng repo
1. [GitHub](https://github.com/new) → New repository (Public OK para sa free Pages).
2. Huwag i-check “Add README” kung i-push mo ang existing folder.

### B. I-push ang project (PowerShell)

Sa folder ng project:

```powershell
cd "C:\web-creations\email website"
git init
git add .
git commit -m "Private webmail inbox"
git branch -M main
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

### C. I-on ang GitHub Pages
1. Repo → **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / folder: `/ (root)` → Save
4. Hintayin ang URL: `https://YOUR_USER.github.io/YOUR_REPO/`

### D. (Optional) Custom domain sa Pages
1. Pages → Custom domain → `mail.grecev.cfd` (o apex)
2. Cloudflare DNS:
   - CNAME `mail` → `YOUR_USER.github.io` (Proxied o DNS only; for Pages often DNS only)
3. Hintayin mag-verify ang GitHub.

---

## Step 7 — Live test sa site

1. Buksan ang Pages URL.
2. Unlock gamit ang password sa `config.js`.
3. Prefix + domain = address na ginamit mo sa test email.
4. **Refresh Inbox** → dapat lumabas ang message + OTP badges.

---

## Kapag ibebenta sa client

Ikaw ang magse-set ng Steps 1–6. Ibigay sa client:
- Site URL  
- Password (puwede nilang palitan sa **Customize**)  

**Huwag isama** sa zip (optional): `backend/`, `SETUP_GUIDE.md`, `js/snippets.js`  
Para hindi nila madaling makita ang Worker/Script setup files (Script URL nasa `config.js` pa rin kung View Source).

---

## Troubleshooting

| Problema | Ayusin |
|----------|--------|
| Inbox empty (live) | Sheet may row ba? `demoMode: false`? Tama ba ang `googleScriptUrl`? |
| Worker reject | Check `GAS_WEBAPP_URL` variable |
| Apps Script error | Redeploy Web app as **Anyone**; run once from editor |
| CORS / fetch fail | Buksan muna ang Script URL sa tab; redeploy; hard refresh site |
| Email hindi dumating | MX / Email Routing enabled? Rule → Worker? |
| Pages 404 | `index.html` ba nasa root? Branch `main` / `(root)` |

Mas detalyadong code: `backend/Code.gs`, `backend/worker.js`.
