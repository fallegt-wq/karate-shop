// server/utils/email.js

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatISK(value) {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat("is-IS", {
      style: "currency",
      currency: "ISK",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} kr.`;
  }
}

function buildOrderReceiptEmail(order) {
  const clubSlug = String(order?.club_slug || "").trim();
  const buyerEmail = String(order?.buyer_email || "").trim();
  const body = order?.body || {};
  const buyerName = String(body?.buyer?.name || "").trim();
  const items = Array.isArray(body?.items) ? body.items : [];
  const registrations = Array.isArray(body?.registrations) ? body.registrations : [];

  const lines = items.map((item) => {
    const reg = registrations.find(
      (r) => String(r?.cartId || "") === String(item?.cartId || "")
    );

    const itemName = String(item?.name || "Námskeið");
    const athleteName = String(reg?.athleteName || "").trim();
    const price = formatISK(item?.price || 0);

    return {
      itemName,
      athleteName,
      price,
    };
  });

  const subject =
    clubSlug
      ? `Staðfesting á skráningu - ${clubSlug}`
      : "Staðfesting á skráningu";

  const greeting = buyerName ? `Sæl/l ${buyerName},` : "Sæl/l,";

  const text = [
    greeting,
    "",
    "Greiðsla hefur verið staðfest og skráning móttekin.",
    "",
    `Pöntunarnúmer: ${order?.order_id || ""}`,
    `Netfang kaupanda: ${buyerEmail}`,
    `Upphæð: ${formatISK(order?.total_amount || 0)}`,
    "",
    "Skráningar:",
    ...lines.map((line) =>
      line.athleteName
        ? `- ${line.itemName} (${line.athleteName}) - ${line.price}`
        : `- ${line.itemName} - ${line.price}`
    ),
    "",
    "Takk fyrir skráninguna.",
  ].join("\n");

  const htmlItems = lines.length
    ? `
      <ul style="padding-left:20px;margin:12px 0;">
        ${lines
          .map(
            (line) => `
              <li style="margin:8px 0;">
                <strong>${escapeHtml(line.itemName)}</strong>
                ${
                  line.athleteName
                    ? ` - ${escapeHtml(line.athleteName)}`
                    : ""
                }
                - ${escapeHtml(line.price)}
              </li>
            `
          )
          .join("")}
      </ul>
    `
    : `<p>Engar línur fundust í pöntun.</p>`;

  const html = `
    <div style="font-family:Arial,sans-serif;color:#18181b;line-height:1.5;">
      <p>${escapeHtml(greeting)}</p>
      <p>Greiðsla hefur verið staðfest og skráning móttekin.</p>

      <div style="background:#f4f4f5;border-radius:12px;padding:16px;margin:16px 0;">
        <div><strong>Pöntunarnúmer:</strong> ${escapeHtml(order?.order_id || "")}</div>
        <div><strong>Netfang kaupanda:</strong> ${escapeHtml(buyerEmail)}</div>
        <div><strong>Upphæð:</strong> ${escapeHtml(formatISK(order?.total_amount || 0))}</div>
      </div>

      <h3 style="margin:16px 0 8px;">Skráningar</h3>
      ${htmlItems}

      <p style="margin-top:20px;">Takk fyrir skráninguna.</p>
    </div>
  `;

  return { subject, text, html };
}

export async function sendOrderReceiptEmail(order) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const fromEmail = String(process.env.EMAIL_FROM || "").trim();
  const buyerEmail = String(order?.buyer_email || "").trim();

  if (!buyerEmail || !buyerEmail.includes("@")) {
    return {
      ok: false,
      skipped: true,
      reason: "missing_buyer_email",
    };
  }

  if (!apiKey || !fromEmail) {
    console.log(
      "[EMAIL] skipped: RESEND_API_KEY or EMAIL_FROM missing"
    );
    return {
      ok: false,
      skipped: true,
      reason: "email_not_configured",
    };
  }

  const { subject, text, html } = buildOrderReceiptEmail(order);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [buyerEmail],
      subject,
      text,
      html,
    }),
  });

  const payloadText = await response.text();
  let payload = null;

  try {
    payload = payloadText ? JSON.parse(payloadText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      `Email send failed (${response.status})`;

    throw new Error(message);
  }

  return {
    ok: true,
    provider: "resend",
    messageId: payload?.id || null,
  };
}
