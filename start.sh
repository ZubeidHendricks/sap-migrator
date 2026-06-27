#!/bin/sh
# NOTE: deliberately no `set -e`. A migration hiccup must never prevent the
# web server from starting — otherwise the container fails its health check
# and the whole deployment is rolled back, taking the app offline.

echo "Running database migrations..."

# Retry the schema push a few times in case the database is still waking up.
# --accept-data-loss lets additive/cleanup schema changes apply non-interactively;
# the Prisma schema is the source of truth for this app.
i=1
while [ "$i" -le 3 ]; do
  if node_modules/.bin/prisma db push --skip-generate --accept-data-loss; then
    echo "Database schema is up to date."
    break
  fi
  echo "prisma db push failed (attempt $i/3). Retrying in 3s..."
  i=$((i + 1))
  sleep 3
done

if [ "$i" -gt 3 ]; then
  echo "WARNING: could not apply schema after 3 attempts. Starting server anyway."
fi

echo "Starting server..."
exec node server.js
