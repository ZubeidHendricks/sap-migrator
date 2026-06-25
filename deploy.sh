#!/bin/bash
# SAP Migrator — full deploy to DigitalOcean App Platform
# Run once: chmod +x deploy.sh && ./deploy.sh
set -e

REGISTRY="registry.digitalocean.com/carta-ta"
IMAGE="$REGISTRY/sap-migrator"
TAG="${1:-latest}"

echo ""
echo "==> [1/4] Authenticating with DigitalOcean Container Registry..."
doctl registry login

echo ""
echo "==> [2/4] Building Docker image (standalone Next.js)..."
docker build -t "$IMAGE:$TAG" -t "$IMAGE:latest" .

echo ""
echo "==> [3/4] Pushing image to registry..."
docker push "$IMAGE:$TAG"
docker push "$IMAGE:latest"

echo ""
echo "==> [4/4] Creating App Platform app..."

# Update NEXTAUTH_SECRET with a real random value before creating the app
SECRET=$(openssl rand -base64 32)
sed -i.bak "s|REPLACE_WITH_OUTPUT_OF: openssl rand -base64 32|$SECRET|" .do/app.yaml

doctl apps create --spec .do/app.yaml

# Restore placeholder (so the file stays clean in git)
mv .do/app.yaml.bak.bak .do/app.yaml 2>/dev/null || true
sed -i.bak "s|$SECRET|REPLACE_WITH_OUTPUT_OF: openssl rand -base64 32|" .do/app.yaml
rm -f .do/app.yaml.bak

echo ""
echo "============================================================"
echo "  Deployed! Resources:"
echo "  App:      https://cloud.digitalocean.com/apps"
echo "  Database: https://cloud.digitalocean.com/databases"
echo "  Registry: https://cloud.digitalocean.com/registry"
echo ""
echo "  The database is still provisioning (~5 min)."
echo "  App Platform will retry until the DB is ready."
echo ""
echo "  After first deploy, update NEXTAUTH_URL in App settings"
echo "  to your assigned .ondigitalocean.app domain."
echo "============================================================"
