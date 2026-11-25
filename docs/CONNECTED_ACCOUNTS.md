# Connected accounts (Gmail, Outlook, calendars)

People connect their own Google or Microsoft account under **Account →
Connected accounts**. Admins can also connect the organization's **support
inbox** there.

| Connection | What it does |
|---|---|
| Personal | Emails with CRM contacts are logged on the account's timeline (subject + short snippet, never the body). Meetings with CRM contacts become CRM meetings. ExecAI can search *that person's* mail and read *their* calendar when they ask. |
| Support inbox | Agents' public replies are **sent from this mailbox**, in the customer's original thread (falls back to ExecUI's sender if it can't). New mail becomes a help-desk ticket. A reply quoting `[TKT-…]` from the ticket's own address joins that ticket. Auto-replies, bounces, no-reply senders and list mail are skipped. Mail already in the inbox when it's connected is left alone. |

Personal connections are **read-only**: ExecUI can't send, reply, delete or
accept invites from them. Only the support inbox asks for permission to send
(`gmail.send` / `Mail.Send`), and only uses it for ticket replies.
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
   `gmail.readonly`, `calendar.readonly`, and `gmail.send` (support inbox only).
3. Credentials → OAuth client ID (Web application) with the redirect URI.
4. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

> `gmail.readonly` is a **restricted** scope. While the app is in *Testing*,
> up to 100 named test users can connect. Going to *Production* requires
> Google's app verification **and an annual third-party security assessment
> (CASA)**, which has a cost. That is a business decision, not a code change.

**Microsoft** — Entra admin center → App registrations:
1. New registration, Web platform, the redirect URI above.
2. API permissions (delegated, Microsoft Graph): `User.Read`, `Mail.Read`,
   `Calendars.Read`, `offline_access`, `openid`, `email`, and `Mail.Send`
   (support inbox only).
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

## Slack and Microsoft Teams (chat channels)

Admins choose which events go to which channel under **Account → Integrations →
Chat channels**: network alerts (device down, threshold crossed, collector
offline), new help-desk tickets, approval requests, and workflow posts (the
automation action *Post to a Slack or Teams channel*). Only a title, a short
summary and a link back to ExecUI are posted — never ticket bodies or customer
messages. Each channel has **Test**, on/off, and shows its last error.

**Slack** — api.slack.com → Your Apps → Create app:
1. OAuth & Permissions: bot scopes `chat:write`, `chat:write.public`,
   `channels:read`, `groups:read`; redirect URL
   `<OAUTH_REDIRECT_BASE>/api/connections/oauth/slack/callback`.
2. Set `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET`. An admin then clicks
   **Add to Slack**. The app can post and list channels; it can't read messages.
   To post into a private channel, invite the app to it first.
3. Offering it to other companies' workspaces means distributing the app,
   which Slack reviews — a separate step from installing it in your own.

**Teams** — no app registration. In the channel: **… → Workflows → "Post to a
channel when a webhook request is received"**, copy the URL, paste it into
ExecUI. It's stored encrypted and only Microsoft webhook hosts are accepted.

## Zoom

Each person connects their own Zoom under **Connected accounts**; CRM meetings
then get an **Add Zoom** button, and ExecAI can schedule a meeting "with a
Zoom link". Meetings are hosted by that person, with the waiting room on.

marketplace.zoom.us → Develop → Build App → **General app (user-managed)**:
scopes `meeting:write:meeting` and `user:read:user`, redirect URL
`…/api/connections/oauth/zoom/callback`. Set `ZOOM_CLIENT_ID` /
`ZOOM_CLIENT_SECRET`. Publishing to the Zoom App Marketplace for other
companies is a review Zoom runs.

## Google Drive and OneDrive

Opt-in: tick **Include Drive / OneDrive** when connecting Google or Microsoft.
ExecAI can then find files by name ("find the Acme proposal"), and Account 360
can attach a found file to an account — as a link, so the file stays in Drive
with its own sharing. Only names, links, owners and dates are read, never
contents. Scopes: Google `drive.metadata.readonly` (restricted — same
verification note as Gmail), Microsoft `Files.Read`.
