#!/usr/bin/env bash
#
# Builds the app here and uploads it to the server. Run from THIS machine, in
# Git Bash, not on the server: shared hosting has no Node to build with.
#
#     ./deploy.sh
#
# Where it goes lives in .deploy.env next to this file (not committed --
# it names your server and cPanel user):
#
#     DEPLOY_HOST=cpaneluser@rachelscloset.com.ng
#     DEPLOY_PORT=21098
#     DEPLOY_DIR=app.rachelscloset.com.ng      # relative to the cPanel home
#
# It uses the SSH key you already connect with; nothing here holds a password.

set -euo pipefail

cd "$(dirname "$0")"

if [ -f .deploy.env ]; then
    # shellcheck disable=SC1091
    . ./.deploy.env
fi

: "${DEPLOY_HOST:?Set DEPLOY_HOST in .deploy.env, e.g. cpaneluser@rachelscloset.com.ng}"
: "${DEPLOY_DIR:?Set DEPLOY_DIR in .deploy.env, e.g. app.rachelscloset.com.ng}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"

ssh_cmd=(ssh -p "$DEPLOY_PORT" "$DEPLOY_HOST")

# A build is only worth uploading if it is the committed code. Uploading a
# half-finished edit is how the live app ends up matching no commit at all.
if [ -n "$(git status --porcelain)" ]; then
    echo "Uncommitted changes here. Commit them first, so the live app is a known version:" >&2
    git status --short >&2
    exit 1
fi

echo "==> Checking types"
npm run typecheck

echo "==> Building $(git rev-parse --short HEAD)"
rm -rf dist
npm run build

# The production addresses are read from .env.production. Check they made it
# in, rather than discover a live app quietly talking to localhost.
if ! grep -q "rachelscloset.com.ng" dist/assets/*.js; then
    echo "The build does not contain the production API address. Check .env.production." >&2
    exit 1
fi

# Two passes, in an order that never breaks a page being loaded mid-upload:
# the new scripts first, while the old index.html still names the old ones
# (which stay on the server); then the index.html that names the new ones.
# Old hashed files are left in place on purpose -- a phone that loaded the
# previous version a minute ago can still fetch the pieces it asks for.
echo "==> Uploading assets to ${DEPLOY_HOST}:${DEPLOY_DIR}"
tar -C dist --exclude=./index.html -cf - . \
    | "${ssh_cmd[@]}" "mkdir -p '${DEPLOY_DIR}' && tar -C '${DEPLOY_DIR}' -xf -"

echo "==> Switching to the new version"
tar -C dist -cf - ./index.html \
    | "${ssh_cmd[@]}" "tar -C '${DEPLOY_DIR}' -xf -"

echo "Deployed $(git rev-parse --short HEAD): $(git log -1 --pretty=%s)"
