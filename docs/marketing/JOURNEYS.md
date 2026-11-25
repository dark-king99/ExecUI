# Journey Tab and Automation Studio

Both pages run on one server-side engine
(`backend/src/modules/marketing/journeys/`). A journey runs whether or not
anyone has a browser open. An "automation" is a journey whose usual trigger is a
schedule over an audience.

## Lifecycle

| Status   | Meaning |
|----------|---------|
| draft    | Being built. Nothing runs. |
| active   | The published version enrolls contacts and moves them on. |
| paused   | Nobody enters or moves. Waits pick up where they stopped on resume. |
| archived | Finished for good. Anyone still inside leaves (`exitReason: archived`). |

Editing changes the **draft** only. **Publish** checks the draft fully and saves
it as the next numbered version:
- the graph is complete, has no loops, and every step can be reached;
- every email, audience, assignee and channel it names still exists and is
  usable.

Contacts stay on the version they entered on. Publishing, pausing, resuming,
archiving, deleting and enrolling are written to the audit log.

## Triggers

- **Added by hand**: from the editor's "People" panel.
- **A contact is added to the CRM**: the `contacts.created` domain event.
- **A contact does something**: a recorded marketing event such as `email.clicked`, optionally for one email.
- **On a schedule, from an audience**: every hour, day or week. Each run is recorded as a `journey.run` event.

A contact is never in the same journey twice at once (unique `activeKey`). With
"once per contact, ever" (the default) they can't come back after finishing
(`onceKey`).

## Steps

| Step | What it does |
|------|--------------|
| Send email | Queues a **journey email**: an Email Studio campaign in mode `triggered` that has been activated. The email worker sends it with the same consent, suppression, domain and webhook handling as campaigns. A contact without email consent skips the step and carries on. |
| Wait | Minutes, hours or days. Stored as `waitUntil`, never slept. |
| Wait for an event | Waits until the contact opens, clicks and so on, or until it times out. Each outcome has its own branch. |
| If / else | Segment rules evaluated on the contact (the same rules audiences use). |
| A/B split | A stable random split for each enrollment. |
| Add to / remove from audience | Static audiences only. |
| Create CRM task | Assigned to an active workspace member, with a due date. |
| Notify the team | An in-app notification to admins, a person, a department or a role. |
| Post to a channel | A Slack or Teams channel route (Account › Integrations). |
| Call a webhook | An HTTPS POST of the contact's id, name and email, with an `Idempotency-Key` header. |

Webhooks are guarded against reaching the server's own network:
- only https on ports 443 or 8443, with no `user:pass@` in the URL;
- every resolved address must be public, and the check runs inside the socket's own DNS lookup, so DNS rebinding can't swap the address afterwards;
- redirects are not followed.

**Goal** and **exit rules** are segment rules checked before every step:
- meeting the goal ends the trip as *converted*;
- matching the exit rules removes the contact.

## Engine guarantees

- **Claiming:** due enrollments are claimed with `FOR UPDATE SKIP LOCKED`, so several app instances never move the same contact twice. A claim that is stale for 10 minutes is picked up again.
- **Exactly-once steps:** each step writes a history row (`MarketingJourneyStep`, unique per enrollment and sequence) *before* acting, and marks it done after. If an instance dies after acting but before moving on, the next pass sees "done" and doesn't act again. Journey emails are also de-duplicated by `sendKey`.
- **Retries:** temporary failures (timeouts, 5xx, 429) retry after 1, 5 and 30 minutes. After that, or on a permanent error, the enrollment fails and the reason is recorded.
- **Every trip ends:** at most 25 steps per pass and 500 per trip, and the graph can't contain loops.

## Testing a journey

**Test with a contact** walks the saved draft for one real CRM contact. It shows:
- the branches they'd take;
- whether an email would send or be skipped, and why;
- where they'd wait.

Nothing is sent or written.

## Configuration

- `MARKETING_JOURNEY_WORKER=off` turns the engine off on one instance. It's on by default.
- Sending journey emails needs Email Studio to be set up (see [EMAIL.md](EMAIL.md)).
- Permission **Run journeys and automations** (`marketing.journey.manage`) is needed to publish, pause, archive, delete and enroll. Building and testing drafts is open to the Marketing module.

## Not yet covered

- **Deal stage and lifecycle triggers.** CRM opportunities aren't linked to contacts, so there is no contact to enroll yet.
- **Form submissions and purchases.** These arrive with Data Streams (Phase 7) and Commerce (Phase 10), as new event types.
- **"Update contact attributes".** CRM contacts have no custom fields yet, only name and email.
- **Goal and exit timing during a wait.** These rules are checked when the wait ends, not continuously while the contact is waiting.
