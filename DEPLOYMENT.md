# Deploying Wjeen

Everything here is validated locally by `npm run test:production`: gunicorn with
`DEBUG` off, a separate media host, `collectstatic` and `check --deploy` as
gates, and one production build of the site and studio reading text from the
CMS. What that harness cannot provision — hosts, DNS, TLS, schedulers — is
listed as a prerequisite.

---

## 1. The parts

| Part | Runs as | Lives at |
|---|---|---|
| Public website **and** studio | one Next.js build on Vercel (project `wjeen`) | `https://www.wjeen.com` |
| CMS API | Django under **gunicorn**, behind a TLS-terminating proxy, on Postgres | `https://api.wjeen.com` |
| Media library | files under `WJEEN_MEDIA_ROOT`, served at `/media/` by the proxy — or an object store | `https://api.wjeen.com/media/` |
| Applicant CVs | files under `WJEEN_PRIVATE_ROOT` | **never served** — only through the authenticated download view |

The studio ships inside the public build. It renders no content of its own,
is `noindex` and frame-denied, and every byte it shows comes from the
authenticated API.

## 2. Prerequisites

- **Both hosts on `wjeen.com`.** The auth and CSRF cookies are
  `SameSite=Strict`, which only works because `www.wjeen.com` and
  `api.wjeen.com` are the same site. Every `*.vercel.app` subdomain is a
  *different* site (it is on the Public Suffix List), so **the studio cannot
  sign in on a `vercel.app` address**. The public pages work there; the studio
  does not.
- **Postgres 14 or later.** `cms/requirements.txt` allows Django 5.2, whose floor is 14. (The immutability trigger in `content/migrations/0002` only needs 11.)
- A **persistent** disk for `WJEEN_MEDIA_ROOT` and `WJEEN_PRIVATE_ROOT`, or an
  object store configured through `WJEEN_MEDIA_STORAGE` /
  `WJEEN_PRIVATE_STORAGE`.
- A TLS-terminating proxy in front of gunicorn that **overwrites**
  `X-Forwarded-Proto` and `X-Forwarded-For` on every request.
- A scheduler that can run a shell command and send an HTTP `POST` (section 7).

## 3. CMS — environment

| Variable | Production value | Notes |
|---|---|---|
| `DJANGO_DEBUG` | `0` | |
| `DJANGO_SECRET_KEY` | 50+ random characters | **Required.** With `DEBUG` off the process refuses to start without one: it signs every studio JWT. |
| `DJANGO_ALLOWED_HOSTS` | `api.wjeen.com` | |
| `POSTGRES_DB` `POSTGRES_USER` `POSTGRES_PASSWORD` `POSTGRES_HOST` `POSTGRES_PORT` | your database | |
| `CORS_ALLOWED_ORIGINS` | `https://www.wjeen.com` | exact origin, no wildcard |
| `CSRF_TRUSTED_ORIGINS` | `https://www.wjeen.com` | |
| `DJANGO_SECURE_SSL_REDIRECT` | `1` | |
| `DJANGO_SECURE_HSTS_SECONDS` | `31536000` | |
| `DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS` | `1` | |
| `DJANGO_SECURE_PROXY_SSL_HEADER` | `1` | **only** behind a proxy that overwrites `X-Forwarded-Proto` |
| `TRUST_PROXY_HEADER` | `1` | same condition, for `X-Forwarded-For` (login throttling keys on it) |
| `WJEEN_INQUIRY_TOKEN` | long random string | **identical** on the website |
| `WJEEN_MEDIA_ROOT` | e.g. `/data/media` | persistent |
| `WJEEN_MEDIA_URL` | `https://api.wjeen.com/media/` | or the object store / CDN origin |
| `WJEEN_PRIVATE_ROOT` | e.g. `/data/private` | persistent; **never** under anything the proxy serves |
| `WJEEN_STATIC_ROOT` | e.g. `/app/staticfiles` | where `collectstatic` writes |
| `WJEEN_MESSAGES_DIR` | only if `src/messages` is not at `../src/messages` from `cms/` | read by the first-deploy import |

Leave **unset**: `AUTH_COOKIE_DOMAIN`, `CSRF_COOKIE_DOMAIN` (the cookies stay
host-only on `api.wjeen.com`), `DJANGO_SECURE_HSTS_PRELOAD` (the preload list
is a one-way commitment; `check --deploy` silences its warning, W021, only while
preload is off). Cookie `Secure` flags need no variable — they follow `DEBUG`.

## 4. CMS — build and start

```sh
cd cms
pip install -r requirements.txt

python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py check --deploy --fail-level WARNING   # must exit 0 — treat anything else as a failed deploy

gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3 --timeout 30
```

**First deploy only**, on the empty database:

```sh
python manage.py import_messages      # the site's text, as revision #1
python manage.py import_media         # the images under public/, bound to the content
python manage.py createsuperuser      # the first editor
```

Both imports read from the repository checkout: `import_messages` from `src/messages` (override with `WJEEN_MESSAGES_DIR` or `--source`), `import_media` from `public/images` (override with `--public`).
Grant `inquiries.view_cv` only to the people who may download CVs; staff without
it can use the inbox but not open a CV.

## 5. Proxy

- Terminate TLS. Overwrite `X-Forwarded-Proto` and `X-Forwarded-For`.
- `/media/` → `WJEEN_MEDIA_ROOT`, read-only.
- `/static/` → `WJEEN_STATIC_ROOT`, read-only.
- Everything else → gunicorn.
- **Never** map `WJEEN_PRIVATE_ROOT`. CVs leave only through
  `/api/v1/admin/inquiries/<id>/cv/`, which checks the session and the permission.

With `DEBUG` off, Django serves neither `/media/` nor `/static/`: without these
two rules every CMS image and the Django admin's styles are 404s.

## 6. Website (Vercel) — environment

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://www.wjeen.com` | canonicals, hreflang, sitemap, JSON-LD |
| `NEXT_PUBLIC_CMS_API_URL` | `https://api.wjeen.com` | **build-time input** — see below |
| `NEXT_PUBLIC_CMS_MEDIA_URL` | only if media is not on the API host | build-time too; path must stay `/media/**` |
| `WJEEN_INQUIRY_TOKEN` | same value as the CMS | server-only |
| `MAIL_PROVIDER_API_KEY` `MAIL_TO` `MAIL_FROM` | Resend key and addresses | the `MAIL_FROM` domain must be verified in Resend |
| `WJEEN_CONTENT_SOURCE` | `json` at first, `cms` after verification (section 8) | server-only |

Leave `WJEEN_CONTENT_REVALIDATE` and `WJEEN_MEDIA_REVALIDATE` unset: both default
to 60 seconds.

**`NEXT_PUBLIC_CMS_API_URL` is baked into the build.** It is inlined into the
browser bundle and into the server chunks, so changing it means **rebuild and
redeploy**. Changing it without a rebuild is worse than not changing it:
`next start` re-reads `next.config.ts`, so next/image's allow-list follows the
new value while the code that builds image URLs keeps the old one — and every
CMS image is refused with a 400.

## 7. Scheduled jobs

| Job | Command | When |
|---|---|---|
| Re-send notifications that failed | `curl -fsS -X POST -H "X-Wjeen-Inquiry-Token: $WJEEN_INQUIRY_TOKEN" https://www.wjeen.com/api/contact/retry` | every 15 minutes |
| Delete CVs past retention (365 days) | `python manage.py purge_expired_cvs` (`--dry-run` to preview) | daily |

The retry endpoint answers `POST` only and authenticates with that header, so
**Vercel Cron cannot call it** (it sends `GET` with a bearer token). Run both
jobs from the CMS host's scheduler. A failed notification is never a lost
submission: the row is already in the inbox, and after
`WJEEN_NOTIFY_MAX_ATTEMPTS` (5) failures it is left for a person.

## 8. Go-live order

1. Provision Postgres, the persistent disk and the CMS host. Point `api.wjeen.com` at the proxy.
2. Set the CMS environment (section 3). Run section 4, including the first-deploy commands. `check --deploy` must exit 0.
3. Configure the proxy (section 5).
4. Point `www.wjeen.com` at Vercel. Set the website environment with **`WJEEN_CONTENT_SOURCE=json`**, then deploy.
5. Sign in at `https://www.wjeen.com/en/studio`. Confirm that CMS images render on the public pages.
6. Set **`WJEEN_CONTENT_SOURCE=cms`** and redeploy. Then publish a harmless change in the studio and watch it reach the page within a minute.
7. Schedule the two jobs (section 7).
8. Submit one real contact form and confirm it is in the inbox **and** that the email arrived.

Rolling text back to the bundled copy at any point: set `WJEEN_CONTENT_SOURCE=json` and redeploy. No data changes.

## 9. Behaviour to expect — not defects

- **A CMS outage** leaves every public page up, rendering the text bundled with the build. The contact form answers `503` and tells the visitor to retry — it never claims success for a submission it could not store.
- **Publishing** reaches the pages within the 60-second revalidation window. There is no webhook.
- **The website's own rate limiter** is per instance. The CMS's login and submission throttles are in Postgres and are the authoritative ones.
- **The studio** is part of the public build. Separating it would take a build flag, which has not been added.

## 10. Before every deploy

```sh
npm run lint && npx tsc --noEmit && npm run build
cms/.venv/bin/python cms/manage.py test --noinput
npx playwright test          # main suite — stop anything on :3000, :3100 and :8001 first
npm run test:content         # CMS text source, outage and cache
npm run test:studio-cms      # studio on the CMS source
npm run test:production      # gunicorn, DEBUG off, media host, deploy gates
```

The last three are isolated: they run on their own databases and ports, clean
up after themselves, and refuse to reuse a server they did not start.
