#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

REGISTRY=""
IMAGE_TAG="${IMAGE_TAG:-local-build}"
WEB_IMAGE_LOCAL="caddy-proxy-manager-web:${IMAGE_TAG}"
CADDY_IMAGE_LOCAL="caddy-proxy-manager-caddy:${IMAGE_TAG}"

PUID_WEB="${PUID_WEB:-10001}"
PGID_WEB="${PGID_WEB:-10001}"
PUID_CADDY="${PUID_CADDY:-10000}"
PGID_CADDY="${PGID_CADDY:-10000}"

usage() {
  cat <<'EOF'
Usage: ./tools/build.sh [--registry REGISTRY]

Builds local images tagged as:
  caddy-proxy-manager-web:local-build
  caddy-proxy-manager-caddy:local-build

If --registry is provided, the script also tags and pushes both images to that registry
using the same tag.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --registry)
      if [[ $# -lt 2 ]]; then
        echo "error: --registry requires a value" >&2
        exit 1
      fi
      REGISTRY="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

cd "${ROOT_DIR}"

docker build \
  --no-cache \
  --build-arg "PUID=${PUID_WEB}" \
  --build-arg "PGID=${PGID_WEB}" \
  -f docker/web/Dockerfile \
  -t "${WEB_IMAGE_LOCAL}" \
  .

docker build \
  --no-cache \
  --build-arg "PUID=${PUID_CADDY}" \
  --build-arg "PGID=${PGID_CADDY}" \
  -f docker/caddy/Dockerfile \
  -t "${CADDY_IMAGE_LOCAL}" \
  .

if [[ -n "${REGISTRY}" ]]; then
  WEB_IMAGE_REMOTE="${REGISTRY}/caddy-proxy-manager-web:${IMAGE_TAG}"
  CADDY_IMAGE_REMOTE="${REGISTRY}/caddy-proxy-manager-caddy:${IMAGE_TAG}"

  docker tag "${WEB_IMAGE_LOCAL}" "${WEB_IMAGE_REMOTE}"
  docker push "${WEB_IMAGE_REMOTE}"

  docker tag "${CADDY_IMAGE_LOCAL}" "${CADDY_IMAGE_REMOTE}"
  docker push "${CADDY_IMAGE_REMOTE}"
fi