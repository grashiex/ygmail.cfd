/**
 * OTP / verification-code and activation-link extractors.
 * Strict: only clearly labeled codes — no random number/word noise.
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
    /(?:unsubscribe|privacy|terms|help\.|support\.|static\.|cdn\.|fonts\.|w3\.org|schema\.org)/i;

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
      .replace(/\s+/g, " ")
      .trim();
  }

  function isValidCode(code) {
    if (!code) return false;
    const c = String(code).trim();
    if (!/^[A-Z0-9]{4,8}$/i.test(c)) return false;
    if (/^(19|20)\d{2}$/.test(c)) return false; // years
    if (/^0+$/.test(c)) return false; // 000000
    if (WORD_BLOCKLIST.has(c.toUpperCase())) return false;
    // Prefer mostly-digit OTPs, or alphanumeric like Steam (must have a digit)
    if (/^[A-Za-z]+$/.test(c)) return false; // pure words like Canva/Enter
    return true;
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

    // 1) Subject wins (e.g. "Your Canva code is 885460")
    const subjectHits = [];
    if (subject) {
      const sm = subject.match(SUBJECT_CODE_RE);
      if (sm) {
        const code = sm[1] || sm[2];
        if (isValidCode(code)) subjectHits.push(code);
      }
      subjectHits.push(...extractFromLabeled(subject));
    }

    // 2) Body labeled only (no bare digit sweep)
    const bodyHits = extractFromLabeled(body);

    const ordered = unique([...subjectHits, ...bodyHits]);
    // Exact: one best OTP when subject has it
    if (subjectHits.length) return unique(subjectHits).slice(0, 1);
    return ordered.slice(0, 1);
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
        if (/verify|confirm|activate|auth|login|token|magic|reset/i.test(u))
          score += 3;
        if (/click|action|account/i.test(u)) score += 1;
        return { u, score };
      })
      .sort((a, b) => b.score - a.score);

    return scored.map((s) => s.u).slice(0, 2);
  }

  function analyze(email) {
    return {
      codes: extractCodes(email),
      links: extractLinks(
        [email.bodyHtml || "", email.bodyText || "", email.body || ""].join(
          "\n"
        )
      ),
    };
  }

  return { extractCodes, extractLinks, analyze };
})();
