# Wjeen CMS backend — Stage 3B

Django + PostgreSQL storage for the site's content, with deep patching,
optimistic concurrency, and immutable published revisions.

## Boundary (Stage 3B)

**Nothing here is wired into the site and nothing here is deployed.**

`src/i18n/request.ts` still imports `src/messages/{locale}.json`. Those files
remain the production source of truth and the fallback. They are opened
read-only by the importer and are never written.

Out of scope until separately approved: production deployment, production data
import, switching the Next.js content loader, production auth rollout,
deleting the JSON files, media, entity CRUD, publishing UI, rollback UI.

## Two version concepts, never mixed

| | `ContentBlock.version` | `ContentVersion` |
|---|---|---|
| scope | one `(namespace, locale)` | everything, both locales |
| kind | mutable counter | immutable snapshot |
| bumped by | every PATCH | every publish / rollback |
| `If-Match` on | PATCH, draft discard | publish, rollback |

Editing `hero` and `clients` at the same time never conflicts — different rows,
different counters. The only global contention point is publish.

## Path contract

    namespace   a root key of messages/{locale}.json — never contains a dot
    locale      en | ar
    path        relative to that root; "" (or omitted) means the root itself

So `careersPage.values` is `namespace=careersPage`, `path=values`, applied at
`draft_data.values`. The root is not a special case; it is `path=""`.

There is no PUT. A whole-document replace is the one operation that can
silently drop keys.

## Running it

    python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
    createdb wjeen_cms
    .venv/bin/python manage.py migrate
    .venv/bin/python manage.py import_messages
    .venv/bin/python manage.py verify_roundtrip     # HARD GATE — must exit 0
    .venv/bin/python manage.py test content --noinput

`verify_roundtrip` compares `messages -> import -> JSONB -> assemble` for
semantic equality: every key path, nested object, list length and order,
primitive type and value, in both locales. Whitespace and key order are
irrelevant because the comparison runs on parsed structures, not text.

It exits non-zero on any difference. Nothing may switch the Next.js content
loader until it exits 0.

## Endpoints

| method | path | auth |
|---|---|---|
| GET | `/api/v1/content/{locale}/` | public |
| GET | `/api/v1/admin/auth/csrf/` | public |
| POST | `/api/v1/admin/auth/login\|refresh\|logout/` | CSRF required |
| GET | `/api/v1/admin/content/` | cookie |
| GET/PATCH/DELETE | `/api/v1/admin/content/{namespace}/{locale}/` | cookie + CSRF + If-Match |
| GET | `/api/v1/admin/preview/{locale}/` | cookie |
| POST | `/api/v1/admin/publish/` | cookie + CSRF + If-Match |
| GET | `/api/v1/admin/versions/` | cookie |
| POST | `/api/v1/admin/versions/{n}/rollback/` | cookie + CSRF + If-Match |

## Draft lifecycle

**Publish** touches only blocks that had a draft:

- promoted blocks — `published_data = draft_data`, then `draft_data = NULL`
  and `version += 1`, so the same draft can never be published twice
- blocks with no draft — not written at all: version, `updated_at` and
  `draft_data` are all untouched, so someone else's publish never forces an
  unrelated editor to refetch
- after a successful publish, no draft survives anywhere

**Rollback** never reads or writes `draft_data`. It restores `published_data`
for every namespace in the target snapshot and bumps each block's version.
Unpublished work therefore survives a rollback of the published site — but its
`If-Match` precondition goes stale, so an open editor must refetch.

One consequence worth knowing: a draft is a whole namespace, seeded when it was
opened. Publishing a draft that predates a rollback re-applies that era's
fields, including ones the rollback had just reverted. That is the draft doing
exactly what it says, not a defect, but the publishing UI (out of scope here)
should warn about it.

**Concurrency.** Publish holds `SELECT ... FOR UPDATE` over every block row for
its whole transaction, so a patch cannot interleave. It either lands before the
publish and gets published, or it waits and then fails its precondition. There
is no window in which an edit is silently dropped or a draft silently cleared.

## Security notes

The access token lives in an HttpOnly, Secure, `SameSite=Strict` cookie scoped
to `/api/v1/admin`, so it is never attached to the public read.

Because the browser sends that cookie automatically, CSRF protection is
mandatory. `content/api/auth.py` does not use SimpleJWT's stock authentication
class: that class performs **no** CSRF check, which is safe for an
`Authorization` header and a hole once the token moves into a cookie. The
class here runs Django's CSRF machinery explicitly on every unsafe method,
login included.

Sign-in is throttled per client address, in `throttling/` — its own app, so
the Stage 3B migration chain stays untouched. Failed attempts are counted in
PostgreSQL, which is already required, so the limit holds across every worker
rather than per process. It is keyed on the client, never the username: a
per-username counter would let anyone lock a known account out and would make
the response differ for an account that exists. CSRF is checked *before* the
throttle, so a throttled state can never become a way around it, and the
limiter fails **open** — authentication needs the same database, so a closed
failure would turn a brief outage into a lockout for no security gain.

`SameSite=Strict` is only viable because the API is a subdomain of the site
(`api.wjeen.com` / `www.wjeen.com`). Hosting the API on an unrelated domain
would force `SameSite=None` and reopen the whole CSRF surface.

CORS names the frontend origin explicitly and allows credentials. The wildcard
is never emitted; `content/tests/test_security.py` asserts it.
