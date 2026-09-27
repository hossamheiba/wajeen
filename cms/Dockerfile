# The CMS API, as a container.
#
# Django under gunicorn, with `collectstatic` run at build time so the image
# carries the admin's own CSS and starting a revision does no filesystem work.
# Nothing else is baked in: the database, the buckets, the secret and the
# allowed hosts are all read from the environment, because the same image is
# what runs in staging and in production.
#
#   docker build -f cms/Dockerfile -t wjeen-cms .
#
# The context is the repository root, not `cms/`: `import_messages` and
# `import_media` read the site's own `src/messages` and `public/images` on a
# first deploy, and a build context rooted at `cms/` cannot see them.
#
# Migrations are deliberately **not** run here. A container image is built once
# and may start dozens of instances; a schema change belongs to one deliberate
# step — see GOOGLE-CLOUD.md, which runs it as a Cloud Run job.

FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

WORKDIR /app

# `psycopg[binary]` ships its own libpq, and Pillow's wheels are manylinux, so
# no compiler is needed — the image stays small and has no build toolchain in
# it for anything to reach.
COPY cms/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY cms/ /app/

# The text the site ships with, and the photographs behind it: what the two
# first-deploy import commands read. `WJEEN_MESSAGES_DIR` points at the copy,
# and `import_media --public` is given the other one.
COPY src/messages /seed/messages
COPY public/images /seed/images
ENV WJEEN_MESSAGES_DIR=/seed/messages

# Static files, collected into the image. A dummy key and host are enough for
# this command and are replaced by the real environment at run time.
ENV WJEEN_STATIC_ROOT=/app/staticfiles
RUN DJANGO_DEBUG=0 \
    DJANGO_SECRET_KEY=build-time-only-not-used-at-runtime \
    DJANGO_ALLOWED_HOSTS=localhost \
    python manage.py collectstatic --noinput

# Runs as a user that owns nothing it does not need — but does own a home:
# gunicorn opens a control socket under `$HOME`, and a system user without one
# logs a permission error on every boot.
RUN useradd --system --uid 1001 --create-home --home-dir /home/wjeen wjeen \
    # The three directories a deployment mounts volumes over. They exist here,
    # owned by the user the process runs as, because Docker seeds an empty
    # named volume from the image — including its ownership. Without them the
    # volume arrives owned by root and the first upload fails.
    && mkdir -p /data/media /data/private /data/static \
    && chown -R wjeen:wjeen /app /seed /home/wjeen /data
ENV HOME=/home/wjeen
USER wjeen

EXPOSE 8080

# One worker per CPU is the usual rule; Cloud Run gives a small instance and
# charges for it, so this stays modest and scales by instance instead. The
# timeout is shorter than Cloud Run's own, so a stuck request is retried by a
# fresh worker rather than held until the platform gives up.
CMD exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:${PORT} \
    --workers ${WEB_CONCURRENCY:-2} \
    --threads 4 \
    --timeout 30 \
    --access-logfile - \
    --error-logfile -
