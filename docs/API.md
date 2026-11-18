# API

Base URL: `http://localhost:8080/api/v1`. All bodies are JSON. The responses below are real
responses from the demo data.

| Endpoint                   | Auth             | Returns                       |
| -------------------------- | ---------------- | ----------------------------- |
| `POST /decisions`          | agent key        | The decision for one action   |
| `POST /sessions`           | email + password | Signs in (sets a cookie)      |
| `GET /sessions/current`    | session cookie   | The signed-in person and role |
| `DELETE /sessions/current` | session cookie   | Signs out                     |
| `GET /findings`            | session cookie   | The tenant's findings         |
| `GET /agent-keys`          | session cookie   | The tenant's agent keys       |
| `POST /agent-keys`         | admin only       | Creates a key, shown once     |
| `DELETE /agent-keys/:id`   | admin only       | Revokes a key                 |

Admins and viewers sign in the same way. Viewers can read everything in their tenant; the two
admin-only endpoints answer them with `403`.

Errors always look the same: `{ "message", "error", "statusCode" }`. `message` is a string, or a
list of strings for validation errors.

## POST /decisions

Agents call this before they act. The agent key decides the tenant, so the body never names one.

```bash
curl -s -X POST http://localhost:8080/api/v1/decisions \
  -H "Authorization: Bearer nox_acme_demo_3f9c2b7e41d8a6c05e2f" \
  -H "Content-Type: application/json" \
  -d '{"agent":"claude-code","user":"dana@acme.dev","workspace":"payments-api","program":"curl","method":"POST","url":"https://pastebin.com/api/api_post.php"}'
```

| Field       | Example                    |                                                               |
| ----------- | -------------------------- | ------------------------------------------------------------- |
| `agent`     | `claude-code`              | The agent harness                                             |
| `user`      | `dana@acme.dev`            | The developer the agent works for                             |
| `workspace` | `payments-api`             | The repository or project                                     |
| `program`   | `curl`, `/usr/bin/git`     | The program that will make the request                        |
| `method`    | `GET`, `POST`              | The HTTP method. Decides read or write.                       |
| `url`       | `https://pastebin.com/...` | Must be http or https. Only scheme, host and port are stored. |

All fields are required, and unknown fields are rejected.

**201 Created**: every decision is recorded, so it's a 201 whether the answer is yes or no.

```json
{
  "id": "fd6b53fe-050f-4125-92fa-440b0f2e9254",
  "outcome": "denied",
  "ruleId": "outside",
  "message": "pastebin.com is blocked by your organization: Paste, tunnel and metadata services are never reachable. Don't retry this action."
}
```

`outcome` is `allowed` or `denied`. `ruleId` is the rule that decided, or `null` when no rule
allowed it (the default deny).

### More examples

Allowed, `git` to GitHub:

```json
{
  "outcome": "allowed",
  "ruleId": "github",
  "message": "github.com is allowed by rule \"github\": GitHub, only from git and gh."
}
```

Denied by default, no rule covers example.com:

```json
{
  "outcome": "denied",
  "ruleId": null,
  "message": "example.com is not on your organization's allow list. If the agent needs it, ask your security team to add a rule."
}
```

The right host from the wrong program, `curl` to api.github.com:

```json
{
  "outcome": "denied",
  "ruleId": null,
  "message": "api.github.com is allowed only from git or gh, not from curl (rule \"github\": GitHub, only from git and gh). Do it the allowed way, or ask your security team."
}
```

A write to a read-only host, `npm publish` (PUT) to registry.npmjs.org:

```json
{
  "outcome": "denied",
  "ruleId": null,
  "message": "registry.npmjs.org is allowed only for reads, and this is a write (rule \"registries\": Install only, publishing is refused). Do it the allowed way, or ask your security team."
}
```

### Errors

**401**, no key or a wrong key:

```json
{
  "message": "Send your agent key as \"Authorization: Bearer <key>\".",
  "error": "Unauthorized",
  "statusCode": 401
}
```

```json
{ "message": "This agent key is not valid.", "error": "Unauthorized", "statusCode": 401 }
```

**400**, a bad body (here: an unknown field, no `workspace`, and a bad method). Each field gets
one message:

```json
{
  "message": [
    "property extra should not exist",
    "workspace should not be empty",
    "method must be an HTTP method, e.g. GET or POST"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**400**, a body that isn't valid JSON:

```json
{ "message": "Unexpected end of JSON input", "error": "Bad Request", "statusCode": 400 }
```

**400**, a URL we can't evaluate:

```json
{
  "message": "only http and https URLs are supported, got \"ftp\"",
  "error": "Bad Request",
  "statusCode": 400
}
```

## POST /sessions

```bash
curl -s -c cookies.txt -X POST http://localhost:8080/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.dev","password":"acme-demo-password"}'
```

**201 Created**, with the session cookie:

```
Set-Cookie: nox_session=…; Path=/; Expires=Wed, 18 Nov 2026 20:51:10 GMT; HttpOnly; SameSite=Strict
```

```json
{ "signedIn": true, "expiresAt": "2026-11-18T20:51:10.249Z" }
```

**401**, a wrong email or password. Both get the same message, so it doesn't reveal which emails
exist:

```json
{ "message": "Email or password is incorrect.", "error": "Unauthorized", "statusCode": 401 }
```

## GET /sessions/current

```bash
curl -s -b cookies.txt http://localhost:8080/api/v1/sessions/current
```

**200 OK**:

```json
{ "email": "admin@acme.dev", "tenant": "Acme", "role": "admin" }
```

## GET /findings

The tenant's findings, most recent first (the latest 200). Admins and viewers both see them.

```bash
curl -s -b cookies.txt http://localhost:8080/api/v1/findings
```

**200 OK**. One item, after the same pastebin upload was tried 3 times:

```json
[
  {
    "id": "343a4182-ed40-4c69-bd69-d107a93fdf4a",
    "who": { "user": "dana@acme.dev", "agent": "claude-code", "workspace": "payments-api" },
    "what": { "program": "curl", "destination": "https://pastebin.com" },
    "why": {
      "ruleId": "outside",
      "byDefault": false,
      "message": "pastebin.com is blocked by your organization: Paste, tunnel and metadata services are never reachable. Don't retry this action."
    },
    "count": 3,
    "lastSeen": "2026-11-18T12:31:04.531Z"
  }
]
```

**401**, not signed in:

```json
{ "message": "Sign in first.", "error": "Unauthorized", "statusCode": 401 }
```

## DELETE /sessions/current

```bash
curl -s -b cookies.txt -X DELETE http://localhost:8080/api/v1/sessions/current
```

**204 No Content**. The session is deleted on the server and the cookie is cleared, so the old
cookie stops working at once.

## GET /agent-keys

```bash
curl -s -b cookies.txt http://localhost:8080/api/v1/agent-keys
```

**200 OK**. The key itself and its hash are never returned:

```json
[
  {
    "id": "02472216-0b2f-4a82-93c8-c0f0273064ab",
    "name": "Default key",
    "prefix": "nox_acme_dem",
    "createdAt": "2026-11-18T14:01:22.422Z"
  }
]
```

## POST /agent-keys

Admins only.

```bash
curl -s -b cookies.txt -X POST http://localhost:8080/api/v1/agent-keys   -H "Content-Type: application/json" -d '{"name":"Laptops"}'
```

**201 Created**. This is the only time `key` is shown: we store just its hash.

```json
{
  "id": "6b0c…",
  "name": "Laptops",
  "prefix": "nox_zLqGUV5c",
  "createdAt": "2026-11-18T14:01:40.112Z",
  "key": "nox_zLqGUV5c…"
}
```

**403**, signed in as a viewer:

```json
{
  "message": "Viewers can see everything, but only admins can change it.",
  "error": "Forbidden",
  "statusCode": 403
}
```

## DELETE /agent-keys/:id

Admins only.

```bash
curl -s -b cookies.txt -X DELETE http://localhost:8080/api/v1/agent-keys/6b0c…
```

**204 No Content**. The key is deleted, so the next decision request with it gets `401`.

**404**, the key doesn't exist in your tenant (another tenant's key id gets the same answer):

```json
{ "message": "No such key in your organization.", "error": "Not Found", "statusCode": 404 }
```
