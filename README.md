# Private Webmail

Clients see the inbox UI only. **Seller setup + backend live in `_seller/`** (not published by GitHub Pages).

## Protect (important)

1. Apps Script URL stays in **Cloudflare Worker** only (`GAS_WEBAPP_URL`) — not in the website.
2. Site calls **`/api`** → Worker route on your domain.
3. Public JS is **obfuscated**: edit `_src/js/`, then run `npm run protect` before push.
4. Prefer a **Private** GitHub repo so others cannot browse source on GitHub.

Full guide: [`_seller/SELLER_PLAYBOOK.md`](_seller/SELLER_PLAYBOOK.md)

## Local edit flow

```powershell
# 1) Edit readable code
#    _src/js/*.js   and   js/config.js (or _src/js/config.js)

npm install
npm run protect   # writes obfuscated files into js/
git add . ; git commit -m "…" ; git push
```

## Seller only (`_src/js/config.js` → copied to `js/config.js`)

```js
apiUrl: "/api",           // Cloudflare route → Worker
googleScriptUrl: "",      // leave empty on public site
demoMode: false,
domains: ["yourdomain.com"],
defaultPassword: "…",
```
