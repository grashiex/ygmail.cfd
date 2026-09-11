/**
 * Password gate + client prefs in localStorage.
 * Seller secrets (googleScriptUrl, demoMode) never stored / always stripped.
 */
window.Auth = (() => {
  const BLOCKED = [
    "googleScriptUrl",
    "apiUrl",
    "demoMode",
    "footerName",
    "footerLink",
    "footerYear",
  ];

  function isUnlocked() {
    return localStorage.getItem(APP_CONFIG.sessionKey) === "1";
  }

  function getPassword() {
    const s = getSettings();
    const custom = String(s.password || "").trim();
    if (custom) return custom;
    return String(APP_CONFIG.defaultPassword || "").trim();
  }

  function unlock(password) {
    if (String(password || "").trim() === getPassword()) {
      localStorage.setItem(APP_CONFIG.sessionKey, "1");
      return true;
    }
    return false;
  }

  function lock() {
    localStorage.removeItem(APP_CONFIG.sessionKey);
  }

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem(APP_CONFIG.settingsKey) || "{}");
    } catch {
      return {};
    }
  }

  function saveSettings(partial) {
    const next = { ...getSettings(), ...partial };
    BLOCKED.forEach((k) => delete next[k]);
    localStorage.setItem(APP_CONFIG.settingsKey, JSON.stringify(next));
    return next;
  }

  function scrubLegacySecrets() {
    const s = getSettings();
    let dirty = false;
    BLOCKED.forEach((k) => {
      if (k in s) {
        delete s[k];
        dirty = true;
      }
    });
    ["footerName", "footerLink", "footerYear"].forEach((k) => {
      if (k in s) {
        delete s[k];
        dirty = true;
      }
    });
    if (dirty) {
      localStorage.setItem(APP_CONFIG.settingsKey, JSON.stringify(s));
    }
  }

  scrubLegacySecrets();

  return { isUnlocked, unlock, lock, getSettings, saveSettings, getPassword };
})();
