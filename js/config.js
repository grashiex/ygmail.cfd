/**
 * ═══════════════════════════════════════════════════════════
 *  SELLER CONFIG — ikaw lang mag-set ng backend + footer dito
 * ═══════════════════════════════════════════════════════════
 * Clients (Customize): logo, background, theme, password, brand, contact admin
 * Seller only: googleScriptUrl, demoMode, domains, footer*
 */
window.APP_CONFIG = {
  brandTitle: "ygmail.cfd",
  brandLogo: "",
  domains: ["ygmail.cfd"],
  defaultPrefix: "", // blank — user types username
  defaultPassword: "grashiex123",

  // Default contact admin (clients can change in Customize)
  contactAdminLabel: "Contact admin",
  contactAdminLink: "https://t.me/grashiex",

  // Footer — SELLER ONLY (not in Customize UI)
  footerName: "GRASHIEX",
  footerLink: "https://t.me/grashiex",
  footerYear: 2026,

  // Live backend — seller only
  googleScriptUrl:
    "https://script.google.com/macros/s/AKfycbzexhxvRZWE0kFlWGkI1z3fmv1qeceIbvYiYJNZQiRVONMaYbiue96wBuk-JpNCDUiuwA/exec",
  demoMode: false,

  sessionKey: "webmail_session_ok",
  settingsKey: "webmail_settings",
  themeKey: "webmail_theme",
  customPaletteKey: "webmail_custom_palette",
};
