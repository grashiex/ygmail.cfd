# Private Webmail & OTP Extractor

Static inbox for GitHub Pages. Clients customize the look; you wire the backend.

**Full setup (seller):** [SELLER_PLAYBOOK.md](SELLER_PLAYBOOK.md)  
Short pointer: [SETUP_GUIDE.md](SETUP_GUIDE.md)

## Client UI (Customize)

- Brand title, logo (URL or upload)
- Background image (URL or upload)
- Themes + **Custom 4-Color Palette** (Primary / Secondary / Background / Card) with **live preview**
- Contact admin link + change password

## Seller only (`js/config.js`)

```js
demoMode: false,          // always false when live / selling
googleScriptUrl: "",      // Apps Script /exec URL
domains: ["ygmail.cfd"],  // Email Routing domain
defaultPassword: "…",     // starting password
footerName / footerLink   // not editable by clients
```

## Architecture

```
Email → Cloudflare Catch-all → Worker → Apps Script → Sheet → GitHub Pages UI
```

## Preview locally

Open via Pages or a static server. Default password is whatever you set in `config.js`.
