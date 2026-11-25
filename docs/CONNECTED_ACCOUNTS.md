# Connected accounts (Gmail, Outlook, calendars)

People connect their own Google or Microsoft account under **Account →
Connected accounts**. Admins can also connect the organization's **support
inbox** there.

| Connection | What it does |
|---|---|
| Personal | Emails with CRM contacts are logged on the account's timeline (subject + short snippet, never the body). Meetings with CRM contacts become CRM meetings. ExecAI can search *that person's* mail and read *their* calendar when they ask. |
| Support inbox | New mail becomes a help-desk ticket. A reply quoting `[TKT-…]` from the ticket's own address joins that ticket. Auto-replies, bounces, no-reply senders and list mail are skipped. Mail already in the inbox when it's connected is left alone. |

Everything is **read-only**: ExecUI can't send, reply, delete or accept invites.
Tokens are encrypted with `SECRETS_KEY` and never reach the browser. Sync runs
every `CONNECTIONS_SYNC_MINUTES` (default 5); people can also press *Sync now*.

## Setting it up

Nothing works until each provider has an app registration. These steps need a
person with access to the company's Google Cloud and Microsoft Entra accounts.

**Redirect URI** (register exactly this, per provider):
`<OAUTH_REDIRECT_BASE>/api/connections/oauth/google/callback` and
`…/oauth/microsoft/callback`. `OAUTH_REDIRECT_BASE` is the public URL of the
backend (falls back to `APP_URL`).

**Google** — Google Cloud console → APIs & Services:
1. Enable the Gmail API and Google Calendar API.
2. OAuth consent screen: add scopes `openid`, `email`,
   `gmail.readonly`, `calendar.readonly`.
3. Credentials → OAuth client ID (Web application) with the redirect URI.
4. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

> `gmail.readonly` is a **restricted** scope. While the app is in *Testing*,
> up to 100 named test users can connect. Going to *Production* requires
> Google's app verification **and an annual third-party security assessment
> (CASA)**, which has a cost. That is a business decision, not a code change.

**Microsoft** — Entra admin center → App registrations:
1. New registration, Web platform, the redirect URI above.
2. API permissions (delegated, Microsoft Graph): `User.Read`, `Mail.Read`,
   `Calendars.Read`, `offline_access`, `openid`, `email`.
3. Certificates & secrets → new client secret.
4. Set `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET`. `MICROSOFT_TENANT`
   stays `common` to accept any organization's accounts.

> Customers' IT admins may need to grant consent for their organization.
> Publisher verification (free, needs a Microsoft Partner Network ID) removes
> the "unverified" warning on the consent screen.

## Data and compliance

Logged emails are the **Logged emails (connected mailboxes)** category in
Compliance: retained 730 days by default, exportable, and deleted when a
contact asks to be erased (matched as sender or recipient). Disconnecting
revokes the Google grant (Microsoft has no revocation endpoint; people can
remove the app at myapps.microsoft.com) and deletes the stored tokens.
