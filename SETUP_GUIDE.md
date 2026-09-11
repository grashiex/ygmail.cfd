# Setup Guide

**Buong step-by-step (simula umpisa → handoff):** buksan ang  
**[SELLER_PLAYBOOK.md](./SELLER_PLAYBOOK.md)**

Iyon ang single source of truth. Huwag mag-rely sa AI kapag naka-sundod ka na doon.

## 30-second overview

1. Domain → Cloudflare  
2. Google Sheet + `backend/Code.gs` → Web App `/exec`  
3. Worker + `backend/worker.js` + `GAS_WEBAPP_URL`  
4. Email Routing **Catch-all → Worker**  
5. `js/config.js` → `demoMode: false` + Script URL  
6. GitHub Pages + `CNAME` (domain → Pages, **not** Apps Script)  
7. Test email → Refresh Inbox → bigay URL + password sa client  

## Code sources

| Paste where | File |
|-------------|------|
| Apps Script | `backend/Code.gs` |
| Cloudflare Worker | `backend/worker.js` |
| Seller settings | `js/config.js` |
