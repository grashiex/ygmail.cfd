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
    if (/activate|activation|create|signup|sign-?up|register|welcome|finish/i.test(u))
      return "Open Access Link";
    if (/verify|confirm|confirmation/i.test(u)) return "Open Verify Link";
    if (/reset|recover|password/i.test(u)) return "Open Reset Link";
    if (/login|sign-?in/i.test(u)) return "Open Login Link";
    return "Open Access Link";
  }

  function decodeEntities(s) {
    return String(s || "")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">");
  }

  function scoreAccessLink(url, anchorText) {
    const u = decodeEntities(url).toLowerCase();
    const t = String(anchorText || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    let score = 0;

    // Anchor text is the strongest signal (Netflix "Create Account", etc.)
    if (
      /create\s*account|get\s*started|activate|verify|confirm|continue|finish|sign\s*up|join|open\s*netflix|start\s*watching/i.test(
        t
      )
    )
      score += 20;
    if (/log\s*in|sign\s*in|help|privacy|terms|unsubscribe|learn\s*more/i.test(t))
      score -= 15;

    // Path / query signals for real one-time access links
    if (
      /\/(confirm|verify|activate|activation|signup|sign-up|register|create|welcome|email-verify|account\/confirm)/i.test(
        u
      )
    )
      score += 12;
    if (/[?&](token|code|key|hash|confirm|verify|activation|invite)=/i.test(u))
      score += 12;
    if (u.includes("?") && u.length > 80) score += 4;

    // Brand action hosts
    if (/netflix\.com/i.test(u) && /account|signup|loginhelp|password/i.test(u))
      score += 3;

    // Penalize generic login / homepage / tracking
    if (/\/(login|signin|sign-in)\/?(\?|#|$)/i.test(u)) score -= 12;
    if (/\/\/(www\.)?netflix\.com\/?(\?|#|$)/i.test(u)) score -= 8;
    if (/trail\.|tracking|utm_source|pixel|click\.|email-public/i.test(u))
      score -= 14;
    if (
      /unsubscribe|privacy|terms|help\.|support\./i.test(u) &&
      !/token|confirm|verify|activate/i.test(u)
    )
      score -= 10;

    return score;
  }

  function extractLinks(text) {
    if (!text) return [];
    const plain = String(text);
    const candidates = [];

    // Prefer <a href> with visible label
    const aRe =
      /<a\b[^>]*href\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let am;
    while ((am = aRe.exec(plain)) !== null) {
      candidates.push({
        url: decodeEntities(am[1]).replace(/[.,;:!?)]+$/, ""),
        anchor: am[2],
      });
    }

    // Also bare hrefs (no duplicate)
    const hrefRe = /href\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
    let hm;
    while ((hm = hrefRe.exec(plain)) !== null) {
      const url = decodeEntities(hm[1]).replace(/[.,;:!?)]+$/, "");
      if (!candidates.some((c) => c.url === url)) {
        candidates.push({ url, anchor: "" });
      }
    }

    const scored = candidates
      .filter((c) => c.url && !SKIP_HOSTS.test(c.url))
      .map((c) => {
        const score = scoreAccessLink(c.url, c.anchor);
        return { url: c.url, label: linkLabel(c.url), score, anchor: c.anchor };
      })
      .filter((s) => s.score >= 8) // only strong access/verify links
      .sort((a, b) => b.score - a.score);

    // If nothing strong, fall back to best positive score (still skip login-only)
    if (!scored.length) {
      const weak = candidates
        .filter((c) => c.url && !SKIP_HOSTS.test(c.url))
        .map((c) => ({
          url: c.url,
          label: linkLabel(c.url),
          score: scoreAccessLink(c.url, c.anchor),
        }))
        .filter((s) => s.score > 0 && !/\/(login|signin)\/?(\?|#|$)/i.test(s.url))
        .sort((a, b) => b.score - a.score);
      return weak.slice(0, 1);
    }

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
