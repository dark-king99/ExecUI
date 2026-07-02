# Security — secret rotation & hardening

## Why rotate now

Before `.env` was gitignored, real secret values were committed. **They still
exist in git history**, so treat every one of them as exposed and rotate:

| Secret | Where | Consequence of exposure |
|---|---|---|
| `JWT_SECRET` | backend/.env | Anyone with the value can forge admin tokens |
| `STRIPE_SECRET_KEY` | backend/.env | Full access to your Stripe account |
| `DEEPSEEK_API_KEY` | backend/.env | Billable API usage on your account |

## Rotation steps

### 1. JWT_SECRET (do this first)

```bash
openssl rand -hex 32   # generate a new value
```

Put it in `backend/.env` as `JWT_SECRET=...` and restart the backend.

- Effect: **every signed-in user is logged out** (their tokens no longer
  verify). This is expected and desirable after an exposure.
- Note: if `SECRETS_KEY` is unset, the integration secret store derives its
  encryption key from `JWT_SECRET` — rotating it makes previously stored
  integration secrets undecryptable. Set a dedicated `SECRETS_KEY` (below)
  **before** rotating, or re-enter integration secrets afterwards.

### 2. SECRETS_KEY (set a dedicated one)

```bash
openssl rand -hex 32
```

Set `SECRETS_KEY=...` in `backend/.env`. Any integration secrets saved under
the old (derived) key must be re-entered in **Account → Integrations**.

### 3. Stripe

1. Stripe Dashboard → Developers → API keys → **Roll key** on the exposed
   secret key.
2. Update `STRIPE_SECRET_KEY` in `backend/.env`.
3. If you registered a webhook endpoint, its signing secret is unaffected —
   but if you ever pasted `STRIPE_WEBHOOK_SECRET` into a commit, roll the
   endpoint too (Developers → Webhooks → endpoint → Roll secret).

### 4. DeepSeek / other AI keys

Rotate in the provider dashboard, update `DEEPSEEK_API_KEY`.

### 5. (Optional) purge history

Rotation makes the leaked values worthless, which is the important part.
If you also want them out of history: `git filter-repo --path backend/.env
--invert-paths` and force-push — coordinate with anyone who has clones.

## Standing rules

- `.env` files are gitignored; commit only `.env.example` with placeholders.
- Generate secrets with `openssl rand -hex 32`, never by hand.
- One secret per environment — dev and prod never share values.
- Passwords are bcrypt-hashed; 2FA (TOTP) is available under
  **Account → Security** and enforced at login once enabled.
