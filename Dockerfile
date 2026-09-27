# The public website and the studio, as one container.
#
# They are one Next.js application and always have been: the studio is a route
# group inside it, `/[locale]/studio`, and `NEXT_PUBLIC_CMS_API_URL` is what
# switches it on. Splitting them would take a build flag that does not exist.
#
# Three stages so the image carries no toolchain and no source: `deps` installs
# from the lockfile, `build` compiles, and the last stage copies only
# `.next/standalone` — the server plus the dependencies it actually imports.
#
#   docker build -f Dockerfile \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://www.example.com \
#     --build-arg NEXT_PUBLIC_CMS_API_URL=https://api.example.com \
#     -t wjeen-site .
#
# Both of those are **build inputs**, not run-time settings: Next inlines every
# `NEXT_PUBLIC_*` into the bundle it compiles. Changing one means building and
# deploying a new image — see GOOGLE-CLOUD.md.

# ---------------------------------------------------------------- deps
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --------------------------------------------------------------- build
FROM node:22-alpine AS build
WORKDIR /app

# Baked into the bundle. Empty means "no CMS": the site serves the text and
# images that ship with the build, and the studio's routes answer 404 — which
# is a deliberate, testable state, not a misconfiguration.
ARG NEXT_PUBLIC_SITE_URL=""
ARG NEXT_PUBLIC_CMS_API_URL=""
ARG NEXT_PUBLIC_CMS_MEDIA_URL=""
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_CMS_API_URL=$NEXT_PUBLIC_CMS_API_URL \
    NEXT_PUBLIC_CMS_MEDIA_URL=$NEXT_PUBLIC_CMS_MEDIA_URL \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
# Named rather than `COPY . .`: the build context is the repository root — it
# has to be, so the CMS image can reach `src/messages` — and the website has no
# business carrying the Django app, the test suites or the design archives
# into its build.
COPY package.json package-lock.json next.config.ts tsconfig.json ./
COPY postcss.config.mjs eslint.config.mjs next-env.d.ts ./
COPY src ./src
COPY public ./public
RUN npm run build

# ----------------------------------------------------------------- run
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0

# Runs as a user that owns nothing it does not need.
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# `public/` is not in the standalone output: it holds the photographs the site
# falls back to whenever the CMS is unreachable, so it is copied deliberately.
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 8080

# Cloud Run sends SIGTERM and gives the process ten seconds; node handles it.
CMD ["node", "server.js"]
