# Fast login (Worker auth)

Login/password change used to wait for Google Apps Script (bagal / phone timeout).  
Ngayon **Worker** ang mag-auth (mabilis).

## Ikaw — update Worker (required)

1. Paste `_seller/backend/worker.js` → **Deploy**
2. Worker → **Settings → Variables** — add:

| Name | Value |
|------|--------|
| `UNLOCK_PASSWORD` | `grashiex123` |
| `OWNER_PIN` | `grashiex-owner` |

(Keep existing `GAS_WEBAPP_URL`, `FORWARD_TO`, `ALLOWED_ORIGIN`.)

3. Hard refresh site  
4. Login should feel **instant**  
5. Inbox list can still take a few seconds (Sheet) — that’s normal

## Buyer per client

Set unique `UNLOCK_PASSWORD` + `OWNER_PIN` on **their** Worker.
