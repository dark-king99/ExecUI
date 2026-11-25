/**
 * Google and Microsoft, behind one shape.
 *
 * Everything above this file speaks in plain objects — a message is
 * `{ id, threadId, from, to, cc, subject, snippet, date, headers, text? }`, an
 * event is `{ id, title, start, end, attendees, organizer, cancelled, link }` —
 * so the sync, the help desk and ExecAI never need to know whose API they're
 * talking to.
 *
 * Credentials come only from the environment. A provider with no client id is
 * "not configured" and the UI says so; nothing here invents a credential or
 * pretends a connection exists.
 *
 * Scopes are the narrowest that do the job. Personal connections are read-only:
 *   Google     gmail.readonly, calendar.readonly (+ openid email for the address)
 *   Microsoft  Mail.Read, Calendars.Read, User.Read, offline_access
 * The support inbox additionally asks to SEND (gmail.send / Mail.Send), so
 * help-desk replies go out from the support address in the customer's thread.
 * Note that Google classes gmail.readonly as a *restricted* scope: past 100
 * users, Google requires app verification and an annual security assessment.
 */

const env = (k) => process.env[k]?.trim() || null;
const enc = encodeURIComponent;

export class ProviderError extends Error {
  constructor(message, { status, reauth = false } = {}) {
    super(message);
    this.status = status;
    this.reauth = reauth; // the grant is gone — the person must reconnect
  }
}

async function call(url, { method = "GET", token, headers = {}, form, json } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(json ? { "Content-Type": "application/json" } : {}),
      Accept: "application/json",
      ...headers,
    },
    body: form ? new URLSearchParams(form).toString() : json ? JSON.stringify(json) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 300) }; }
  if (!res.ok) {
    const code = body?.error?.code ?? body?.error ?? null;
    // invalid_grant = refresh token revoked or expired; 401 on an API call
    // after a fresh token means the same thing in practice.
    const reauth = code === "invalid_grant" || res.status === 401;
    const detail = body?.error_description ?? body?.error?.message ?? (typeof body?.error === "string" ? body.error : null) ?? res.statusText;
    throw new ProviderError(`${new URL(url).host} ${res.status}: ${String(detail).slice(0, 200)}`, { status: res.status, reauth });
  }
  return body;
}

/** Header values can't carry line breaks (that's how header injection works). */
export const oneLine = (v) => String(v ?? "").replace(/[\r\n]+/g, " ").trim();

const header = (headers, name) =>
  headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? null;

/** "Ann <ann@acme.com>, bob@x.io" → ["ann@acme.com", "bob@x.io"] */
export function parseAddresses(value) {
  if (!value) return [];
  return String(value)
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((part) => (part.match(/<([^>]+)>/)?.[1] ?? part).trim().toLowerCase())
    .filter((a) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a));
}

const b64urlDecode = (s) => Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");

/** The first text/plain part of a Gmail payload (falls back to stripped HTML). */
function gmailText(payload) {
  if (!payload) return "";
  const stack = [payload];
  let html = null;
  while (stack.length) {
    const p = stack.shift();
    if (p.mimeType === "text/plain" && p.body?.data) return b64urlDecode(p.body.data);
    if (p.mimeType === "text/html" && p.body?.data && !html) html = b64urlDecode(p.body.data);
    if (Array.isArray(p.parts)) stack.push(...p.parts);
  }
  return html ? stripHtml(html) : "";
}

export const stripHtml = (html) => String(html)
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
  .replace(/<br\s*\/?>|<\/p>|<\/div>/gi, "\n")
  .replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

// ── Google ───────────────────────────────────────────────────────────────────
const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

const google = {
  id: "google",
  label: "Google (Gmail & Calendar)",
  configured: () => !!(env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET")),
  scopes: [
    "openid", "email",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar.readonly",
  ],
  sendScope: "https://www.googleapis.com/auth/gmail.send",
  scopesFor(purpose) { return purpose === "support_inbox" ? [...this.scopes, this.sendScope] : this.scopes; },

  authorizeUrl({ redirectUri, state, codeChallenge, loginHint, purpose = "personal" }) {
    const q = {
      client_id: env("GOOGLE_CLIENT_ID"), redirect_uri: redirectUri, response_type: "code",
      scope: this.scopesFor(purpose).join(" "), state, code_challenge: codeChallenge, code_challenge_method: "S256",
      // offline + consent is what makes Google return a refresh token.
      access_type: "offline", prompt: "consent", include_granted_scopes: "true",
      ...(loginHint ? { login_hint: loginHint } : {}),
    };
    return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams(q)}`;
  },

  exchangeCode({ code, redirectUri, codeVerifier }) {
    return call("https://oauth2.googleapis.com/token", {
      method: "POST",
      form: {
        code, redirect_uri: redirectUri, code_verifier: codeVerifier, grant_type: "authorization_code",
        client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"),
      },
    });
  },

  refresh(refreshToken) {
    return call("https://oauth2.googleapis.com/token", {
      method: "POST",
      form: {
        refresh_token: refreshToken, grant_type: "refresh_token",
        client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"),
      },
    });
  },

  async accountEmail(token) {
    const me = await call("https://openidconnect.googleapis.com/v1/userinfo", { token });
    return me?.email ?? null;
  },

  async revoke(token) {
    await call(`https://oauth2.googleapis.com/revoke?token=${enc(token)}`, { method: "POST", form: {} }).catch(() => {});
  },

  /** Message ids since `since`. `inboxOnly` excludes sent mail and anything from the mailbox itself. */
  async listMessageIds(token, { since, inboxOnly = false, query = null, max = 100 }) {
    const parts = [];
    if (since) parts.push(`after:${Math.floor(since.getTime() / 1000)}`);
    if (inboxOnly) parts.push("in:inbox", "-from:me");
    if (query) parts.push(query);
    const ids = [];
    let pageToken = null;
    do {
      const page = await call(`${GMAIL}/messages?maxResults=${Math.min(100, max)}&q=${enc(parts.join(" "))}${pageToken ? `&pageToken=${pageToken}` : ""}`, { token });
      for (const m of page?.messages ?? []) ids.push(m.id);
      pageToken = page?.nextPageToken ?? null;
    } while (pageToken && ids.length < max);
    return ids.slice(0, max);
  },

  async getMessage(token, id, { withText = false } = {}) {
    const names = ["From", "To", "Cc", "Subject", "Date", "Message-ID", "Auto-Submitted", "Precedence", "List-Id", "X-Autoreply"];
    const url = withText
      ? `${GMAIL}/messages/${enc(id)}?format=full`
      : `${GMAIL}/messages/${enc(id)}?format=metadata&${names.map((n) => `metadataHeaders=${n}`).join("&")}`;
    const m = await call(url, { token });
    const headers = m?.payload?.headers ?? [];
    return {
      id: m.id,
      threadId: m.threadId ?? null,
      from: parseAddresses(header(headers, "From"))[0] ?? null,
      fromName: (header(headers, "From") ?? "").replace(/<[^>]+>/, "").replace(/"/g, "").trim() || null,
      to: parseAddresses(header(headers, "To")),
      cc: parseAddresses(header(headers, "Cc")),
      subject: header(headers, "Subject") ?? "(no subject)",
      snippet: m.snippet ?? "",
      date: m.internalDate ? new Date(Number(m.internalDate)) : new Date(header(headers, "Date") ?? Date.now()),
      headers: Object.fromEntries(headers.map((h) => [h.name.toLowerCase(), h.value])),
      ...(withText ? { text: gmailText(m.payload) } : {}),
    };
  },

  /** Send a plain-text reply, threaded onto `replyTo` (a getMessage() result) when given. */
  async sendMail(token, { to, subject, text, replyTo }) {
    const messageId = replyTo?.headers?.["message-id"] ?? null;
    const encodedSubject = `=?UTF-8?B?${Buffer.from(oneLine(subject)).toString("base64")}?=`;
    const raw = [
      `To: ${oneLine(to)}`,
      `Subject: ${encodedSubject}`,
      ...(messageId ? [`In-Reply-To: ${oneLine(messageId)}`, `References: ${oneLine(messageId)}`] : []),
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from(String(text)).toString("base64").replace(/.{76}/g, "$&\r\n"),
    ].join("\r\n");
    const sent = await call(`${GMAIL}/messages/send`, {
      method: "POST", token,
      json: { raw: Buffer.from(raw).toString("base64url"), ...(replyTo?.threadId ? { threadId: replyTo.threadId } : {}) },
    });
    return { id: sent?.id ?? null };
  },

  async listEvents(token, { from, to }) {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=100` +
      `&timeMin=${enc(from.toISOString())}&timeMax=${enc(to.toISOString())}&showDeleted=true`;
    const page = await call(url, { token });
    return (page?.items ?? []).map((e) => ({
      id: e.id,
      title: e.summary ?? "(no title)",
      start: new Date(e.start?.dateTime ?? e.start?.date),
      end: new Date(e.end?.dateTime ?? e.end?.date ?? e.start?.dateTime ?? e.start?.date),
      attendees: (e.attendees ?? []).map((a) => String(a.email ?? "").toLowerCase()).filter(Boolean),
      organizer: String(e.organizer?.email ?? "").toLowerCase() || null,
      cancelled: e.status === "cancelled",
      link: e.htmlLink ?? null,
    }));
  },
};

// ── Microsoft ────────────────────────────────────────────────────────────────
const GRAPH = "https://graph.microsoft.com/v1.0/me";
const msTenant = () => env("MICROSOFT_TENANT") ?? "common";
const MS_SELECT = "id,conversationId,subject,bodyPreview,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,internetMessageId";

const msAddress = (r) => String(r?.emailAddress?.address ?? "").toLowerCase() || null;

function msMessage(m, { withText = false } = {}) {
  const headers = Object.fromEntries((m.internetMessageHeaders ?? []).map((h) => [h.name.toLowerCase(), h.value]));
  return {
    id: m.id,
    threadId: m.conversationId ?? null,
    from: msAddress(m.from),
    fromName: m.from?.emailAddress?.name ?? null,
    to: (m.toRecipients ?? []).map(msAddress).filter(Boolean),
    cc: (m.ccRecipients ?? []).map(msAddress).filter(Boolean),
    subject: m.subject || "(no subject)",
    snippet: m.bodyPreview ?? "",
    date: new Date(m.receivedDateTime ?? m.sentDateTime ?? Date.now()),
    headers,
    ...(withText ? { text: m.body?.contentType === "html" ? stripHtml(m.body?.content ?? "") : String(m.body?.content ?? "") } : {}),
  };
}

const microsoft = {
  id: "microsoft",
  label: "Microsoft (Outlook & Calendar)",
  configured: () => !!(env("MICROSOFT_CLIENT_ID") && env("MICROSOFT_CLIENT_SECRET")),
  scopes: ["openid", "email", "offline_access", "User.Read", "Mail.Read", "Calendars.Read"],
  sendScope: "Mail.Send",
  scopesFor(purpose) { return purpose === "support_inbox" ? [...this.scopes, this.sendScope] : this.scopes; },

  authorizeUrl({ redirectUri, state, codeChallenge, loginHint, purpose = "personal" }) {
    const q = {
      client_id: env("MICROSOFT_CLIENT_ID"), redirect_uri: redirectUri, response_type: "code", response_mode: "query",
      scope: this.scopesFor(purpose).join(" "), state, code_challenge: codeChallenge, code_challenge_method: "S256",
      prompt: "select_account",
      ...(loginHint ? { login_hint: loginHint } : {}),
    };
    return `https://login.microsoftonline.com/${enc(msTenant())}/oauth2/v2.0/authorize?${new URLSearchParams(q)}`;
  },

  exchangeCode({ code, redirectUri, codeVerifier, purpose = "personal" }) {
    return call(`https://login.microsoftonline.com/${enc(msTenant())}/oauth2/v2.0/token`, {
      method: "POST",
      form: {
        code, redirect_uri: redirectUri, code_verifier: codeVerifier, grant_type: "authorization_code",
        client_id: env("MICROSOFT_CLIENT_ID"), client_secret: env("MICROSOFT_CLIENT_SECRET"), scope: this.scopesFor(purpose).join(" "),
      },
    });
  },

  refresh(refreshToken, purpose = "personal") {
    return call(`https://login.microsoftonline.com/${enc(msTenant())}/oauth2/v2.0/token`, {
      method: "POST",
      form: {
        refresh_token: refreshToken, grant_type: "refresh_token",
        client_id: env("MICROSOFT_CLIENT_ID"), client_secret: env("MICROSOFT_CLIENT_SECRET"), scope: this.scopesFor(purpose).join(" "),
      },
    });
  },

  async accountEmail(token) {
    const me = await call(`${GRAPH}?$select=mail,userPrincipalName`, { token });
    return String(me?.mail ?? me?.userPrincipalName ?? "").toLowerCase() || null;
  },

  // Microsoft has no token-revocation endpoint for this flow. Disconnecting
  // deletes our copy; the person can also remove the app at myapps.microsoft.com.
  async revoke() {},

  async listMessageIds(token, { since, inboxOnly = false, query = null, max = 100 }) {
    const base = inboxOnly ? `${GRAPH}/mailFolders/inbox/messages` : `${GRAPH}/messages`;
    // $search and $filter can't be combined on messages, so a search ignores `since`.
    const url = query
      ? `${base}?$search=${enc(`"${String(query).replace(/"/g, "")}"`)}&$top=${Math.min(50, max)}&$select=id`
      : `${base}?$top=${Math.min(50, max)}&$select=id&$orderby=receivedDateTime desc` +
        (since ? `&$filter=${enc(`receivedDateTime ge ${since.toISOString()}`)}` : "");
    const ids = [];
    let next = url;
    while (next && ids.length < max) {
      const page = await call(next, { token });
      for (const m of page?.value ?? []) ids.push(m.id);
      next = page?.["@odata.nextLink"] ?? null;
    }
    return ids.slice(0, max);
  },

  async getMessage(token, id, { withText = false } = {}) {
    const select = withText ? `${MS_SELECT},body,internetMessageHeaders` : MS_SELECT;
    const m = await call(`${GRAPH}/messages/${enc(id)}?$select=${select}`, {
      token, headers: withText ? { Prefer: 'outlook.body-content-type="text"' } : {},
    });
    return msMessage(m, { withText });
  },

  /** Reply in the original conversation when we have it; otherwise a new message. */
  async sendMail(token, { to, subject, text, replyTo }) {
    if (replyTo?.id) {
      await call(`${GRAPH}/messages/${enc(replyTo.id)}/reply`, {
        method: "POST", token,
        json: { message: { toRecipients: [{ emailAddress: { address: oneLine(to) } }] }, comment: String(text) },
      });
    } else {
      await call(`${GRAPH}/sendMail`, {
        method: "POST", token,
        json: {
          message: { subject: oneLine(subject), body: { contentType: "Text", content: String(text) }, toRecipients: [{ emailAddress: { address: oneLine(to) } }] },
          saveToSentItems: true,
        },
      });
    }
    return { id: null };
  },

  async listEvents(token, { from, to }) {
    const url = `${GRAPH}/calendarView?startDateTime=${enc(from.toISOString())}&endDateTime=${enc(to.toISOString())}` +
      `&$top=100&$select=id,subject,start,end,attendees,organizer,isCancelled,webLink`;
    const page = await call(url, { token, headers: { Prefer: 'outlook.timezone="UTC"' } });
    const utc = (d) => new Date(String(d?.dateTime ?? "").replace(/Z?$/, "Z"));
    return (page?.value ?? []).map((e) => ({
      id: e.id,
      title: e.subject ?? "(no title)",
      start: utc(e.start),
      end: utc(e.end),
      attendees: (e.attendees ?? []).map(msAddress).filter(Boolean),
      organizer: msAddress(e.organizer),
      cancelled: !!e.isCancelled,
      link: e.webLink ?? null,
    }));
  },
};

export const PROVIDERS = { google, microsoft };
export const getProvider = (id) => PROVIDERS[id] ?? null;

/** What the UI shows: which providers this deployment can actually connect. */
export const providerList = () => Object.values(PROVIDERS).map((p) => ({
  id: p.id, label: p.label, configured: p.configured(),
}));
