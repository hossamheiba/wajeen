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

## Security notes

The access token lives in an HttpOnly, Secure, `SameSite=Strict` cookie scoped
to `/api/v1/admin`, so it is never attached to the public read.

Because the browser sends that cookie automatically, CSRF protection is
mandatory. `content/api/auth.py` does not use SimpleJWT's stock authentication
class: that class performs **no** CSRF check, which is safe for an
`Authorization` header and a hole once the token moves into a cookie. The
class here runs Django's CSRF machinery explicitly on every unsafe method,
login included.

`SameSite=Strict` is only viable because the API is a subdomain of the site
(`api.wjeen.com` / `www.wjeen.com`). Hosting the API on an unrelated domain
would force `SameSite=None` and reopen the whole CSRF surface.

CORS names the frontend origin explicitly and allows credentials. The wildcard
is never emitted; `content/tests/test_security.py` asserts it.
