/**
 * Main application — Private Webmail & OTP Extractor
 */
(() => {
  const state = {
    messages: [],
    selectedId: null,
  };

  const $ = (sel, root = document) => root.querySelector(sel);

  // ---------- Toast ----------
  function toast(message, type = "success") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    $("#toasts").appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity 0.25s";
      setTimeout(() => el.remove(), 250);
    }, 2200);
  }

  // ---------- Client prefs + seller config ----------
  function prefs() {
    return Auth.getSettings();
  }

  function isDemoMode() {
    return APP_CONFIG.demoMode === true;
  }

  function brandTitle() {
    return prefs().brandTitle || APP_CONFIG.brandTitle || "Inbox";
  }

  function brandLogo() {
    return prefs().brandLogo || APP_CONFIG.brandLogo || "";
  }

  function backgroundUrl() {
    return prefs().backgroundUrl || "";
  }

  function domains() {
    const list = APP_CONFIG.domains;
    if (Array.isArray(list) && list.length) return list;
    return ["example.com"];
  }

  function currentAddress() {
    const prefix = ($("#prefix-input").value || "").trim();
    const domain = $("#domain-select").value || domains()[0];
    if (!prefix) return "";
    return `${prefix}@${domain}`;
  }

  function contactAdminLink() {
    return (
      prefs().contactAdminLink ||
      APP_CONFIG.contactAdminLink ||
      APP_CONFIG.footerLink ||
      "#"
    );
  }

  function contactAdminLabel() {
    return (
      prefs().contactAdminLabel ||
      APP_CONFIG.contactAdminLabel ||
      "Contact admin"
    );
  }

  function applyContactAdmin() {
    const a = $("#gate-admin-link");
    if (!a) return;
    a.href = contactAdminLink();
    a.textContent = contactAdminLabel();
  }

  // ---------- Branding ----------
  function applyBranding() {
    const title = brandTitle();
    document.title = `${title} — Private Inbox`;
    $("#brand-title").textContent = title;
    $("#gate-title").textContent = title;

    const mark = $("#brand-mark");
    const logo = brandLogo();
    if (logo) {
      mark.innerHTML = `<img src="${escapeAttr(logo)}" alt="" />`;
    } else {
      mark.textContent = (title[0] || "G").toUpperCase();
    }

    applyBackground();
    applyFooter();
    applyContactAdmin();
  }

  function applyFooter() {
    // Seller-only — from APP_CONFIG, never client Customize
    const name = APP_CONFIG.footerName || "GRASHIEX";
    const link = APP_CONFIG.footerLink || "#";
    const year = APP_CONFIG.footerYear || new Date().getFullYear();
    const a = $("#footer-brand");
    if (!a) return;
    a.textContent = name;
    a.href = link;
    $("#footer-year").textContent = String(year);
  }

  function applyBackground() {
    const url = backgroundUrl();
    if (url) {
      document.body.classList.add("has-user-bg");
      document.documentElement.style.setProperty(
        "--user-bg-image",
        `url("${String(url).replace(/"/g, '\\"')}")`
      );
    } else {
      document.body.classList.remove("has-user-bg");
      document.documentElement.style.removeProperty("--user-bg-image");
    }
  }

  function populateDomains() {
    const sel = $("#domain-select");
    const list = domains();
    const prev = sel.value;
    sel.innerHTML = list
      .map((d) => `<option value="${escapeAttr(d)}">${escapeHtml(d)}</option>`)
      .join("");
    if (list.includes(prev)) sel.value = prev;
  }

  // ---------- Date formatting ----------
  function formatExact(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const hh = String(h).padStart(2, "0");
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} • ${hh}:${m} ${ampm}`;
  }

  function formatRelative(iso) {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (Number.isNaN(diff)) return "";
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return "just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} min${min === 1 ? "" : "s"} ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hr${hr === 1 ? "" : "s"} ago`;
    const days = Math.floor(hr / 24);
    if (days === 1) return "yesterday";
    return `${days} days ago`;
  }

  // ---------- Escape / sanitize ----------
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function sanitizeHtml(html) {
    if (!html) return "";
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    tpl.content
      .querySelectorAll("script, iframe, object, embed, link, meta")
      .forEach((n) => n.remove());
    tpl.content.querySelectorAll("*").forEach((el) => {
      [...el.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        const val = attr.value || "";
        if (name.startsWith("on") || /^javascript:/i.test(val)) {
          el.removeAttribute(attr.name);
        }
      });
    });
    // Open all real links in a new tab (Netflix etc. block iframe → white screen)
    tpl.content.querySelectorAll("a[href]").forEach((a) => {
      const href = (a.getAttribute("href") || "").trim();
      if (!href || /^javascript:/i.test(href) || href === "#") return;
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    });
    return tpl.innerHTML;
  }

  // ---------- Random prefix (large pool, no local repeats) ----------
  const ADJECTIVES = [
    "swift", "quiet", "amber", "coral", "nova", "lunar", "pixel", "cedar",
    "frost", "maple", "orbit", "velvet", "zinc", "ember", "jade", "silver",
    "golden", "crimson", "azure", "violet", "scarlet", "ivory", "onyx", "pearl",
    "copper", "bronze", "cobalt", "indigo", "magenta", "salmon", "mint", "sage",
    "olive", "lemon", "mango", "berry", "cherry", "peach", "grape", "melon",
    "sunny", "stormy", "misty", "foggy", "windy", "rainy", "snowy", "cloudy",
    "brave", "calm", "clever", "cosmic", "crisp", "daring", "eager", "fancy",
    "gentle", "happy", "honest", "jolly", "keen", "lively", "lucky", "mighty",
    "noble", "proud", "quick", "rapid", "rusty", "sharp", "silent", "solid",
    "spicy", "steady", "tidy", "tiny", "ultra", "vivid", "wild", "witty",
    "young", "zesty", "neon", "retro", "turbo", "hyper", "mega", "mini",
    "alpha", "beta", "delta", "gamma", "omega", "prime", "stellar", "solar",
    "astro", "comet", "quark", "atomic", "quantum", "digital", "cyber", "nitro",
    "plasma", "radar", "sonic", "vapor", "glacier", "jungle", "desert", "ocean",
    "river", "forest", "meadow", "valley", "summit", "bright", "dark", "fresh",
  ];

  const NOUNS = [
    "fox", "kite", "wave", "spark", "lane", "ridge", "bloom", "drift",
    "harbor", "quill", "raven", "stone", "tide", "grove", "pulse", "eagle",
    "falcon", "hawk", "owl", "wolf", "bear", "lynx", "otter", "panda",
    "tiger", "lion", "zebra", "horse", "deer", "moose", "whale", "shark",
    "dolphin", "coral", "shell", "pearl", "reef", "island", "canyon", "cliff",
    "peak", "ridge", "trail", "path", "bridge", "tower", "castle", "forge",
    "anvil", "blade", "shield", "arrow", "bow", "lance", "crown", "gem",
    "ruby", "opal", "jade", "onyx", "quartz", "crystal", "ember", "flame",
    "spark", "bolt", "flash", "beam", "ray", "glow", "shade", "shadow",
    "cloud", "storm", "rain", "snow", "frost", "ice", "mist", "wind",
    "breeze", "gust", "thunder", "comet", "meteor", "planet", "moon", "star",
    "nova", "orbit", "rocket", "shuttle", "drone", "pixel", "byte", "chip",
    "circuit", "signal", "beacon", "radar", "sonar", "laser", "prism", "lens",
    "camera", "frame", "canvas", "brush", "ink", "paper", "note", "song",
    "melody", "rhythm", "beat", "drum", "flute", "harp", "violin", "piano",
    "garden", "orchid", "lotus", "rose", "lily", "daisy", "tulip", "fern",
    "willow", "cedar", "maple", "oak", "pine", "birch", "aspen", "elm",
  ];

  const USED_PREFIX_KEY = "webmail_used_prefixes";
  const USED_PREFIX_MAX = 800;

  function loadUsedPrefixes() {
    try {
      const raw = localStorage.getItem(USED_PREFIX_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.map(String) : [];
    } catch {
      return [];
    }
  }

  function saveUsedPrefix(prefix) {
    const list = loadUsedPrefixes().filter((p) => p !== prefix);
    list.push(prefix);
    while (list.length > USED_PREFIX_MAX) list.shift();
    localStorage.setItem(USED_PREFIX_KEY, JSON.stringify(list));
  }

  function randomPrefix() {
    const used = new Set(loadUsedPrefixes());
    const current = ($("#prefix-input")?.value || "").trim().toLowerCase();
    if (current) used.add(current);

    for (let attempt = 0; attempt < 60; attempt++) {
      const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
      const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
      const num = Math.floor(1000 + Math.random() * 9000); // 4 digits
      const prefix = `${a}${n}${num}`.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!used.has(prefix)) {
        saveUsedPrefix(prefix);
        return prefix;
      }
    }

    // Absolute fallback — still unique
    const fallback = `user${Date.now().toString(36)}${Math.floor(Math.random() * 999)}`;
    saveUsedPrefix(fallback);
    return fallback;
  }

  // ---------- Inbox load ----------
  async function loadInbox({ silent } = {}) {
    const icon = $("#refresh-icon");
    icon.style.display = "inline-block";
    icon.style.animation = "spin 0.7s linear infinite";

    try {
      const address = currentAddress();
      if (!address) {
        state.messages = [];
        renderList();
        if (!silent) toast("Enter a username first", "error");
        return;
      }

      let messages;
      if (isDemoMode()) {
        messages = DemoData.getMessages(address);
      } else {
        const result = await Api.listEmails(address);
        if (
          result.sessionEpoch != null &&
          !Auth.checkSessionEpoch(result.sessionEpoch)
        ) {
          Auth.lock();
          showGate();
          toast("Password changed — log in again", "error");
          return;
        }
        messages = result.emails;
      }
      state.messages = messages.map((m) => {
        const extracted =
          typeof Extractors !== "undefined" && Extractors.analyze
            ? Extractors.analyze(m)
            : { codes: [], links: [], linkItems: [] };
        return { ...m, ...extracted };
      });
      renderList();
      if (state.selectedId) {
        const still = state.messages.find((m) => m.id === state.selectedId);
        if (still) openMessage(still.id, { skipScroll: true });
        else clearReading();
      }
      if (!silent) toast("Inbox refreshed");
    } catch (err) {
      toast(err.message || "Failed to load inbox", "error");
      if (!isDemoMode()) {
        state.messages = [];
        renderList();
      }
    } finally {
      icon.style.animation = "";
      updateModeIndicator();
    }
  }

  function renderList() {
    const list = $("#mail-list");
    const count = state.messages.length;
    $("#mail-count").textContent = `${count} message${count === 1 ? "" : "s"}`;

    if (!count) {
      const addr = currentAddress();
      list.innerHTML = `
        <li class="empty-state">
          <h3>No messages</h3>
          <p>${
            addr
              ? `Mail sent to <code>${escapeHtml(addr)}</code> will appear here.`
              : "Enter a <strong>username</strong> above, then tap Refresh Inbox."
          }</p>
        </li>`;
      return;
    }

    list.innerHTML = state.messages
      .map((m) => {
        const active = m.id === state.selectedId ? "active" : "";
        const initial = (m.fromName || m.fromEmail || "?")[0].toUpperCase();
        const codes = (m.codes || [])
          .slice(0, 2)
          .map(
            (c) =>
              `<button type="button" class="pill pill-otp" data-copy="${escapeAttr(c)}" title="Copy code">${escapeHtml(c)} ⧉</button>`
          )
          .join("");
        const linkItems =
          m.linkItems && m.linkItems.length
            ? m.linkItems
            : (m.links || []).map((u) => ({
                url: u,
                label:
                  typeof Extractors !== "undefined" && Extractors.linkLabel
                    ? Extractors.linkLabel(u)
                    : "Open Access Link",
              }));
        const links = linkItems.length
          ? `<button type="button" class="pill pill-link" data-open="${escapeAttr(linkItems[0].url)}">${escapeHtml(linkItems[0].label)} ↗</button>`
          : "";

        return `
          <li class="mail-item ${active}" data-id="${escapeAttr(m.id)}" role="option" aria-selected="${!!active}">
            <div class="avatar">${escapeHtml(initial)}</div>
            <div class="mail-main">
              <div class="mail-top">
                <span class="mail-from">${escapeHtml(m.fromName || "Unknown")}</span>
                <span class="mail-email">${escapeHtml(m.fromEmail || "")}</span>
              </div>
              <div class="mail-subject">${escapeHtml(m.subject || "(no subject)")}</div>
              <div class="badges">${codes}${links}</div>
            </div>
            <div class="mail-meta">
              <span class="mail-time">${escapeHtml(formatExact(m.date))}</span>
              <span class="rel-badge">${escapeHtml(formatRelative(m.date))}</span>
            </div>
          </li>`;
      })
      .join("");
  }

  function clearReading() {
    state.selectedId = null;
    $("#reading-empty").classList.remove("hidden");
    $("#reading-view").classList.remove("open");
    $("#reading-pane").classList.remove("mobile-open");
    renderList();
  }

  function openMessage(id, { skipScroll } = {}) {
    const m = state.messages.find((x) => x.id === id);
    if (!m) return;
    state.selectedId = id;
    renderList();

    $("#reading-empty").classList.add("hidden");
    $("#reading-view").classList.add("open");
    $("#reading-pane").classList.add("mobile-open");

    $("#read-subject").textContent = m.subject || "(no subject)";
    $("#read-headers").innerHTML = `
      <div class="row"><dt>From</dt><dd>${escapeHtml(m.from || `${m.fromName} <${m.fromEmail}>`)}</dd></div>
      <div class="row"><dt>To</dt><dd>${escapeHtml(m.to || currentAddress())}</dd></div>
      <div class="row"><dt>Date</dt><dd>${escapeHtml(formatExact(m.date))} (${escapeHtml(formatRelative(m.date))})</dd></div>
      <div class="row"><dt>Subject</dt><dd>${escapeHtml(m.subject || "")}</dd></div>
    `;

    const extracts = $("#read-extracts");
    const pills = [];
    (m.codes || []).forEach((c) => {
      pills.push(
        `<button type="button" class="pill pill-otp" data-copy="${escapeAttr(c)}">OTP ${escapeHtml(c)} ⧉</button>`
      );
    });
    const linkItems =
      m.linkItems && m.linkItems.length
        ? m.linkItems
        : (m.links || []).map((u) => ({
            url: u,
            label:
              typeof Extractors !== "undefined" && Extractors.linkLabel
                ? Extractors.linkLabel(u)
                : "Open Access Link",
          }));
    linkItems.forEach((item) => {
      pills.push(
        `<button type="button" class="pill pill-link" data-open="${escapeAttr(item.url)}">${escapeHtml(item.label)} ↗</button>`
      );
    });
    extracts.innerHTML = pills.length
      ? pills.join("")
      : `<span style="color:var(--text-muted);font-size:0.85rem">No OTP or verification links detected</span>`;

    const html = sanitizeHtml(m.bodyHtml || "");
    const text = m.bodyText || stripTags(m.bodyHtml || m.body || "");
    const iframe = $("#body-html");
    iframe.style.height = "";
    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        const h = Math.max(
          doc.body ? doc.body.scrollHeight : 0,
          doc.documentElement ? doc.documentElement.scrollHeight : 0,
          240
        );
        iframe.style.height = `${h + 24}px`;
      } catch {
        iframe.style.height = "60vh";
      }
    };
    iframe.srcdoc = wrapEmailHtml(
      html ||
        `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(text)}</pre>`
    );
    if (!skipScroll) {
      const pane = $("#reading-view");
      if (pane) pane.scrollTop = 0;
    }
  }

  function stripTags(html) {
    const d = document.createElement("div");
    d.innerHTML = html;
    return d.textContent || "";
  }

  function wrapEmailHtml(inner) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base target="_blank" rel="noopener noreferrer"><style>
      html,body{margin:0;padding:0}
      body{margin:16px;font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111;background:#fff;word-break:break-word;overflow-wrap:anywhere}
      a{color:#0b57d0;-webkit-touch-callout:default} img{max-width:100%;height:auto}
      table{max-width:100%!important}
    </style></head><body>${inner}</body></html>`;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied to clipboard");
    } catch {
      toast("Copy failed", "error");
    }
  }

  async function deleteSelected() {
    const id = state.selectedId;
    if (!id) return;
    if (!confirm("Delete this message?")) return;

    if (isDemoMode()) {
      state.messages = state.messages.filter((m) => m.id !== id);
      clearReading();
      renderList();
      toast("Deleted");
      return;
    }

    try {
      await Api.deleteEmail(id);
      state.messages = state.messages.filter((m) => m.id !== id);
      clearReading();
      renderList();
      toast("Message deleted");
    } catch (err) {
      toast(err.message || "Delete failed", "error");
    }
  }

  function updateModeIndicator() {
    // Intentionally blank — demo/live & API URL are seller-only (config.js)
  }

  // ---------- Gate ----------
  function showApp() {
    $("#gate").hidden = true;
    $("#app").classList.add("visible");
  }

  function showGate() {
    $("#app").classList.remove("visible");
    $("#gate").hidden = false;
    $("#gate-password").value = "";
    $("#gate-error").textContent = "";
    setTimeout(() => $("#gate-password").focus(), 50);
  }

  function initGate() {
    if (Auth.isUnlocked()) {
      showApp();
      return true;
    }
    showGate();
    return false;
  }

  $("#gate-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pw = $("#gate-password").value;
    const card = $("#gate-card");
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    $("#gate-error").textContent = "";
    try {
      const ok = await Auth.unlock(pw);
      if (ok) {
        card.classList.remove("shake");
        $("#gate").classList.add("is-hiding");
        setTimeout(() => {
          showApp();
          $("#gate").classList.remove("is-hiding");
          loadInbox({ silent: true });
        }, 280);
      } else {
        $("#gate-error").textContent = "Incorrect password";
        card.classList.remove("shake");
        void card.offsetWidth;
        card.classList.add("shake");
      }
    } catch (err) {
      const msg = String(err.message || err || "Login failed");
      $("#gate-error").textContent = /unknown action/i.test(msg)
        ? "Server outdated — update Code.gs + Deploy New version"
        : msg;
      card.classList.remove("shake");
      void card.offsetWidth;
      card.classList.add("shake");
    } finally {      if (btn) btn.disabled = false;
    }
  });

  $("#btn-lock").addEventListener("click", () => {
    Auth.lock();
    clearReading();
    showGate();
  });

  // ---------- Identity bar ----------
  $("#prefix-input").value = Auth.getSettings().prefix || "";

  $("#btn-random").addEventListener("click", () => {
    $("#prefix-input").value = randomPrefix();
    Auth.saveSettings({ prefix: $("#prefix-input").value });
    toast(`Address: ${currentAddress()}`);
    if (isDemoMode()) loadInbox({ silent: true });
  });

  $("#btn-copy").addEventListener("click", () => {
    const addr = currentAddress();
    if (!addr) {
      toast("Enter a username first", "error");
      return;
    }
    copyText(addr);
  });

  $("#btn-refresh").addEventListener("click", () => loadInbox());

  $("#prefix-input").addEventListener("change", () => {
    Auth.saveSettings({ prefix: $("#prefix-input").value.trim() });
  });

  $("#domain-select").addEventListener("change", () => {
    if (isDemoMode()) loadInbox({ silent: true });
  });

  // ---------- List / reading interactions ----------
  $("#mail-list").addEventListener("click", (e) => {
    const copyBtn = e.target.closest("[data-copy]");
    if (copyBtn) {
      e.stopPropagation();
      copyText(copyBtn.getAttribute("data-copy"));
      return;
    }
    const openBtn = e.target.closest("[data-open]");
    if (openBtn) {
      e.stopPropagation();
      window.open(openBtn.getAttribute("data-open"), "_blank", "noopener,noreferrer");
      return;
    }
    const item = e.target.closest(".mail-item");
    if (item) openMessage(item.dataset.id);
  });

  $("#read-extracts").addEventListener("click", (e) => {
    const copyBtn = e.target.closest("[data-copy]");
    if (copyBtn) {
      copyText(copyBtn.getAttribute("data-copy"));
      return;
    }
    const openBtn = e.target.closest("[data-open]");
    if (openBtn) {
      window.open(openBtn.getAttribute("data-open"), "_blank", "noopener,noreferrer");
    }
  });

  $("#btn-copy-body").addEventListener("click", () => {
    const m = state.messages.find((x) => x.id === state.selectedId);
    if (!m) return;
    copyText(m.bodyText || stripTags(m.bodyHtml || "") || "");
  });

  $("#btn-delete").addEventListener("click", deleteSelected);
  $("#btn-mobile-back").addEventListener("click", () => {
    $("#reading-pane").classList.remove("mobile-open");
    clearReading();
  });

  // ---------- Themes + Customize ----------
  let settingsThemeSnapshot = null;

  const PAL_KEYS = ["primary", "secondary", "background", "surface"];

  function readPaletteFromFields() {
    const colors = PAL_KEYS.map((key) => {
      const raw = $(`#pal-${key}`)?.value || "";
      return Themes.normalizeHex(raw);
    });
    if (colors.every(Boolean)) return colors;
    return null;
  }

  function fillPaletteFields(palette) {
    const pal = palette || Themes.defaultCustomPalette();
    PAL_KEYS.forEach((key, i) => {
      const hex = Themes.normalizeHex(pal[i]) || Themes.DEFAULT_CUSTOM[i];
      const text = $(`#pal-${key}`);
      const swatch = $(`#pal-${key}-swatch`);
      if (text) text.value = hex;
      if (swatch) swatch.value = hex;
    });
    const bulk = $("#set-palette");
    if (bulk) bulk.value = pal.join(" ");
  }

  function livePreviewCustom() {
    if ($("#set-theme").value !== "custom") return;
    const palette = readPaletteFromFields();
    if (!palette) return;
    Themes.preview("custom", palette);
    const applyBtn = $("#btn-apply-palette");
    if (applyBtn) applyBtn.style.background = palette[0];
  }

  function syncThemeUI() {
    const id = Themes.getActiveId();
    $("#theme-select").value = id;
    if ($("#set-theme")) $("#set-theme").value = id;
    const wrap = $("#custom-palette-wrap");
    if (wrap) wrap.hidden = id !== "custom";
    if (id === "custom") fillPaletteFields(Themes.getSavedCustomPalette());
  }

  function updateLogoPreview(src) {
    const wrap = $("#logo-preview");
    const img = $("#logo-preview-img");
    if (!src) {
      wrap.hidden = true;
      img.removeAttribute("src");
      return;
    }
    img.src = src;
    wrap.hidden = false;
  }

  function readImageFile(file, maxBytes = 900_000) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) {
        reject(new Error("Choose an image file"));
        return;
      }
      if (file.size > maxBytes) {
        reject(new Error("Image too large (max ~900KB). Use a URL instead."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
  }

  function openSettings() {
    settingsThemeSnapshot = {
      id: Themes.getActiveId(),
      palette: Themes.getSavedCustomPalette(),
    };
    $("#set-brand").value = brandTitle();
    $("#set-logo").value = brandLogo().startsWith("data:") ? "" : brandLogo();
    $("#set-bg").value = backgroundUrl().startsWith("data:") ? "" : backgroundUrl();
    $("#set-admin-link").value = contactAdminLink();
    $("#set-password").value = "";
    $("#set-password-confirm").value = "";
    if ($("#set-owner-pin")) $("#set-owner-pin").value = "";
    $("#set-logo-file").value = "";
    $("#set-bg-file").value = "";
    updateLogoPreview(brandLogo());
    syncThemeUI();
    if ($("#set-theme").value === "custom") livePreviewCustom();
    $("#set-logo").dataset.dataUrl = brandLogo().startsWith("data:") ? brandLogo() : "";
    $("#set-bg").dataset.dataUrl = backgroundUrl().startsWith("data:") ? backgroundUrl() : "";
    $("#settings-modal").hidden = false;
  }

  function closeSettings({ revert = false } = {}) {
    if (revert && settingsThemeSnapshot) {
      Themes.preview(
        settingsThemeSnapshot.id,
        settingsThemeSnapshot.palette || undefined
      );
      $("#theme-select").value = settingsThemeSnapshot.id;
    }
    settingsThemeSnapshot = null;
    $("#settings-modal").hidden = true;
  }

  function resolveImageValue(urlInput, dataAttr) {
    const typed = urlInput.value.trim();
    if (typed) return typed;
    return dataAttr || "";
  }

  $("#btn-settings").addEventListener("click", openSettings);
  $("#btn-settings-cancel").addEventListener("click", () =>
    closeSettings({ revert: true })
  );
  $("#settings-modal").addEventListener("click", (e) => {
    if (e.target === $("#settings-modal")) closeSettings({ revert: true });
  });

  $("#set-theme").addEventListener("change", () => {
    const id = $("#set-theme").value;
    $("#custom-palette-wrap").hidden = id !== "custom";
    if (id === "custom") {
      fillPaletteFields(Themes.getSavedCustomPalette());
      livePreviewCustom();
    } else {
      Themes.preview(id);
    }
  });

  PAL_KEYS.forEach((key) => {
    const text = $(`#pal-${key}`);
    const swatch = $(`#pal-${key}-swatch`);
    if (!text || !swatch) return;

    text.addEventListener("input", () => {
      const hex = Themes.normalizeHex(text.value);
      if (hex) swatch.value = hex;
      livePreviewCustom();
    });
    text.addEventListener("blur", () => {
      const hex = Themes.normalizeHex(text.value);
      if (hex) {
        text.value = hex;
        swatch.value = hex;
      }
    });
    swatch.addEventListener("input", () => {
      text.value = swatch.value;
      livePreviewCustom();
    });
  });

  $("#set-palette").addEventListener("input", () => {
    const parsed = Themes.parsePaletteInput($("#set-palette").value);
    if (!parsed) return;
    fillPaletteFields(parsed);
    livePreviewCustom();
  });

  $("#btn-apply-palette").addEventListener("click", () => {
    $("#set-theme").value = "custom";
    $("#custom-palette-wrap").hidden = false;
    const palette = readPaletteFromFields();
    if (!palette) {
      toast("Enter 4 valid hex colors", "error");
      return;
    }
    Themes.preview("custom", palette);
    toast("Previewing — tap Save to keep");
  });

  $("#set-logo").addEventListener("input", () => {
    $("#set-logo").dataset.dataUrl = "";
    updateLogoPreview($("#set-logo").value.trim());
  });

  $("#set-bg").addEventListener("input", () => {
    $("#set-bg").dataset.dataUrl = "";
  });

  $("#btn-clear-logo").addEventListener("click", () => {
    $("#set-logo").value = "";
    $("#set-logo").dataset.dataUrl = "";
    $("#set-logo-file").value = "";
    updateLogoPreview("");
  });

  $("#btn-clear-bg").addEventListener("click", () => {
    $("#set-bg").value = "";
    $("#set-bg").dataset.dataUrl = "";
    $("#set-bg-file").value = "";
  });

  $("#set-logo-file").addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const data = await readImageFile(file);
      $("#set-logo").value = "";
      $("#set-logo").dataset.dataUrl = data;
      updateLogoPreview(data);
      toast("Logo ready — Save to apply");
    } catch (err) {
      toast(err.message || "Upload failed", "error");
    }
  });

  $("#set-bg-file").addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const data = await readImageFile(file, 1_400_000);
      $("#set-bg").value = "";
      $("#set-bg").dataset.dataUrl = data;
      toast("Background ready — Save to apply");
    } catch (err) {
      toast(err.message || "Upload failed", "error");
    }
  });

  $("#btn-settings-save").addEventListener("click", async () => {
    const themeId = $("#set-theme").value;
    if (themeId === "custom") {
      const parsed =
        readPaletteFromFields() ||
        Themes.parsePaletteInput($("#set-palette").value);
      if (!parsed) {
        toast("Need 4 valid hex colors", "error");
        return;
      }
      Themes.apply("custom", parsed);
    } else {
      Themes.apply(themeId);
    }

    const ownerPin = ($("#set-owner-pin")?.value || "").trim();
    const newPass = $("#set-password").value;
    const confirmPass = $("#set-password-confirm").value;
    if (newPass || confirmPass || ownerPin) {
      if (newPass.length < 4) {
        toast("Unlock password must be at least 4 characters", "error");
        return;
      }
      if (newPass !== confirmPass) {
        toast("Unlock passwords do not match", "error");
        return;
      }
      if (!ownerPin) {
        toast("Owner PIN required to change unlock password", "error");
        return;
      }
      try {
        await Auth.changePassword(ownerPin, newPass);
      } catch (err) {
        toast(err.message || "Could not change password", "error");
        return;
      }
    }

    const logo = resolveImageValue($("#set-logo"), $("#set-logo").dataset.dataUrl || "");
    const bg = resolveImageValue($("#set-bg"), $("#set-bg").dataset.dataUrl || "");

    const patch = {
      brandTitle: $("#set-brand").value.trim() || APP_CONFIG.brandTitle,
      brandLogo: logo,
      backgroundUrl: bg,
      contactAdminLink:
        $("#set-admin-link").value.trim() ||
        APP_CONFIG.contactAdminLink ||
        "#",
      prefix: $("#prefix-input").value.trim(),
    };

    Auth.saveSettings(patch);
    applyBranding();
    syncThemeUI();
    settingsThemeSnapshot = null;
    closeSettings({ revert: false });
    toast(newPass ? "Saved — password updated on all devices" : "Customization saved");
  });

  $("#theme-select").addEventListener("change", () => {
    const id = $("#theme-select").value;
    if (id === "custom") {
      Themes.apply("custom");
      openSettings();
      $("#set-theme").value = "custom";
      $("#custom-palette-wrap").hidden = false;
      fillPaletteFields(Themes.getSavedCustomPalette());
      livePreviewCustom();
    } else {
      Themes.apply(id);
      if ($("#set-theme")) $("#set-theme").value = id;
    }
    syncThemeUI();
  });

  // ---------- Boot ----------
  Themes.apply(Themes.getActiveId());
  syncThemeUI();
  applyBranding();
  populateDomains();

  if (initGate()) loadInbox({ silent: true });

  setInterval(() => {
    if (state.messages.length && Auth.isUnlocked()) renderList();
  }, 60000);
})();
