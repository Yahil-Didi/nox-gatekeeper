# Nox Gatekeeper

A small multi-tenant service. Before an AI agent reaches a destination, it asks "may I do this?".
The service answers from the company's policy, and shows the security team what it refused.

NestJS, Postgres, and a plain HTML page. [API docs](docs/API.md) · [Database](docs/DATABASE.md)

## Running it

You need Docker. Then:

```bash
docker compose up --build
```

After about 40 seconds, open http://localhost:8080. The tables and the demo data are created on
the first start.

To run the app without Docker (Node 22, Postgres still in Docker):

```bash
docker compose up -d postgres
npm install
npm run start:dev
```

If you ran the full stack before, stop its app first (`docker compose stop app`), or port 8080 is
already in use.

### Demo sign-ins and agent keys

| Tenant | Admin                                       | Viewer                                         | Agent key                              |
| ------ | ------------------------------------------- | ---------------------------------------------- | -------------------------------------- |
| Acme   | `admin@acme.dev` / `acme-demo-password`     | `viewer@acme.dev` / `acme-viewer-password`     | `nox_acme_demo_3f9c2b7e41d8a6c05e2f`   |
| Globex | `admin@globex.dev` / `globex-demo-password` | `viewer@globex.dev` / `globex-viewer-password` | `nox_globex_demo_8a1d5e0c97b34f62d1aa` |

These are demo values; only their hashes are stored. The policies are in
[seed-data.ts](src/database/seed/seed-data.ts). Acme's policy is the example from the brief.

## Walkthrough

The commands are for bash (on Windows, use Git Bash).

```bash
KEY="Authorization: Bearer nox_acme_demo_3f9c2b7e41d8a6c05e2f"
```

**Allowed** (GitHub from git):

```bash
curl -s -X POST http://localhost:8080/api/v1/decisions -H "$KEY" -H "Content-Type: application/json" \
  -d '{"agent":"claude-code","user":"dana@acme.dev","workspace":"payments-api","program":"git","method":"GET","url":"https://github.com/acme/payments-api.git"}'
```

```json
{
  "id": "…",
  "outcome": "allowed",
  "ruleId": "github",
  "message": "github.com is allowed by rule \"github\": GitHub, only from git and gh."
}
```

**Denied by a rule** (an upload to pastebin):

```bash
curl -s -X POST http://localhost:8080/api/v1/decisions -H "$KEY" -H "Content-Type: application/json" \
  -d '{"agent":"claude-code","user":"dana@acme.dev","workspace":"payments-api","program":"curl","method":"POST","url":"https://pastebin.com/api/api_post.php"}'
```

```json
{
  "id": "…",
  "outcome": "denied",
  "ruleId": "outside",
  "message": "pastebin.com is blocked by your organization: Paste, tunnel and metadata services are never reachable. Don't retry this action."
}
```

**Denied by default** (no rule allows example.com):

```bash
curl -s -X POST http://localhost:8080/api/v1/decisions -H "$KEY" -H "Content-Type: application/json" \
  -d '{"agent":"claude-code","user":"dana@acme.dev","workspace":"payments-api","program":"curl","method":"GET","url":"https://example.com/data"}'
```

```json
{
  "id": "…",
  "outcome": "denied",
  "ruleId": null,
  "message": "example.com is not on your organization's allow list. If the agent needs it, ask your security team to add a rule."
}
```

**A retry stays one finding.** Run the pastebin request two more times. Then sign in and list the
findings: the pastebin row has `"count": 3`.

```bash
curl -s -c cookies.txt -X POST http://localhost:8080/api/v1/sessions -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.dev","password":"acme-demo-password"}'
curl -s -b cookies.txt http://localhost:8080/api/v1/findings
```

You can see the same list on the page at http://localhost:8080. Sign in as the viewer to see that
viewers can't create or revoke keys.

## API

| Endpoint                          | Who              |                               |
| --------------------------------- | ---------------- | ----------------------------- |
| `POST /api/v1/decisions`          | agent key        | The decision for one action   |
| `POST /api/v1/sessions`           | email + password | Sign in                       |
| `GET /api/v1/sessions/current`    | signed in        | The signed-in person and role |
| `DELETE /api/v1/sessions/current` | signed in        | Sign out                      |
| `GET /api/v1/findings`            | signed in        | The tenant's findings         |
| `GET /api/v1/agent-keys`          | signed in        | The tenant's agent keys       |
| `POST /api/v1/agent-keys`         | admin            | Create a key (shown once)     |
| `DELETE /api/v1/agent-keys/:id`   | admin            | Revoke a key                  |

Every request, response and error is in [docs/API.md](docs/API.md).

## How it's built

```
src/policy/      evaluate(policy, request): pure TypeScript, no Nest, no database
src/auth/        agent-key guard, sessions, admin-only guard
src/decisions/   POST /decisions: validate, evaluate, save, raise a finding
src/findings/    GET /findings
src/agent-keys/  list, create and revoke keys
src/database/    tables, one migration, demo seed
web/             the page (HTML + JS), served by the same app
```

The UI only calls the API. The API modules check the caller, validate the input and save. The
policy module doesn't use Nest or the database, so you can call and test it on its own:
`evaluate({ rules }, { program, method, url })`.

## Policy definitions

**Order doesn't matter.** A rule covers a request when it covers the host, and also the program
and the access if the rule lists them.

1. A deny rule that covers the request wins.
2. Otherwise, an allow rule must cover it.
3. Otherwise, it's denied by default.

**Hosts**

- `github.com` matches only github.com. Case and a trailing dot are ignored.
- `*.example.com` matches one level below (`api.example.com`), not `example.com`.
- `**.ngrok.io` matches any depth below (`a.b.ngrok.io`), not `ngrok.io`. To allow a domain and
  its subdomains, list both.
- IP addresses match exactly. Node's URL parser normalizes them first, so `http://2852039166/` is
  `169.254.169.254`. We don't look up DNS (see "Before a real customer").

**Ports.** Allow rules match only the default port (443, or 80 for http). Deny rules match every
port. So `github.com:8443` isn't allowed by accident, and `pastebin.com:8443` is still blocked.

**Read or write.** `GET`, `HEAD` and `OPTIONS` are reads. Every other method is a write, even an
unknown one, because that's the safer side.

**Programs.** Matched by name: `/usr/bin/Git.exe` is `git`. A rule without `programs` matches any
program.

**URLs.** Only `http` and `https`. Anything else gets `400`.

## Messages

The agent and the developer both read the refusal, so each message says what happened, why, and
what to do next. If an allow rule covers the host but not the program or the access, the message
says which one was wrong ("allowed only from git or gh, not from curl"). A deny from a rule says
"Don't retry", so agents don't loop.

## What's stored

- **Decisions** keep the destination as scheme, host and port only, like `https://pastebin.com`.
  The path and query are dropped: they often hold tokens or private data, and the admin doesn't
  need them.
- **Findings** are one row per who + what + why. A retry adds 1 to the count, even when retries
  arrive at the same moment.
- **No secrets in plain form.** Passwords are hashed with scrypt. Agent keys and session tokens
  are hashed with SHA-256.

The tables and keys are explained in [docs/DATABASE.md](docs/DATABASE.md).

## Security

- **Tenant isolation.** The tenant comes from the agent key or the session, never from the request
  body. Every query filters by it.
- **Sessions.** A random token in an `HttpOnly`, `SameSite=Strict` cookie, for 8 hours. Sign-out
  deletes it on the server, so the cookie stops working at once. `SameSite=Strict` and JSON-only
  bodies also block CSRF. Set `COOKIE_SECURE=true` behind HTTPS.
- **Sign-in** gives the same error for a wrong email and a wrong password.
- **Input** is validated, and unknown fields are rejected. `helmet` adds the usual security headers.

## Extras from the bonus list

- **Agent keys in the UI.** Admins can create and revoke keys. A new key is shown once; we store
  only its hash and a short prefix, so admins can tell keys apart. A revoked key gets `401` at once.
- **A viewer role.** Viewers see everything in their tenant and change nothing. Creating or
  revoking a key as a viewer gets `403`. The server checks this; hiding buttons in the UI is only
  for comfort.

## Assumptions

- Tenants, users and their roles come from the seed. There's no screen to manage them.
- One agent key is shared by a tenant's agents. It proves the tenant, not the person.
- `user`, `agent` and `workspace` are what the agent reports. We record them, but we can't verify
  them.
- A finding is per destination, not per full URL, because we don't store paths.

## What I cut

- The other bonus items: session trajectory and the held outcome, the rule editor, the Claude Code
  hook and LLM rule suggestions.
- Automated tests. The policy module is pure, so it's the first place I'd add them.
- Paging and filters on findings (the list shows the latest 200).

## Before a real customer

- Tests for the policy module, and tenant-isolation tests on the API.
- Rate limits on sign-in and on the decision endpoint.
- One key per developer or machine, so the user comes from the key, not the request.
- Key expiry, and an audit log of admin actions.
- Postgres row-level security as a second guard for tenant isolation.
- DNS: a hostname that points to `169.254.169.254` isn't caught today. The real fix is at the
  network edge, not only in this API.
- Deleting old decisions after a set time, and HTTPS with `COOKIE_SECURE=true`.
