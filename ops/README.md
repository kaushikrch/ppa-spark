# iNRM PPA + Assortment Agentic AI Dashboard

A production-ready **Integrated NRM (iNRM)** dashboard covering **Price Pack Architecture (PPA) + Assortment** with **Agentic AI huddles**, built for **GCP Cloud Shell** deployment.

## 🚀 One-Click Cloud Shell Deployment

```bash
# Clone and deploy in Cloud Shell
git clone <YOUR_REPO_URL>
cd <REPO_NAME>
chmod +x ops/deploy.sh
./ops/deploy.sh
```

This command will:
- ✅ Build and deploy **FastAPI backend** + **React frontend** to Cloud Run
- ✅ Generate **realistic synthetic data** (18 months, 60 SKUs, 5 brands)
- ✅ Train **ML models** (elasticities, attribute importance, optimization)
- ✅ Set up **Vector Store + RAG** for intelligent search
- ✅ Configure **Agentic AI huddles** with multi-agent collaboration

## 🎯 Key Features

### 📊 **Executive-Grade Analytics**
- **KPI Dashboard**: Revenue, volume, margin, GM%, trade spend with trends
- **Price-Pack Ladder**: PPM analysis, whitespace matrix, channel corridors
- **Elasticity Matrix**: Own & cross-price elasticities with significance testing
- **Assortment Optimization**: MSL vs actual, perfect basket, cannibalization

### 🤖 **Agentic AI Capabilities**
- **Multi-Agent Huddles**: RAGAgent, OptimizationAgent, AssortmentAgent, CoachAgent
- **Pre-Built Prompts**: 8 business-ready prompt tiles for complex decisions
- **Bounded Debates**: Maximum 3 rounds with automatic consensus generation
- **Tool Integration**: Agents use optimization, simulation, and RAG tools
- **Vertex AI Gemini**: Low-latency generation using API key from Google credentials

### 🔍 **RAG-Powered Insights**
- **Table Search**: Query across all data tables with semantic similarity
- **Context Citations**: Every insight includes source table references
- **"Explain with GenAI"**: One-click chart explanations with data evidence
- **Copy-to-Clipboard**: Export insights and recommendations

### ⚡ **Interactive Simulators**
- **Price Simulator**: Real-time elasticity-based volume transfer
- **Delist Simulator**: Volume reallocation with similarity scoring
- **Pack-Size Changes**: NSV and margin impact analysis
- **Uncertainty Bands**: Confidence intervals and risk assessment

### 🎯 **MILP Optimization**
- **Guardrailed Constraints**: Price bounds, spend budget, shelf share minimums
- **Two-Round Strategy**: 20% bounds (Round 1), 40% bounds (Round 2)
- **Near-Bound Control**: Limit SKUs hitting bounds to ≤10%
- **Margin Maximization**: With regularization to prevent excessive changes

## 🏗️ Architecture

```
┌─ React Frontend (Cloud Run) ─┐    ┌─ FastAPI Backend (Cloud Run) ─┐
│ • Accenture Purple Theme     │    │ • Synthetic Data Generation   │
│ • Recharts Visualizations    │    │ • ML Models (sklearn, RF)     │
│ • Responsive C-Suite UI      │◄──►│ • MILP Optimization (PuLP)    │
│ • Shadcn/UI Components       │    │ • Vector Store (FAISS/TF-IDF)  │
└───────────────────────────────┘    │ • Multi-Agent Orchestration   │
                                     └────────────────────────────────┘
                                                    │
                                     ┌─ Data Layer (SQLite + Parquet) ─┐
                                     │ • sku_master, price_weekly      │
                                     │ • elasticities, guardrails      │
                                     │ • demand_weekly, costs          │
                                     └─────────────────────────────────┘
```

## 📁 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app with CORS
│   │   ├── synth_data.py        # Realistic data generation
│   │   ├── models/
│   │   │   ├── elasticities.py  # ML model training
│   │   │   ├── simulator.py     # What-if scenarios
│   │   │   └── optimizer.py     # MILP optimization
│   │   ├── rag/
│   │   │   ├── indexer.py       # Vector store indexing
│   │   │   └── retriever.py     # Semantic search
│   │   └── agents/
│   │       ├── orchestrator.py  # Multi-agent huddles
│   │       └── prompts.py       # Business prompt tiles
│   ├── requirements.txt         # Python dependencies
│   ├── Dockerfile              # Container config
│   └── cloudbuild.yaml         # Cloud Build config
├── ui/
│   ├── src/
│   │   ├── components/
│   │   │   ├── KPICards.tsx     # Executive metrics
│   │   │   ├── ElasticityMatrix.tsx
│   │   │   ├── AssortmentSim.tsx
│   │   │   ├── OptimizerView.tsx
│   │   │   └── AgenticHuddle.tsx
│   │   ├── pages/
│   │   │   ├── Landing.tsx      # Executive dashboard
│   │   │   ├── PPA.tsx          # Price-pack analysis
│   │   │   ├── Elasticities.tsx # Driver analysis
│   │   │   ├── Assortment.tsx   # SKU optimization
│   │   │   ├── Simulator.tsx    # What-if scenarios
│   │   │   ├── Optimizer.tsx    # MILP results
│   │   │   ├── Huddle.tsx       # AI collaboration
│   │   │   ├── RAG.tsx          # Search console
│   │   │   └── Decisions.tsx    # Export hub
│   │   └── lib/
│   │       ├── api.ts           # Backend integration
│   │       └── rag.ts           # Search utilities
│   ├── package.json
│   ├── Dockerfile
│   └── cloudbuild.yaml
└── ops/
    ├── deploy.sh                # One-click deployment
    └── README.md               # This file
```

## 🎨 Design System

**Accenture-Inspired Theme**:
- **Primary**: Purple (#8B5CF6) with glow variants
- **Gradients**: Sophisticated purple gradients throughout
- **Typography**: Clean, executive-focused hierarchy
- **Shadows**: Elegant purple shadows with hover effects
- **Cards**: Rounded cards with semantic background gradients

## 📈 Sample Business Questions (Prompt Tiles)

1. **"Where are price-pack ladder gaps by channel and what packs should fill them?"**
2. **"Which SKUs are cannibalizing each other most in Modern Trade?"**
3. **"Top 10 price moves within ±10% to maximize margin next quarter under budget X"**
4. **"If we delist 5 tail SKUs, where does volume transfer and what do we add instead?"**
5. **"Recommend pack-size changes for eCom to grow NSV without hurting GM%"**
6. **"Which promotions to reduce because of low ROI and high duplication?"**
7. **"What MSL should be enforced per region to meet shelf-share guardrails?"**
8. **"Create an executive summary for the proposed plan with risks and mitigations"**

## 🔧 Development

### Local Development (Optional)

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080

# Frontend
cd ui
npm install
npm run dev
```

### Environment Variables

The following are automatically configured by Cloud Run:
- `VITE_API_BASE`: Frontend → Backend URL
- `PROJECT_ID`: GCP project identifier
- `REGION`: Deployment region
- `GEMINI_API_KEY`: Retrieved from Secret Manager (`gemini-api-key`)

## 📊 Data Model

**Core Tables**:
- `sku_master`: 60 SKUs across 5 brands with realistic attributes
- `price_weekly`: 18 months of pricing with promotional depth
- `demand_weekly`: Volume response with base/uplift decomposition
- `elasticities`: Own & cross-price elasticities with significance
- `attributes_importance`: ML-driven feature importance (SHAP)
- `guardrails`: Price bounds and business constraints

**Realistic Characteristics**:
- ✅ Correlated price-volume relationships
- ✅ Seasonal patterns and calendar effects
- ✅ Brand-specific elasticity signatures
- ✅ Channel-dependent behavior
- ✅ Promotional response curves

## 🛡️ Security & Compliance

- **No Hardcoded Secrets**: Uses Cloud Run service accounts
- **CORS Enabled**: Secure frontend-backend communication
- **Input Validation**: Pydantic models for API validation
- **Error Handling**: Graceful degradation and user feedback
- **Rate Limiting**: Cloud Run automatic scaling and limits

## 🎯 Acceptance Criteria Checklist

- ✅ **Cloud Shell Deploy**: `bash ops/deploy.sh` → Two live Cloud Run services
- ✅ **Prompt Tiles**: Click any tile → 1-3 round agentic huddle with consensus
- ✅ **Elasticity Matrix**: Filters + "Explain with GenAI" with table citations
- ✅ **Simulator**: Real-time KPI updates on slider changes
- ✅ **Optimizer**: 20%/40% bounds, near-bound ≤10%, result visualization
- ✅ **Executive Grade**: C-suite ready design with Accenture theme
- ✅ **RAG Citations**: Every insight includes source table references
- ✅ **Export Ready**: CSV/Excel/PPT export with full decision log

## 📞 Support

For issues or questions:
1. Check Cloud Run logs: `gcloud logging read "resource.type=cloud_run_revision"`
2. Verify API health: `curl <API_URL>/health`
3. Test data generation: `curl -X POST <API_URL>/data/generate`

## 🏆 Production Readiness

This dashboard is designed for **real business use** with:
- **Scalable Architecture**: Auto-scaling Cloud Run services
- **ML-Powered Insights**: Trained elasticity and attribution models
- **Guardrailed Optimization**: Business-constraint-aware recommendations
- **Agentic Intelligence**: Multi-round collaborative AI decision-making
- **Executive Communication**: Export-ready insights and recommendations

**Deploy once, analyze forever.** 🚀