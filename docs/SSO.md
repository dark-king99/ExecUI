# Single Sign-On (SAML 2.0 / OIDC) & SCIM Provisioning

Enterprise identity federation for ExecUI: employees sign in with your company
identity provider, and accounts are created, updated and deactivated
automatically by your directory.

**Availability:** Enterprise and Executive plans. Configure at
**Account → Single Sign-On** (organization administrators only).

| Capability | Supported |
|---|---|
| OIDC / OAuth 2.0 (Okta, Microsoft Entra ID, Google Workspace, Auth0, Keycloak, OneLogin, Ping) | ✅ Authorization Code + PKCE |
| SAML 2.0 (HTTP-Redirect request, HTTP-POST assertion) | ✅ signed assertions, SP metadata |
| Just-in-time provisioning | ✅ optional |
| SCIM 2.0 user provisioning & deprovisioning | ✅ Users + Groups |
| Group → role mapping | ✅ |
| Enforce SSO (disable password login) | ✅ with admin break-glass |

---

## 1. How the login flow works

```
Employee → “Sign in with SSO” → ExecUI /auth/sso/start
        → your IdP (authenticate)  → ExecUI callback (validate assertion)
        → one-time code            → SPA exchanges it → session
```

The session token is **never placed in a redirect URL**. The IdP round-trip
returns a single-use, 2-minute handoff code that the app exchanges over POST, so
no credential lands in browser history, referrer headers, or access logs.

**Security properties**

- **OIDC** — PKCE (S256), `state` bound to a server-side single-use record,
  `nonce` replay check, id_token signature verified against the IdP's JWKS
  (asymmetric algorithms only; `alg: none` and HMAC are rejected), plus strict
  issuer / audience / expiry validation.
- **SAML** — signature and digest verification, audience restriction, timestamp
  and recipient validation via `@node-saml/node-saml`. XML-DSig is never
  hand-rolled. Tampered or unsigned assertions are rejected.
- Login requests and handoff codes are **single-use and short-lived**.
- Client secrets and SP private keys are **AES-256-GCM encrypted at rest** and
  never returned to the browser.

---

## 2. Connect an identity provider

Go to **Account → Single Sign-On**, pick the protocol, and copy the values the
page shows you into your IdP.

### OIDC

| ExecUI asks for | Where it comes from |
|---|---|
| Issuer URL | e.g. `https://acme.okta.com` — endpoints are auto-discovered from `/.well-known/openid-configuration` |
| Client ID / Client secret | the app you create in the IdP |
| Scopes | `openid email profile` (default) |

Give your IdP the **Redirect URI** shown on the page:
`https://<your-host>/api/auth/sso/oidc/callback`

### SAML 2.0

| ExecUI asks for | Where it comes from |
|---|---|
| IdP sign-on URL | the IdP's SSO endpoint |
| IdP issuer (entity ID) | the IdP's entity ID |
| IdP signing certificate | the X.509 cert from the IdP |

Give your IdP:
- **ACS / Single Sign-On URL** — `https://<your-host>/api/auth/sso/saml/<tenantId>/callback`
- **Audience / Entity ID** — `https://<your-host>/api/auth/sso/saml/<tenantId>/metadata`
- **SP metadata XML** is served at that same URL for automatic import.

Then use **Test connection** before enabling — it validates discovery/JWKS (OIDC)
or the certificate and endpoints (SAML) and reports the exact failure if any.

### Settings that matter

- **Email domains** — routes `@acme.com` users to this provider on the login page.
- **Enable Single Sign-On** — shows the SSO option.
- **Require SSO for all employees** — refuses password login for the org.
  **Administrators intentionally keep password access** so a misconfigured or
  down IdP can never lock the whole organization out.
- **Create accounts on first sign-in (JIT)** — provisions the user from the
  assertion. Turn it off if SCIM is the only source of truth.
- **Attribute mapping** — which claim/attribute carries email, names and groups.
  Defaults suit most providers; SAML's long `schemas.xmlsoap.org` claim URIs are
  understood automatically.

---

## 3. SCIM 2.0 provisioning

Base URL: `https://<your-host>/scim/v2`
Auth: `Authorization: Bearer <token>` — create one in **Account → Single Sign-On →
SCIM provisioning**. Only a SHA-256 hash is stored, so the plaintext is shown
**once**; revoke and reissue at any time.

### Implemented

| Endpoint | Methods |
|---|---|
| `/ServiceProviderConfig`, `/ResourceTypes`, `/Schemas` | `GET` (discovery) |
| `/Users` | `GET` (filter, pagination), `POST` |
| `/Users/{id}` | `GET`, `PUT`, `PATCH`, `DELETE` |
| `/Groups` | `GET` |
| `/Groups/{id}` | `GET`, `PATCH` (membership) |

- **Filters:** `userName eq`, `externalId eq`, `emails.value eq`, `id eq`,
  `active eq`, optionally joined with `and` — the set IdPs actually send.
  Unsupported filters return a proper `invalidFilter` error rather than the
  wrong result set.
- **Groups map to ExecUI roles.** Changing membership moves the user's role.
- **`DELETE` deactivates rather than destroys.** A departing employee's CRM
  records, ownership and audit trail must survive their departure; a hard delete
  stays available to admins in the UI. `PATCH active:false` behaves the same and
  ends their active sessions.
- **Employee IDs** are auto-assigned (7-char) when the IdP doesn't send
  `employeeNumber`.
- SCIM requests are exempt from the global per-IP rate limit (a directory sync
  legitimately bursts) and carry their own budget — tune with
  `SCIM_RATE_LIMIT_PER_MIN`.

### Okta / Entra quick setup

1. Create the app integration (OIDC or SAML) and paste the endpoints above.
2. Enable provisioning → SCIM 2.0, base URL `https://<your-host>/scim/v2`,
   auth mode **HTTP Header / OAuth bearer token**, and paste the token.
3. Test connectivity, then enable *Create / Update / Deactivate users*.

---

## 4. Configuration

| Env var | Purpose |
|---|---|
| `APP_URL` | Public base URL used to build callback/ACS/metadata URLs. **Set this in production** — otherwise they're derived from request headers. |
| `SECRETS_KEY` | AES-256 key encrypting client secrets and SP private keys. |
| `SCIM_RATE_LIMIT_PER_MIN` | SCIM request budget (default 1200/min). |

---

## 5. Operational notes

- **Break-glass:** admins always retain password login. Keep at least one
  administrator with a password and MFA.
- **Auditing:** SSO logins are recorded as `login_sso`; SCIM writes are recorded
  as `scim_create_user` / `scim_update_user` / `scim_deactivate_user` /
  `scim_deprovision_user` in **Account → Audit Logs**.
- **Rotation:** re-paste a client secret or certificate at any time; cached
  discovery/JWKS documents are cleared on save. JWKS is also re-fetched
  automatically when the IdP rotates signing keys.
- **Tenant isolation:** a SCIM token is bound to one organization, and every
  query underneath runs inside that tenant's context — a token can never read or
  write another organization's users.
