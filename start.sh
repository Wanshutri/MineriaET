#!/usr/bin/env bash

# =================================================================================
# deploy.sh
#
# Usage:
#   ./deploy.sh local           # Run locally with Docker Compose
#   ./deploy.sh deploy          # Deploy to Google Cloud Run
#
# Prerequisites for 'deploy' mode:
#   1. gcloud CLI installed and authenticated (gcloud auth login).
#   2. GCP project set (gcloud config set project YOUR_PROJECT_ID).
#   3. Docker installed and running.
#   4. Optionally set CLOUD_RUN_REGION (default: us-central1).
#
# This script will:
#   - Build & push 'api' and 'web' images to Google Container Registry.
#   - Deploy 'api' and 'web' as separate Cloud Run services.
#   - Generate an nginx default.conf that proxies /api/ -> api service
#     and /      -> web service.
#   - Build & push an nginx image with that generated config.
#   - Deploy the nginx image as a Cloud Run service.
#   - Print out the final URL of the nginx service.
#   - Exit with non-zero on any error.
# =================================================================================

set -euo pipefail

# ---------------------------------------
# Configuration & Helper Functions
# ---------------------------------------

# If CLOUD_RUN_REGION is set, use it; otherwise default to "us-central1".
REGION="${CLOUD_RUN_REGION:-us-central1}"

# Use the currently configured gcloud project.
PROJECT_ID="$(gcloud config get-value project 2>/dev/null || echo "")"
if [[ -z "$PROJECT_ID" ]]; then
  echo "Error: No GCP project set. Run 'gcloud config set project YOUR_PROJECT_ID', then retry."
  exit 1
fi

# Fully-qualified image names in GCR
IMAGE_API="gcr.io/${PROJECT_ID}/api"
IMAGE_WEB="gcr.io/${PROJECT_ID}/web"
IMAGE_NGINX="gcr.io/${PROJECT_ID}/nginx"

# Temporary directory for building nginx container
NGINX_BUILD_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "${NGINX_BUILD_DIR}"
}
trap cleanup EXIT

# Print usage information
usage() {
  echo "Usage: $0 {local|deploy}"
  echo "  local   - run docker-compose up locally"
  echo "  deploy  - build, push, and deploy to Cloud Run"
  exit 1
}

# ---------------------------------------
# Main Logic
# ---------------------------------------

if [[ $# -ne 1 ]]; then
  usage
fi

MODE="$1"

if [[ "$MODE" == "local" ]]; then
  echo "👉 Running in local mode with docker-compose..."
  docker-compose up
  exit 0

elif [[ "$MODE" == "deploy" ]]; then
  echo "👉 Starting Cloud Run deployment..."
  echo "    Project: $PROJECT_ID"
  echo "    Region:  $REGION"
  echo

  # ---------------------------------------
  # Step 1: Build & Push API Service
  # ---------------------------------------
  echo ">>> Building API image..."
  docker build -t "${IMAGE_API}" ./api
  echo ">>> Pushing API image to Container Registry..."
  docker push "${IMAGE_API}"

  echo ">>> Deploying API to Cloud Run..."
  gcloud run deploy api \
    --image "${IMAGE_API}" \
    --region "${REGION}" \
    --platform managed \
    --allow-unauthenticated \
    --quiet

  # Retrieve the API URL
  API_URL="$(gcloud run services describe api \
    --platform managed \
    --region "${REGION}" \
    --format "value(status.url)")"
  if [[ -z "$API_URL" ]]; then
    echo "Error: could not fetch API service URL."
    exit 1
  fi
  echo "    ✔ API deployed at: $API_URL"
  echo

  # ---------------------------------------
  # Step 2: Build & Push Web Service
  # ---------------------------------------
  echo ">>> Building Web image..."
  docker build -t "${IMAGE_WEB}" ./web
  echo ">>> Pushing Web image to Container Registry..."
  docker push "${IMAGE_WEB}"

  echo ">>> Deploying Web to Cloud Run..."
  gcloud run deploy web \
    --image "${IMAGE_WEB}" \
    --region "${REGION}" \
    --platform managed \
    --allow-unauthenticated \
    --quiet

  # Retrieve the Web URL
  WEB_URL="$(gcloud run services describe web \
    --platform managed \
    --region "${REGION}" \
    --format "value(status.url)")"
  if [[ -z "$WEB_URL" ]]; then
    echo "Error: could not fetch Web service URL."
    exit 1
  fi
  echo "    ✔ Web deployed at: $WEB_URL"
  echo

  # ---------------------------------------
  # Step 3: Generate Nginx Default Configuration
  # ---------------------------------------
  echo ">>> Generating nginx default.conf for Cloud Run..."
  # Create a minimal Nginx config that proxies /api/ -> API_URL
  # and everything else -> WEB_URL
  cat > "${NGINX_BUILD_DIR}/default.conf" <<EOF
server {
    listen 8080;

    # Proxy any request to /api/ to the Cloud Run API service
    location /api/ {
        proxy_pass ${API_URL};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # Proxy all other requests to the Cloud Run Web service
    location / {
        proxy_pass ${WEB_URL};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

  # ---------------------------------------
  # Step 4: Create Dockerfile for Nginx
  # ---------------------------------------
  echo ">>> Creating Dockerfile for nginx in ${NGINX_BUILD_DIR}..."
  cat > "${NGINX_BUILD_DIR}/Dockerfile" <<EOF
# Use the same nginx base image as in your docker-compose
FROM nginx:1.28.0-alpine-slim

# Copy our generated default.conf into the container
COPY default.conf /etc/nginx/conf.d/default.conf
EOF

  # ---------------------------------------
  # Step 5: Build & Push Nginx Image
  # ---------------------------------------
  echo ">>> Building nginx image..."
  docker build -t "${IMAGE_NGINX}" "${NGINX_BUILD_DIR}"

  echo ">>> Pushing nginx image to Container Registry..."
  docker push "${IMAGE_NGINX}"
  echo

  # ---------------------------------------
  # Step 6: Deploy Nginx to Cloud Run
  # ---------------------------------------
  echo ">>> Deploying nginx to Cloud Run..."
  gcloud run deploy nginx \
    --image "${IMAGE_NGINX}" \
    --region "${REGION}" \
    --platform managed \
    --allow-unauthenticated \
    --quiet

  NGINX_URL="$(gcloud run services describe nginx \
    --platform managed \
    --region "${REGION}" \
    --format "value(status.url)")"
  if [[ -z "$NGINX_URL" ]]; then
    echo "Error: could not fetch nginx service URL."
    exit 1
  fi
  echo "    ✔ Nginx deployed at: $NGINX_URL"
  echo

  # ---------------------------------------
  # Step 7: Summary
  # ---------------------------------------
  echo "✅ Deployment complete!"
  echo "Your application is now available at:"
  echo
  echo "    🔗  ${NGINX_URL}"
  echo
  echo "Requests to /api/ will be forwarded to ${API_URL}"
  echo "All other requests will be forwarded to ${WEB_URL}"
  echo
  exit 0

else
  usage
fi
