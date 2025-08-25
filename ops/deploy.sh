#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Deploying iNRM PPA+Assortment Dashboard to GCP Cloud Run"

# Configuration
PROJECT_ID=${PROJECT_ID:-$(gcloud config get-value project)}
REGION=${REGION:-asia-south1}
REPO=${REPO:-ppa-assortment-repo}
GEMINI_SECRET=${GEMINI_SECRET:-gemini-api-key}

echo "📋 Configuration:"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Repository: $REPO"

# Create Artifact Registry repository if missing
echo "🏗️  Setting up Artifact Registry..."
if ! gcloud artifacts repositories describe $REPO --location=$REGION >/dev/null 2>&1; then
  echo "  Creating repository $REPO..."
  gcloud artifacts repositories create $REPO \
    --repository-format=docker \
    --location=$REGION \
    --description="PPA Assortment Analytics Repository"
fi

# Build and push backend API
echo "🔨 Building backend API..."
gcloud builds submit backend \
  --config backend/cloudbuild.yaml \
  --substitutions=_REGION=$REGION,_REPO=$REPO

BACK_IMG="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/ppa-api:latest"

# Deploy API to Cloud Run
echo "🚀 Deploying API to Cloud Run..."
gcloud run deploy ppa-api \
  --image=$BACK_IMG \
  --region=$REGION \
  --allow-unauthenticated \
  --port=8080 \
  --memory=16Gi \
  --cpu=4 \
  --timeout=1200 \
  --max-instances=10

# Get API URL (use Cloud Run-provided URL to avoid custom-domain latency issues)
API_URL=$(gcloud run services describe ppa-api --region=$REGION --format='value(status.url)')
echo "  API deployed at: $API_URL"

# Build UI with API URL
echo "🔨 Building frontend UI..."
gcloud builds submit . \
  --config ui/cloudbuild.yaml \
  --substitutions=_REGION=$REGION,_REPO=$REPO,_VITE_API_BASE=$API_URL

UI_IMG="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/ppa-ui:latest"

# Deploy UI to Cloud Run
echo "🚀 Deploying UI to Cloud Run..."
gcloud run deploy ppa-ui \
  --image=$UI_IMG \
  --region=$REGION \
  --allow-unauthenticated \
  --port=3000 \
  --memory=4Gi \
  --cpu=2 \
  --timeout=1000 \
  --max-instances=10 \
  --set-env-vars=API_URL=$API_URL,VITE_API_BASE=$API_URL
  
# Get UI URL (always the default Cloud Run URL)
UI_URL=$(gcloud run services describe ppa-ui --region=$REGION --format='value(status.url)')
echo "  UI deployed at: $UI_URL"

# Configure CORS and Gemini env on API
echo "🔧 Configuring API environment..."
gcloud run services update ppa-api \
  --region=$REGION \
  --set-env-vars=CORS_ORIGINS=$UI_URL \
  --set-secrets=GEMINI_API_KEY=$GEMINI_SECRET:latest


# Smoke tests
echo "🧪 Running smoke tests..."
"$(dirname "$0")/smoke_test.sh" "$API_URL" "$UI_URL"

# Initialize data and train models
echo "📊 Initializing demo data and training models..."
echo "  Generating synthetic data..."
curl -f --max-time 60 -X POST $API_URL/data/generate &
GEN_PID=$!

echo "  Training elasticity models..."
curl -f --max-time 120 -X POST $API_URL/models/train &
TRAIN_PID=$!

wait $GEN_PID || echo "  ⚠️  Data generation may have failed"
wait $TRAIN_PID || echo "  ⚠️  Model training may have failed"

# Final success message
echo ""
echo "✅ Deployment Complete!"
echo ""
echo "🌐 Access your iNRM Dashboard at:"
echo "   $UI_URL"
echo ""
echo "🔧 API Health Check:"
echo "   $API_URL/healthz"
echo ""
echo "📝 Next Steps:"
echo "   1. Visit the dashboard and click 'Initialize Demo Data' if needed"
echo "   2. Explore the Agentic AI Huddle for complex analysis"
echo "   3. Use the RAG Search to query your data"
echo "   4. Run price optimization scenarios"
echo ""
echo "🎯 Production-ready features:"
echo "   ✓ Synthetic data generation"
echo "   ✓ ML model training (elasticities, RF importance)"
echo "   ✓ MILP optimization with constraints"
echo "   ✓ Multi-agent AI huddles (max 3 rounds)"
echo "   ✓ RAG-powered insights and citations"
echo "   ✓ Interactive simulators and visualizations"
echo ""
