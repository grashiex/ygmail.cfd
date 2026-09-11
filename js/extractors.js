/**
 * OTP / verification-code and activation-link extractors.
 * Strict OTPs + labeled access links (not random website URLs).
 */
window.Extractors = (() => {
  const LABELED_CODE_RES = [
    /(?:your\s+)?(?:canva|google|telegram|steam|discord|apple|microsoft|meta|facebook|instagram|twitter|x|amazon|netflix|spotify|github|login|security|verification|access|otp|one[-\s]?time|guard|auth(?:entication)?|confirm(?:ation)?|sign[-\s]?in)?\s*(?:login\s+)?(?:code|pin|passcode|otp)\s*(?:is|=|:)?\s*([A-Z0-9]{4,8})\b/gi,
    /\b(?:code|pin|passcode|otp)\s*[:=]\s*([A-Z0-9]{4,8})\b/gi,
    /\b([A-Z0-9]{4,8})\b\s+is\s+your\s+(?:code|pin|otp|passcode)\b/gi,
  ];

  const SUBJECT_CODE_RE =
    /(?:code|pin|otp|passcode)\s*(?:is|=|:)?\s*([A-Z0-9]{4,8})\b|\b([A-Z0-9]{4,8})\b\s+is\s+your/i;

  const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/gi;
  const SKIP_HOSTS =
    /(?:unsubscribe|privacy|terms|help\.|support\.|static\.|cdn\.|fonts\.|w3\.org|schema\.org|trail\.|tracking|pixel)/i;

  const WORD_BLOCKLIST = new Set(
    [
      "canva",
      "enter",
      "code",
      "login",
      "email",
      "click",
      "here",
      "http",
      "https",
      "www",
      "null",
      "true",
      "false",
      "html",
      "body",
      "span",
      "div",
      "from",
      "this",
      "that",
      "with",
      "your",
      "account",
      "verify",
      "finish",
      "signing",
      "netflix",
      "create",
    ].map((w) => w.toUpperCase())
  );

  function unique(arr) {
    return [...new Set(arr.filter(Boolean))];
  }

  function stripHtml(text) {
    return String(text || "")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isValidCode(code) {
    if (!code) return false;
    const c = String(code).trim();
    if (!/^[A-Z0-9]{4,8}$/i.test(c)) return false;
    if (/^(19|20)\d{2}$/.test(c)) return false;
    if (/^0+$/.test(c)) return false;
    if (WORD_BLOCKLIST.has(c.toUpperCase())) return false;
    if (/^[A-Za-z]+$/.test(c)) return false;
    // Reject hex-looking tracking fragments (e.g. RF4MoG77 mixed random) unless labeled digit OTP
    // Allow alphanumeric Steam-style only if has both letters and digits and length 5-8
    if (/[A-Za-z]/.test(c) && /\d/.test(c) && !/^\d+$/.test(c)) {
      // Steam-like: mostly fine if short; reject if looks like random id (many mixed case without "code" context handled by labeled only)
      return true;
    }
    return /^\d{4,8}$/.test(c);
  }

  function extractFromLabeled(plain) {
    const found = [];
    for (const re of LABELED_CODE_RES) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(plain)) !== null) {
        const code = m[1] || m[2];
        if (isValidCode(code)) found.push(code);
      }
    }
    return found;
  }

  function extractCodes(emailOrText) {
    const subject =
      typeof emailOrText === "object"
        ? stripHtml(emailOrText.subject || "")
        : "";
    const body =
      typeof emailOrText === "object"
        ? stripHtml(
            [
              emailOrText.bodyText || "",
              emailOrText.bodyHtml || "",
              emailOrText.body || "",
            ].join("\n")
          )
        : stripHtml(emailOrText);

    const subjectHits = [];
    if (subject) {
      // Subject with explicit "code is XXX" — prefer pure digits
      const sm = subject.match(SUBJECT_CODE_RE);
      if (sm) {
        const code = sm[1] || sm[2];
        if (isValidCode(code)) subjectHits.push(code);
      }
      subjectHits.push(...extractFromLabeled(subject));
    }

    const bodyHits = extractFromLabeled(body);
    const ordered = unique([...subjectHits, ...bodyHits]);

    // Prefer digit OTPs over alphanumeric when both exist
    const digits = ordered.filter((c) => /^\d{4,8}$/.test(c));
    if (digits.length) return digits.slice(0, 1);
    if (subjectHits.length) return unique(subjectHits).slice(0, 1);
    return ordered.slice(0, 1);
  }

  function linkLabel(url) {
    const u = String(url).toLowerCase();
    if (/activate|activation|create.?account|signup|sign-?up|register/i.test(u))
      return "Open Access Link";
    if (/verify|confirm|confirmation/i.test(u)) return "Open Verify Link";
    if (/reset|recover|password/i.test(u)) return "Open Reset Link";
    if (/login|sign-?in|auth|magic|token/i.test(u)) return "Open Login Link";
    if (/netflix|account/i.test(u)) return "Open Access Link";
    return "Open Access Link";
  }

  function extractLinks(text) {
    if (!text) return [];
    const plain = String(text);
    const hrefs = [];
    const hrefRe = /href\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
    let hm;
    while ((hm = hrefRe.exec(plain)) !== null) hrefs.push(hm[1]);

    const raw = stripHtml(plain).match(URL_PATTERN) || [];
    const all = unique([...hrefs, ...raw])
      .map((u) => u.replace(/[.,;:!?)]+$/, ""))
      .filter((u) => !SKIP_HOSTS.test(u));

    const scored = all
      .map((u) => {
        let score = 0;
        if (/verify|confirm|activate|activation|signup|sign-?up|register|create/i.test(u))
          score += 5;
        if (/auth|login|token|magic|reset|account/i.test(u)) score += 3;
        if (/netflix\.com|accounts\.|click|action/i.test(u)) score += 2;
        // Prefer https action links over tracking
        if (/trail\.|track|utm_/i.test(u)) score -= 3;
        return { url: u, label: linkLabel(u), score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    // One best access link only — less confusion
    return scored.slice(0, 1);
  }

  function analyze(email) {
    const links = extractLinks(
      [email.bodyHtml || "", email.bodyText || "", email.body || ""].join("\n")
    );
    return {
      codes: extractCodes(email),
      links: links.map((l) => l.url),
      linkItems: links,
    };
  }

  return { extractCodes, extractLinks, analyze, linkLabel };
})();
