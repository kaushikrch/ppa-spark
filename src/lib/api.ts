import axios from 'axios';

// Dynamic API base resolution with fallback and localStorage override
let API_BASE: string = (import.meta as any).env?.VITE_API_BASE || localStorage.getItem('API_BASE_SELECTED') || 'http://localhost:8080';

export { API_BASE };

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

async function tryHealth(base: string, timeoutMs = 2500): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    // Try both /healthz and /health for compatibility
    let res;
    try {
      res = await fetch(`${base.replace(/\/$/, '')}/healthz`, { signal: ctrl.signal });
    } catch {
      res = await fetch(`${base.replace(/\/$/, '')}/health`, { signal: ctrl.signal });
    }
    clearTimeout(t);
    if (!res.ok) return false;
    const j = await res.json().catch(() => ({}));
    return Boolean(j) && (j.ok === true || j.status === 'healthy' || j.version);
  } catch {
    return false;
  }
}

async function resolveApiBase() {
  const candidates = [
    localStorage.getItem('API_BASE_OVERRIDE') || '',
    (import.meta as any).env?.VITE_API_BASE || '',
    // More comprehensive heuristics for Cloud Run patterns
    window.location.origin.replace('-ui', '-api'),
    window.location.origin.replace('ui-', 'api-'),
    window.location.origin.replace('ppa-ui', 'ppa-api'),
    // Try common patterns for your project ID
    `https://ppa-api-526d60d2-b2b5-465a-b564-1a6f46672e47.lovableproject.com`,
    `https://526d60d2-b2b5-465a-b564-1a6f46672e47-api.lovableproject.com`,
    window.location.origin, // same-origin (only if backend co-hosted)
    'http://localhost:8000',
    'http://localhost:8080',
  ].filter(Boolean);

  for (const base of candidates) {
    // Skip if it's obviously the current UI and not an API
    if (!base) continue;
    const ok = await tryHealth(base);
    if (ok) {
      API_BASE = base.replace(/\/$/, '');
      api.defaults.baseURL = API_BASE;
      localStorage.setItem('API_BASE_SELECTED', API_BASE);
      console.info('[API] Using base:', API_BASE);
      return API_BASE;
    }
  }
  console.warn('[API] No healthy API base found, staying on', API_BASE);
  return API_BASE;
}

// Kick off resolution on load (best-effort)
resolveApiBase();

export interface KPIData {
  revenue: number;
  volume: number;
  margin: number;
  gm_percent: number;
  spend: number;
}

export interface SimulationResult {
  agg: Array<{week: number; units: number; revenue: number; margin: number}>;
  rows: Array<any>;
}

export interface OptimizationResult {
  solution: Array<any>;
  kpis: {
    status: string;
    n_near_bound: number;
    rev: number;
    margin: number;
  };
}

export interface HuddleResult {
  rounds: Array<{
    role: string;
    content: string;
    evidence?: string[];
    kpis?: any;
    recommendation?: any;
    timestamp: string;
  }>;
  stopped_after_rounds: number;
  final_recommendation?: any;
}

export const apiService = {
  // Data generation
  generateData: () => api.post('/data/generate'),
  trainModels: () => api.post('/models/train'),
  
  // Simulation
  simulatePrice: (changes: Record<string, number>): Promise<{data: SimulationResult}> => 
    api.post('/simulate/price', changes),
  simulateDelist: (ids: number[]): Promise<{data: {rows: any[]}}> => 
    api.post('/simulate/delist', ids),
  
  // Optimization
  runOptimizer: (round: number = 1): Promise<{data: OptimizationResult}> => 
    api.post('/optimize/run', {}, {params: {round}}),
  
  // RAG
  ragSearch: (q: string): Promise<{data: {hits: Array<{doc: string; score: number}>}}> => 
    api.get('/rag/search', {params: {q}}),
  
  // GenAI insights
  getInsight: (panelId: string, q?: string): Promise<{data: {insight: string}}> => 
    api.get('/genai/insight', {params: {panel_id: panelId, q}}),
  
  // Agentic huddle
  agenticHuddle: (question: string, budget?: number): Promise<{data: HuddleResult}> => 
    api.post('/agents/huddle', {}, {params: {question, budget}}),
  
  // Health check
  health: () => api.get('/health'),
};

export default api;