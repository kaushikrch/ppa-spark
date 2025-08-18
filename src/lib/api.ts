import axios from 'axios';

// Prefer explicit override for dev; else same-origin /api
const OVERRIDE = localStorage.getItem('API_BASE_OVERRIDE') || '';
export let API_BASE: string = OVERRIDE || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

async function tryHealth(base: string, timeoutMs = 2500): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const norm = (b: string) => b.replace(/\/$/, "");
    const baseNorm = norm(base);
    let res: Response | undefined;
    try {
      res = await fetch(`${baseNorm}/healthz`, { signal: ctrl.signal });
    } catch {
      res = await fetch(`${baseNorm}/health`, { signal: ctrl.signal });
    }
    clearTimeout(t);
    if (!res || !res.ok) return false;
    const j = await res.json().catch(() => ({}));
    return Boolean(j) && (j.ok === true || j.status === 'healthy' || j.version);
  } catch {
    return false;
  }
}

async function resolveApiBase() {
  const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));
  const ls = (k: string) => localStorage.getItem(k) || '';
  const override = ls('API_BASE_OVERRIDE');
  const envBase = (import.meta as any).env?.VITE_API_BASE || '';

  const candidates = uniq([
    '/api',
    override,
    envBase,
    // Cloud Run URL heuristics based on current origin
    window.location.origin.replace('-ui', '-api'),
    window.location.origin.replace('ui-', 'api-'),
    window.location.origin.replace('ppa-ui', 'ppa-api'),
    // Known patterns from earlier attempts
    'https://ppa-api-526d60d2-b2b5-465a-b564-1a6f46672e47.lovableproject.com',
    'https://526d60d2-b2b5-465a-b564-1a6f46672e47-api.lovableproject.com',
    // Local dev fallbacks
    'http://localhost:8000',
    'http://localhost:8080',
  ]);

  for (const base of candidates) {
    const ok = await tryHealth(base);
    if (ok) {
      API_BASE = base.replace(/\/$/, '');
      api.defaults.baseURL = API_BASE;
      localStorage.setItem('API_BASE_SELECTED', API_BASE);
      console.info('[API] Using base:', API_BASE);
      return API_BASE;
    }
  }
  console.warn('[API] No healthy API base found; staying on', API_BASE);
  return API_BASE;
}

// Resolve on load (non-blocking)
resolveApiBase().catch(() => {});



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
    api.post('/huddle/run', { q: question, budget }),
  
  // Health check
  health: () => api.get('/healthz'),
};

export default api;