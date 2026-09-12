/**
 * Password gate + client prefs.
 * Site password lives on the server (Apps Script) so all devices share one password.
 * localStorage only keeps unlocked session + UI prefs — never the password.
 */
window.Auth = (() => {
  const BLOCKED = [
    "googleScriptUrl",
    "apiUrl",
    "demoMode",
    "footerName",
    "footerLink",
    "footerYear",
    "password",
  ];

  function isUnlocked() {
    return localStorage.getItem(APP_CONFIG.sessionKey) === "1";
  }

  function markUnlocked(sessionEpoch) {
    localStorage.setItem(APP_CONFIG.sessionKey, "1");
    if (sessionEpoch != null) {
      localStorage.setItem(APP_CONFIG.sessionKey + "_epoch", String(sessionEpoch));
    }
  }

  function getSessionEpoch() {
    return localStorage.getItem(APP_CONFIG.sessionKey + "_epoch") || "";
  }

  function checkSessionEpoch(serverEpoch) {
    if (serverEpoch == null || serverEpoch === "") return true;
    const local = getSessionEpoch();
    if (!local) return true;
    return String(local) === String(serverEpoch);
  }

  /** Local-only unlock (demo mode). */
  function unlockLocal(password) {
    const expected = String(APP_CONFIG.defaultPassword || "").trim();
    if (String(password || "").trim() === expected) {
      markUnlocked("demo");
      return true;
    }
    return false;
  }

  async function unlock(password) {
    if (APP_CONFIG.demoMode === true) {
      return unlockLocal(password);
    }
    if (typeof Api === "undefined" || !Api.verifyPassword) {
      return unlockLocal(password);
    }
    try {
      const data = await Api.verifyPassword(password);
      if (data && data.ok) {
        markUnlocked(data.sessionEpoch);
        return true;
      }
      return false;
    } catch (err) {
      const msg = String(err.message || err || "");
      // Old Apps Script deploy — allow config defaultPassword so seller isn't locked out
      if (/unknown action/i.test(msg)) {
        return unlockLocal(password);
      }
      throw err;
    }
  }

  async function changePassword(currentPassword, newPassword) {
    if (APP_CONFIG.demoMode === true) {
      throw new Error("Password change is disabled in demo mode");
    }
    if (typeof Api === "undefined" || !Api.changePassword) {
      throw new Error("Password API unavailable");
    }
    const data = await Api.changePassword(currentPassword, newPassword);
    if (data && data.sessionEpoch != null) {
      markUnlocked(data.sessionEpoch);
    }
    return data;
  }

  function lock() {
    localStorage.removeItem(APP_CONFIG.sessionKey);
    localStorage.removeItem(APP_CONFIG.sessionKey + "_epoch");
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
    if (dirty) {
      localStorage.setItem(APP_CONFIG.settingsKey, JSON.stringify(s));
    }
  }

  scrubLegacySecrets();

  return {
    isUnlocked,
    unlock,
    unlockLocal,
    changePassword,
    lock,
    getSettings,
    saveSettings,
    checkSessionEpoch,
    getSessionEpoch,
  };
})();
