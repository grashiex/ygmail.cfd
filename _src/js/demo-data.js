/**
 * Demo inbox messages for grashiex@ygmail.cfd
 */
window.DemoData = (() => {
  function atTimeToday(h, m) {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  function minutesAgo(mins) {
    return new Date(Date.now() - mins * 60 * 1000).toISOString();
  }

  function yesterday(h, m) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  function getMessages(toAddress) {
    const to = toAddress || "grashiex@ygmail.cfd";
    return [
      {
        id: "demo-1",
        from: "Telegram <login@telegram.org>",
        fromName: "Telegram",
        fromEmail: "login@telegram.org",
        to,
        subject: "Your login code: 49201",
        date: atTimeToday(1, 20),
        bodyText:
          "Hello,\n\nYour login code: 49201\n\nThis code will expire in 5 minutes. Do not share it with anyone.\n\n— Telegram",
        bodyHtml:
          "<p>Hello,</p><p>Your login code: <strong>49201</strong></p><p>This code will expire in 5 minutes. Do not share it with anyone.</p><p>— Telegram</p>",
      },
      {
        id: "demo-2",
        from: "Netflix <info@account.netflix.com>",
        fromName: "Netflix",
        fromEmail: "info@account.netflix.com",
        to,
        subject: "Confirm your account",
        date: minutesAgo(10),
        bodyText:
          "Hi there,\n\nPlease confirm your Netflix account by opening this link:\nhttps://www.netflix.com/confirm/account?token=demo-activate-9f3k2\n\nIf you did not request this, you can ignore this email.\n\n— Netflix Team",
        bodyHtml:
          '<p>Hi there,</p><p>Please confirm your Netflix account:</p><p><a href="https://www.netflix.com/confirm/account?token=demo-activate-9f3k2">Confirm your account</a></p><p>If you did not request this, you can ignore this email.</p><p>— Netflix Team</p>',
      },
      {
        id: "demo-3",
        from: "Google <no-reply@accounts.google.com>",
        fromName: "Google",
        fromEmail: "no-reply@accounts.google.com",
        to,
        subject: "Security code: 829104",
        date: yesterday(23, 45),
        bodyText:
          "Google Verification\n\nSecurity code: 829104\n\nUse this code to complete your sign-in. It expires soon.\n\nIf you didn't request this code, change your password immediately.",
        bodyHtml:
          "<p><strong>Google Verification</strong></p><p>Security code: <strong>829104</strong></p><p>Use this code to complete your sign-in. It expires soon.</p>",
      },
      {
        id: "demo-4",
        from: "Steam Support <noreply@steampowered.com>",
        fromName: "Steam Guard",
        fromEmail: "noreply@steampowered.com",
        to,
        subject: "Access code: X84K2",
        date: yesterday(21, 15),
        bodyText:
          "Dear Steam user,\n\nAccess code: X84K2\n\nEnter this Steam Guard code to continue signing in. Never share this code.\n\n— Steam Support",
        bodyHtml:
          "<p>Dear Steam user,</p><p>Access code: <strong>X84K2</strong></p><p>Enter this Steam Guard code to continue signing in. Never share this code.</p><p>— Steam Support</p>",
      },
    ];
  }

  return { getMessages };
})();
