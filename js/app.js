/**
 * Main application — Private Webmail & OTP Extractor
 */
(() => {
  const state = {
    messages: [],
    selectedId: null,
    bodyTab: "html",
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
    const prefix = ($("#prefix-input").value || "").trim() || APP_CONFIG.defaultPrefix;
    const domain = $("#domain-select").value || domains()[0];
    return `${prefix}@${domain}`;
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
  }

  function applyFooter() {
    const name = prefs().footerName || APP_CONFIG.footerName || "GRASHIEX";
    const link = prefs().footerLink || APP_CONFIG.footerLink || "#";
    const year = prefs().footerYear || APP_CONFIG.footerYear || new Date().getFullYear();
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
    return tpl.innerHTML;
  }

  // ---------- Random prefix ----------
  const ADJECTIVES = [
    "swift", "quiet", "amber", "coral", "nova", "lunar", "pixel", "cedar",
    "frost", "maple", "orbit", "velvet", "zinc", "ember", "jade",
  ];
  const NOUNS = [
    "fox", "kite", "wave", "spark", "lane", "ridge", "bloom", "drift",
    "harbor", "quill", "raven", "stone", "tide", "grove", "pulse",
  ];

  function randomPrefix() {
    const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(10 + Math.random() * 89);
    return `${a}${n}${num}`;
  }

  // ---------- Inbox load ----------
  async function loadInbox({ silent } = {}) {
    const icon = $("#refresh-icon");
    icon.style.display = "inline-block";
    icon.style.animation = "spin 0.7s linear infinite";

    try {
      let messages;
      if (isDemoMode()) {
        messages = DemoData.getMessages(currentAddress());
      } else {
        messages = await Api.listEmails(currentAddress());
      }
      state.messages = messages.map((m) => {
        const extracted =
          typeof Extractors !== "undefined" && Extractors.analyze
            ? Extractors.analyze(m)
            : { codes: [], links: [] };
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
      list.innerHTML = `
        <li class="empty-state">
          <h3>No messages</h3>
          <p>Mail sent to <code>${escapeHtml(currentAddress())}</code> will appear here.</p>
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
        const links = (m.links || []).length
          ? `<button type="button" class="pill pill-link" data-open="${escapeAttr(m.links[0])}">Open Link ↗</button>`
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
    (m.links || []).forEach((u, i) => {
      pills.push(
        `<button type="button" class="pill pill-link" data-open="${escapeAttr(u)}">${i === 0 ? "Open Link" : "Link"} ↗</button>`
      );
    });
    extracts.innerHTML = pills.length
      ? pills.join("")
      : `<span style="color:var(--text-muted);font-size:0.85rem">No OTP or verification links detected</span>`;

    const html = sanitizeHtml(m.bodyHtml || "");
    const text = m.bodyText || stripTags(m.bodyHtml || m.body || "");
    const iframe = $("#body-html");
    iframe.srcdoc = wrapEmailHtml(html || `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(text)}</pre>`);
    $("#body-text").textContent = text;

    setBodyTab(state.bodyTab);
    if (!skipScroll) $("#reading-view").scrollTop = 0;
  }

  function stripTags(html) {
    const d = document.createElement("div");
    d.innerHTML = html;
    return d.textContent || "";
  }

  function wrapEmailHtml(inner) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{margin:16px;font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#111;background:#fff;word-break:break-word}
      a{color:#0b57d0} img{max-width:100%;height:auto}
    </style></head><body>${inner}</body></html>`;
  }

  function setBodyTab(tab) {
    state.bodyTab = tab;
    $("#tab-html").classList.toggle("active", tab === "html");
    $("#tab-text").classList.toggle("active", tab === "text");
    $("#body-html").classList.toggle("hidden", tab !== "html");
    $("#body-text").classList.toggle("hidden", tab !== "text");
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

  $("#gate-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const pw = $("#gate-password").value;
    const card = $("#gate-card");
    if (Auth.unlock(pw)) {
      $("#gate-error").textContent = "";
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
  });

  $("#btn-lock").addEventListener("click", () => {
    Auth.lock();
    clearReading();
    showGate();
  });

  // ---------- Identity bar ----------
  $("#prefix-input").value =
    Auth.getSettings().prefix || APP_CONFIG.defaultPrefix;

  $("#btn-random").addEventListener("click", () => {
    $("#prefix-input").value = randomPrefix();
    Auth.saveSettings({ prefix: $("#prefix-input").value });
    toast(`Address: ${currentAddress()}`);
    if (isDemoMode()) loadInbox({ silent: true });
  });

  $("#btn-copy").addEventListener("click", () => {
    copyText(currentAddress());
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
  });

  $("#tab-html").addEventListener("click", () => setBodyTab("html"));
  $("#tab-text").addEventListener("click", () => setBodyTab("text"));

  // ---------- Themes + Customize ----------
  function syncThemeUI() {
    const id = Themes.getActiveId();
    $("#theme-select").value = id;
    if ($("#set-theme")) $("#set-theme").value = id;
    const wrap = $("#custom-palette-wrap");
    if (wrap) wrap.hidden = id !== "custom";
    if (id === "custom") {
      const pal = Themes.getSavedCustomPalette();
      if (pal) $("#set-palette").value = pal.join(" ");
    }
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
    $("#set-brand").value = brandTitle();
    $("#set-logo").value = brandLogo().startsWith("data:") ? "" : brandLogo();
    $("#set-bg").value = backgroundUrl().startsWith("data:") ? "" : backgroundUrl();
    $("#set-footer-link").value =
      prefs().footerLink || APP_CONFIG.footerLink || "";
    $("#set-password").value = "";
    $("#set-password-confirm").value = "";
    $("#set-logo-file").value = "";
    $("#set-bg-file").value = "";
    updateLogoPreview(brandLogo());
    syncThemeUI();
    $("#set-logo").dataset.dataUrl = brandLogo().startsWith("data:") ? brandLogo() : "";
    $("#set-bg").dataset.dataUrl = backgroundUrl().startsWith("data:") ? backgroundUrl() : "";
    $("#settings-modal").hidden = false;
  }

  function closeSettings() {
    $("#settings-modal").hidden = true;
  }

  function resolveImageValue(urlInput, dataAttr) {
    const typed = urlInput.value.trim();
    if (typed) return typed;
    return dataAttr || "";
  }

  $("#btn-settings").addEventListener("click", openSettings);
  $("#btn-settings-cancel").addEventListener("click", closeSettings);
  $("#settings-modal").addEventListener("click", (e) => {
    if (e.target === $("#settings-modal")) closeSettings();
  });

  $("#set-theme").addEventListener("change", () => {
    $("#custom-palette-wrap").hidden = $("#set-theme").value !== "custom";
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

  $("#btn-settings-save").addEventListener("click", () => {
    const themeId = $("#set-theme").value;
    if (themeId === "custom") {
      const parsed = Themes.parsePaletteInput($("#set-palette").value);
      if (!parsed) {
        toast("Need 4 hex codes or a Color Hunt link", "error");
        return;
      }
      Themes.apply("custom", parsed);
    } else {
      Themes.apply(themeId);
    }

    const newPass = $("#set-password").value;
    const confirmPass = $("#set-password-confirm").value;
    if (newPass || confirmPass) {
      if (newPass.length < 4) {
        toast("Password must be at least 4 characters", "error");
        return;
      }
      if (newPass !== confirmPass) {
        toast("Passwords do not match", "error");
        return;
      }
    }

    const logo = resolveImageValue($("#set-logo"), $("#set-logo").dataset.dataUrl || "");
    const bg = resolveImageValue($("#set-bg"), $("#set-bg").dataset.dataUrl || "");

    const patch = {
      brandTitle: $("#set-brand").value.trim() || APP_CONFIG.brandTitle,
      brandLogo: logo,
      backgroundUrl: bg,
      footerLink:
        $("#set-footer-link").value.trim() ||
        APP_CONFIG.footerLink ||
        "#",
      prefix: $("#prefix-input").value.trim(),
    };
    if (newPass) patch.password = newPass;

    Auth.saveSettings(patch);
    applyBranding();
    syncThemeUI();
    closeSettings();
    toast("Customization saved");
  });

  $("#theme-select").addEventListener("change", () => {
    const id = $("#theme-select").value;
    if (id === "custom") {
      Themes.apply("custom");
      openSettings();
      $("#set-theme").value = "custom";
      $("#custom-palette-wrap").hidden = false;
      $("#set-palette").focus();
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
