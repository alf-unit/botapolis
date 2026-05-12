import "server-only"

/* ----------------------------------------------------------------------------
   Resend transactional email helper
   ----------------------------------------------------------------------------
   Single send-an-email entry point used by /api/newsletter (welcome /
   subscription receipt) and /api/contact (editorial inbox notification +
   customer auto-reply).

   Feature-flagged: every helper is a no-op when RESEND_API_KEY is unset.
   That lets dev / preview deploys run without API noise, and matches the
   pattern we use for Turnstile (TURNSTILE_SECRET_KEY) and Beehiiv
   (BEEHIIV_API_KEY) elsewhere. The caller never has to branch on env
   presence — just `await sendEmail(...)` and trust the no-op fallback.

   We don't install the `resend` SDK — the API surface we need is one
   POST + simple JSON body, and bundling the SDK pulls in a meaningful
   chunk of node-fetch + form-data polyfills for no gain in a server-only
   route. Direct fetch keeps the function bundle lean.
---------------------------------------------------------------------------- */

interface ResendApiResponse {
  id?:        string
  message?:   string
  name?:      string
}

interface ResendErrorBody {
  message?:   string
  name?:      string
  statusCode?: number
}

export interface SendEmailOptions {
  to:      string | string[]
  /** Display sender, e.g. `"Botapolis <editorial@botapolis.com>"` */
  from?:   string
  subject: string
  /** HTML body. Plain-text fallback is generated from this if `text` is
   *  not provided — Resend handles the multipart wrapping. */
  html:    string
  /** Plain-text alternative. Optional; recommended for higher inbox rates. */
  text?:   string
  /** Reply-To address. Defaults to FROM_ADDRESS. */
  replyTo?: string
  /** Categorical tags, surfaced in Resend's UI for filtering. */
  tags?:   Array<{ name: string; value: string }>
}

interface SendEmailResult {
  ok: boolean
  /** Resend message id if successful — useful for log correlation. */
  id?: string
  /** Reason for skipping / failing. Caller can branch on this if it wants
   *  to log differently. */
  reason?: "not_configured" | "rate_limited" | "rejected" | "internal_error"
}

const DEFAULT_FROM = process.env.RESEND_FROM_ADDRESS
  ?? "Botapolis <editorial@botapolis.com>"
const ADMIN_INBOX  = process.env.RESEND_ADMIN_INBOX
  ?? "editorial@botapolis.com"

/**
 * Low-level send. Caller specifies the template inline.
 *
 * Returns ok:false instead of throwing on most failure modes so the
 * caller (an API route handling user input) can continue with its
 * success path — the email is auxiliary, never the critical path.
 * Throwing here would 500 the route, which is the wrong UX for a
 * subscribe / submit endpoint where the user shouldn't see "couldn't
 * send your welcome email" instead of "subscribed!".
 */
export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { ok: false, reason: "not_configured" }
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        from:     opts.from ?? DEFAULT_FROM,
        to:       Array.isArray(opts.to) ? opts.to : [opts.to],
        subject:  opts.subject,
        html:     opts.html,
        text:     opts.text,
        reply_to: opts.replyTo,
        tags:     opts.tags,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (res.status === 429) {
      const errBody = (await res.json().catch(() => null)) as ResendErrorBody | null
      console.warn("[resend] rate-limited:", errBody?.message ?? res.status)
      return { ok: false, reason: "rate_limited" }
    }
    if (!res.ok) {
      const errBody = (await res.json().catch(() => null)) as ResendErrorBody | null
      console.error(
        `[resend] ${res.status}:`,
        errBody?.message ?? errBody?.name ?? "(no detail)",
      )
      return { ok: false, reason: "rejected" }
    }

    const data = (await res.json().catch(() => ({}))) as ResendApiResponse
    return { ok: true, id: data.id }
  } catch (err) {
    console.error("[resend] fetch threw:", err)
    return { ok: false, reason: "internal_error" }
  }
}

// ---------------------------------------------------------------------------
// Pre-baked templates
// ---------------------------------------------------------------------------

/**
 * Welcome email after newsletter subscribe. Sent once per address,
 * triggered from /api/newsletter after the Beehiiv mirror succeeds.
 *
 * The Beehiiv API also sends its own confirmation email (`send_welcome_email:
 * true` in the subscription request), so this template should be different
 * — branded operator's note rather than a generic confirmation. Skip this
 * call entirely if you're relying on Beehiiv's onboarding sequence and
 * don't want a second touch.
 */
export async function sendNewsletterWelcome(
  email: string,
  language: "en" | "ru" = "en",
): Promise<SendEmailResult> {
  const subject =
    language === "ru"
      ? "Готово — теперь ты подписан на operator's brief"
      : "You're in — welcome to the operator's brief"
  const html =
    language === "ru"
      ? `
<div style="font-family:Geist,system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
  <h1 style="font-size:22px;letter-spacing:-0.02em;margin:0 0 16px;">Привет.</h1>
  <p style="font-size:15px;line-height:1.6;color:#52525B;margin:0 0 16px;">
    Спасибо за подписку на operator's brief. Раз в неделю присылаю одно письмо:
    обновления калькуляторов, новые обзоры на инструменты, найденные нами трейд-оффы.
    Никакого спама, никакой воды.
  </p>
  <p style="font-size:15px;line-height:1.6;color:#52525B;margin:0 0 16px;">
    Если что-то не зашло — отвечай на это письмо. Читаю всё.
  </p>
  <p style="font-size:13px;color:#71717A;margin:24px 0 0;">— Botapolis editorial</p>
</div>`
      : `
<div style="font-family:Geist,system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
  <h1 style="font-size:22px;letter-spacing:-0.02em;margin:0 0 16px;">Welcome.</h1>
  <p style="font-size:15px;line-height:1.6;color:#52525B;margin:0 0 16px;">
    You're on the operator's brief. One email a week — calculator updates,
    new reviews, the trade-offs we caught. No spam, no filler.
  </p>
  <p style="font-size:15px;line-height:1.6;color:#52525B;margin:0 0 16px;">
    Reply to this email if anything doesn't land — we read every one.
  </p>
  <p style="font-size:13px;color:#71717A;margin:24px 0 0;">— Botapolis editorial</p>
</div>`
  return sendEmail({
    to:      email,
    subject,
    html,
    tags:    [{ name: "category", value: "newsletter_welcome" }],
  })
}

/**
 * Notify editorial when a new contact form arrives.
 * Sent from /api/contact after the row lands in Supabase.
 */
export async function sendContactInboxNotification(submission: {
  name?:    string | null
  email:    string
  subject?: string | null
  message:  string
  source?:  string | null
}): Promise<SendEmailResult> {
  const subject = `[contact] ${submission.subject?.trim() || "New message from " + submission.email}`
  const html = `
<div style="font-family:Geist,system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0A0A0A;">
  <p style="font-size:13px;color:#71717A;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.08em;">New contact submission</p>
  <table style="font-size:14px;border-collapse:collapse;width:100%;">
    <tr><td style="color:#71717A;padding:4px 12px 4px 0;width:90px;">From</td><td>${escapeHtml(submission.name ?? "(no name)")} &lt;<a href="mailto:${encodeURIComponent(submission.email)}">${escapeHtml(submission.email)}</a>&gt;</td></tr>
    ${submission.subject ? `<tr><td style="color:#71717A;padding:4px 12px 4px 0;">Subject</td><td>${escapeHtml(submission.subject)}</td></tr>` : ""}
    ${submission.source  ? `<tr><td style="color:#71717A;padding:4px 12px 4px 0;">Source</td><td>${escapeHtml(submission.source)}</td></tr>`   : ""}
  </table>
  <hr style="border:none;border-top:1px solid #E4E4E7;margin:20px 0;" />
  <pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.6;margin:0;">${escapeHtml(submission.message)}</pre>
</div>`
  return sendEmail({
    to:       ADMIN_INBOX,
    subject,
    html,
    replyTo:  submission.email,
    tags:     [{ name: "category", value: "contact_inbox" }],
  })
}

/**
 * Auto-reply to the visitor who submitted the contact form.
 * Lightweight ack — sets expectations on response time.
 */
export async function sendContactAutoReply(
  email: string,
  language: "en" | "ru" = "en",
): Promise<SendEmailResult> {
  const subject =
    language === "ru"
      ? "Получили твоё сообщение — Botapolis"
      : "Got your message — Botapolis"
  const html =
    language === "ru"
      ? `
<div style="font-family:Geist,system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
  <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Спасибо за письмо.</p>
  <p style="font-size:15px;line-height:1.6;color:#52525B;margin:0 0 16px;">
    Отвечаем в течение 1–2 рабочих дней. Если срочно — ответ на это письмо доходит напрямую.
  </p>
  <p style="font-size:13px;color:#71717A;margin:24px 0 0;">— Botapolis editorial</p>
</div>`
      : `
<div style="font-family:Geist,system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
  <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Got it.</p>
  <p style="font-size:15px;line-height:1.6;color:#52525B;margin:0 0 16px;">
    Expect a reply within 1–2 business days. For urgent items, replying to this
    email lands directly in editorial.
  </p>
  <p style="font-size:13px;color:#71717A;margin:24px 0 0;">— Botapolis editorial</p>
</div>`
  return sendEmail({
    to:      email,
    subject,
    html,
    tags:    [{ name: "category", value: "contact_autoreply" }],
  })
}

/**
 * Tiny HTML-entity escape for user-supplied text inside email templates.
 * Resend doesn't auto-escape; a stray `<script>` in a contact submission
 * would otherwise execute when the editorial team views the email in a
 * client that supports HTML. Keep this in lockstep with whatever fields
 * are user-supplied above.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
