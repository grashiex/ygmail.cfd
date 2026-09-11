/**
 * OTP / verification-code and activation-link extractors.
 */
window.Extractors = (() => {
  const CODE_PATTERNS = [
    /(?:(?:login|security|verification|access|otp|one[-\s]?time|auth(?:entication)?|confirm(?:ation)?)\s*(?:code|pin|password)?\s*[:=]?\s*)([A-Z0-9]{4,8})\b/gi,
    /\b(?:code|pin)\s*[:=]\s*([A-Z0-9]{4,8})\b/gi,
    /\b(\d{4,8})\b(?=\s*(?:is your|to (?:verify|confirm|login|sign))/gi),
    /\b([0-9]{4,8})\b/g,
    /\b([A-Z0-9]{5,8})\b(?=.*(?:steam|guard|code))/gi,
  ];

  const URL_PATTERN =
    /https?:\/\/[^\s<>"')\]]+/gi;

  const SKIP_HOSTS = /(?:unsubscribe|privacy|terms|help\.|support\.|static\.|cdn\.|fonts\.|w3\.org|schema\.org)/i;

  function unique(arr) {
    return [...new Set(arr.filter(Boolean))];
  }

  function extractCodes(text) {
    if (!text) return [];
    const found = [];
    const plain = String(text).replace(/<[^>]+>/g, " ");

    for (const re of CODE_PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(plain)) !== null) {
        const code = m[1];
        if (!code) continue;
        // Prefer digit-heavy OTPs; allow alphanumeric like Steam Guard
        if (/^\d{4,8}$/.test(code) || /^[A-Z0-9]{4,8}$/i.test(code)) {
          // Skip years / common false positives
          if (/^(19|20)\d{2}$/.test(code)) continue;
          found.push(code.toUpperCase() === code && /[A-Z]/.test(code) ? code : code);
        }
      }
    }

    // Prefer explicit labeled matches: re-scan with first patterns only for ordering
    const labeled = [];
    const labeledRe =
      /(?:login|security|verification|access|otp|one[-\s]?time|guard|auth(?:entication)?|confirm(?:ation)?)\s*(?:code|pin)?\s*[:=]?\s*([A-Z0-9]{4,8})\b/gi;
    let lm;
    while ((lm = labeledRe.exec(plain)) !== null) labeled.push(lm[1]);

    const ordered = unique([...labeled, ...found]);
    return ordered.slice(0, 5);
  }

  function extractLinks(text) {
    if (!text) return [];
    const plain = String(text);
    const hrefs = [];
    const hrefRe = /href\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
    let hm;
    while ((hm = hrefRe.exec(plain)) !== null) hrefs.push(hm[1]);

    const raw = plain.replace(/<[^>]+>/g, " ").match(URL_PATTERN) || [];
    const all = unique([...hrefs, ...raw])
      .map((u) => u.replace(/[.,;:!?)]+$/, ""))
      .filter((u) => !SKIP_HOSTS.test(u));

    // Prefer verify/confirm/activate style links
    const scored = all
      .map((u) => {
        let score = 0;
        if (/verify|confirm|activate|auth|login|token|magic|reset/i.test(u))
          score += 3;
        if (/click|action|account/i.test(u)) score += 1;
        return { u, score };
      })
      .sort((a, b) => b.score - a.score);

    return scored.map((s) => s.u).slice(0, 4);
  }

  function analyze(email) {
    const haystack = [
      email.subject || "",
      email.bodyText || "",
      email.bodyHtml || "",
      email.body || "",
    ].join("\n");
    return {
      codes: extractCodes(haystack),
      links: extractLinks(haystack),
    };
  }

  return { extractCodes, extractLinks, analyze };
})();
