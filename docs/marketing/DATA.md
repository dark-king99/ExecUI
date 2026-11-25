# Data Streams and Content Studio

## Data Streams

Every stream writes into **CRM contacts** and the **marketing event stream**. Marketing keeps no second copy of people. Contacts are matched by email inside the tenant, ignoring case. A per-address database lock means simultaneous submissions can't create duplicate contacts.

| Kind | How data arrives | Consent |
|---|---|---|
| Signup form | Hosted page at `/api/public/marketing/forms/<key>`, or the HTML snippet pasted into any site | Recorded only when the person ticks the box. The consent wording, time and IP are kept as evidence. |
| Events API | `POST /api/public/marketing/ingest/events` with `Authorization: Bearer mks_…` | Never recorded. Events are behaviour, not permission. |
| CSV import | Uploaded in Data Streams, with columns mapped by the person importing | Only with an attestation and a note of where people agreed |

**Consent rules**
- An import never re-subscribes anyone who unsubscribed, bounced or complained.
- A suppressed address is never subscribed, by any source.
- Ticking a form's box *can* re-subscribe a past unsubscribe, because that person just asked to be added again.
- The older "record consent you already have" import now follows the same rules.

**Signup forms**
- Limited to 5 submissions a minute per visitor and 300 a minute per form.
- A hidden `website` field catches bots: submissions that fill it look successful but store nothing.
- The hosted page is served with a strict Content-Security-Policy, and all form text is escaped.
- Each submission records a `form.submitted` event. Journeys can trigger on it, filtered to one form.

**Events API**
- Up to 500 events per request and 120 requests a minute per stream.
- An optional `id` per event makes retries safe.
- Names become `custom:<name>`; for example, "Trial Started" becomes `custom:trial_started`. These work in audience rules and as journey triggers and waits.
- The key is shown once. Only its SHA-256 is stored, and rotating it stops the old key immediately.
- A stream can refuse events for addresses that aren't already CRM contacts.

**CSV import**
- UTF-8, up to 10 MB and 50,000 rows. The delimiter can be `,`, `;` or tab, and quoted fields work.
- The email column is guessed from its name or contents.
- Each import is kept as a run, with row-numbered problems.

## Content Studio

- **File types:** decided by the file's own bytes. PNG, JPEG, GIF, WebP, MP4, MOV, WebM and PDF are accepted. SVG and HTML are refused because they can carry script.
- **Versions:** each replacement file is a new version with its own URL. Old URLs keep working, because emails already sent point at them. A new version needs approval again.
- **Approval:** an image needs alt text before it can be approved. Only approved images are offered in Email Studio's "Insert an approved image". Approving and deleting need the permission **Approve marketing content** (`marketing.content.approve`).
- **Deleting:** an asset used in an email that has gone out can be archived but not deleted.
- **Storage:** files are in object storage (`lib/storage.js`) at unguessable public URLs, so inbox clients and social networks can fetch them.

## Not yet covered

- Double opt-in confirmation emails for forms.
- Pulling data from other SaaS tools (HubSpot, Shopify and so on). Commerce sources arrive in Phase 10.
- Merging duplicate contacts that already exist. This is identity resolution, Phase 10.
