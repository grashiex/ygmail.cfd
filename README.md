# Private Webmail

**Seller docs:** [`_seller/READY_TO_SELL.md`](_seller/READY_TO_SELL.md) · [`_seller/SELLER_PLAYBOOK.md`](_seller/SELLER_PLAYBOOK.md)

Per client = **different domain**; you set Sheet + Worker + `config` manually. Client gets URL + password only.

## Edit → ship

```powershell
# edit _src/js/*
npm run protect
git add . ; git commit -m "…" ; git push
```

## Config (`_src/js/config.js`)

```js
domains: ["clientdomain.com"],
defaultPassword: "…",
apiUrl: "/api",
googleScriptUrl: "",
demoMode: false,
```

## Gmail copy

Worker variable `FORWARD_TO` = verified Email Routing destination (not Apps Script).
