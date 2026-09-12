# Apps Script — ayos na setup (walang error)

## Exact steps (kopyahin)

1. Buksan ang **Google Sheet** (Inbox) → **Extensions → Apps Script**
2. **Ctrl+A** → Delete lahat
3. Buksan `_seller/backend/Code.gs` → **Ctrl+A → Ctrl+C** → paste → **Save** (💾)
4. Sa taas, function dropdown → piliin **`resetAuth_`**
5. Pindot **▶ Run**
6. Kung may **Review permissions** → Allow (Advanced → Go to … → Allow)
7. Execution log dapat: **`OK resetAuth_`** (walang Error)
8. **Deploy → Manage deployments**
9. Sa existing Web app → **✏️ Edit** → Version: **New version** → **Deploy**  
   ⚠️ Huwag “New deployment” kung may URL na sa Worker — i-edit ang luma.
10. Hard refresh site → login: **`grashiex123`**

### Passwords after reset

| Ano | Value | Sino |
|-----|--------|------|
| Unlock | `grashiex123` | Buyer + Person 1/2/3 |
| Owner PIN | `grashiex-owner` | **Buyer only** |

---

## Test kung tama ang deploy

Browser: `https://ygmail.cfd/api?action=ping`  

Dapat: `{"ok":true,"codeVersion":"stable-v1"}`  

Kung `Unknown action` → mali ang `/exec` URL sa Worker o hindi New version.

---

## Change unlock password (kick Person 1/2/3)

Customize → **Owner PIN** = `grashiex-owner` → New unlock password → Save  

Sila hindi makakapag-change (walang Owner PIN).
