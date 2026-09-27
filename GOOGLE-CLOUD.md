# Wjeen on Google Cloud

One Compute Engine machine in `me-central1`, four containers on it, and a
`docker compose` that deploys from images GitHub builds. Everything here was
run rather than written: the machine, the certificates, the schema, the first
import and the studio signing in are all live.

`DEPLOYMENT.md` still describes the parts and the behaviour to expect. This
file replaces its *Vercel* section.

---

## 1. What is running

| Part | Where |
|---|---|
| Machine | `wjeen-prod`, e2-medium, `me-central1-a`, static IP **34.1.35.125** |
| Website **and** studio | container `site`, behind Caddy |
| CMS API, admin, media | container `cms` (gunicorn), behind Caddy |
| Database | container `db` (Postgres 16), on a named volume |
| TLS and routing | container `caddy`, certificates from Let's Encrypt |
| Images | Artifact Registry, `me-central1-docker.pkg.dev/astute-sky-477312-c3/wjeen` |

**One hostname, not two.** `wjeen.yellostack.com` serves the website, the
studio at `/ar/studio`, and the CMS under `/api/v1/*`, `/admin/*`, `/media/*`
and `/static/*` — their paths do not overlap. That is deliberate: the studio's
session cookie is then *same-origin*, which no browser policy can refuse. Two
names would work only while both stayed under one registrable domain, which is
what made `*.run.app` and `*.vercel.app` unusable for the dashboard.

`deploy/Caddyfile` carries a commented two-name variant for the day the real
domain arrives.

## 2. Deploying

Push to `main`. `.github/workflows/deploy.yml` runs the gates, builds both
images for `linux/amd64`, pushes them, then on the server: `compose pull` →
`migrate` → `collectstatic` → `compose up -d`.

By hand, if ever needed:

```sh
REG=me-central1-docker.pkg.dev/astute-sky-477312-c3/wjeen
docker buildx build --platform linux/amd64 -f cms/Dockerfile -t $REG/wjeen-cms:latest --push .
docker buildx build --platform linux/amd64 -f Dockerfile \
  --build-arg NEXT_PUBLIC_SITE_URL=https://wjeen.yellostack.com \
  --build-arg NEXT_PUBLIC_CMS_API_URL=https://wjeen.yellostack.com \
  -t $REG/wjeen-site:latest --push .

gcloud compute ssh wjeen-prod --zone=me-central1-a --tunnel-through-iap --command \
  "cd /opt/wjeen && sudo docker compose pull && sudo docker compose up -d"
```

**Both images build from the repository root** — the CMS image copies the
site's own `src/messages` and `public/images`, which the first-deploy imports
read, and a context rooted at `cms/` cannot see them.

**`NEXT_PUBLIC_*` are build inputs.** Next compiles them into the bundle, so
changing the site's address means a new image, not a variable on the server.
Building on an Apple Silicon machine needs `--platform linux/amd64`, or the
server refuses the image as "no matching manifest".

## 3. The server's own files

`/opt/wjeen` holds three things, and nothing else:

| File | What it is |
|---|---|
| `docker-compose.yml` | copied from `deploy/` |
| `Caddyfile` | copied from `deploy/` |
| `.env` | the secrets — **not** in the repository |

`.env` holds `DJANGO_SECRET_KEY`, `POSTGRES_PASSWORD`, `WJEEN_INQUIRY_TOKEN`,
the hostname and the registry. It is `chmod 600` and was generated on the day
of the deploy; losing it means the studio's sessions and the stored inquiry
token have to be reissued, so keep a copy somewhere safe.

## 4. First deploy, once

Already done on this machine, listed for the next one:

```sh
cd /opt/wjeen
sudo docker compose up -d
sudo docker compose run --rm cms python manage.py migrate --noinput
sudo docker compose run --rm cms python manage.py collectstatic --noinput
sudo docker compose run --rm cms python manage.py import_messages   # the text, as revision #1
sudo docker compose run --rm cms python manage.py import_media --public /seed
sudo docker compose run --rm cms python manage.py createsuperuser   # the first editor
```

`check --deploy --fail-level WARNING` exits 0 on this configuration; treat
anything else as a failed deploy.

## 5. Text from the CMS

The site ships with a copy of its own text and serves that by default. To read
from the CMS instead, set `WJEEN_CONTENT_SOURCE=cms` in `/opt/wjeen/.env` and
`sudo docker compose up -d site`. Rolling back is the same line with `json`.

A published change reaches the pages within a minute — there is no webhook,
and `WJEEN_CONTENT_REVALIDATE` (default 60s) is the window.

## 6. Backups

Postgres lives on the `wjeen_db-data` volume. A dump, and where to put it:

```sh
sudo docker compose exec -T db pg_dump -U wjeen wjeen_cms | gzip > wjeen-$(date +%F).sql.gz
gcloud storage cp wjeen-*.sql.gz gs://<a-bucket-you-create>/
```

The library's images are on `wjeen_cms-media` and the CVs on
`wjeen_cms-private`; both are worth the same treatment. Scheduling this is the
one production job still to set up.

## 7. Rolling back

Images are tagged with the commit that built them:

```sh
# on the server
sudo docker compose pull   # after setting TAG=<sha> in .env
sudo docker compose up -d
```

A **content** rollback is a different thing and belongs in the studio: its
version history restores the words without touching the deployment. Images are
not part of that history — see DEPLOYMENT.md §9.

## 8. Before every deploy

```sh
npm run lint && npx tsc --noEmit && npm run build
(cd cms && python manage.py test --noinput)   # from cms/, or it discovers nothing
npx playwright test          # main suite — stop anything on :3000, :3100 and :8001 first
npm run test:content         # CMS text source, outage and cache
npm run test:studio-cms      # studio on the CMS source
npm run test:production      # gunicorn, DEBUG off, media host, deploy gates
```

GitHub runs the first two on every push. The three Playwright harnesses need
their own databases and ports, which is why they stay a local gate.
