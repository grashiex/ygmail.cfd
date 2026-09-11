# Private Webmail & OTP Extractor

Static inbox for GitHub Pages. Clients customize the look; you wire the backend.

## Client UI (Customize)

- Brand title, logo (URL or upload)
- Background image (URL or upload)
- Themes + custom palette
- Change password

## Seller only (`js/config.js`)

```js
demoMode: true,           // false when selling
googleScriptUrl: "",      // Apps Script /exec URL
domains: ["grecev.cfd"],  // forwarding domains you set up
defaultPassword: "…",     // starting password
```

Hindi lalabas sa UI ang Script URL / Worker / Demo. Setup guide: [SETUP_GUIDE.md](SETUP_GUIDE.md).

## Preview

Open `index.html`. Password: `grashiex123`. Demo samples on while `demoMode: true`.
