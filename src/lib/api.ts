import axios from "axios";

// Determine API base: allow localStorage override, build-time env or fallback to proxy
const storedOverride =
  typeof window !== "undefined" ? localStorage.getItem("API_BASE_OVERRIDE") : null;
export const API_BASE = storedOverride || import.meta.env.VITE_API_BASE || "/api";

// Optional auth token for secured APIs
const storedToken =
  typeof window !== "undefined" ? localStorage.getItem("API_TOKEN") : null;
export const API_TOKEN = storedToken || import.meta.env.VITE_API_TOKEN || "";

export const REQUEST_TIMEOUT_MS =
  Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS) || 600000;

const api = axios.create({
  baseURL: API_BASE,
  timeout: REQUEST_TIMEOUT_MS,
});

if (API_TOKEN) {
  api.defaults.headers.common["Authorization"] = `Bearer ${API_TOKEN}`;
  axios.defaults.headers.common["Authorization"] = `Bearer ${API_TOKEN}`;
}

// Types (unchanged)
export interface KPIData {
  revenue: number;
  volume: number;
  margin: number;
  gm_percent: number;
  spend: number;
}

export interface SimulationResult {
  agg: Array<{ week: number; units: number; revenue: number; margin: number }>;
  rows: Array<Record<string, unknown>>;
  summary?: {
    volume_change: number;
    revenue_change: number;
    margin_change: number;
  };
}

export interface OptimizationResult {
  solution: Array<Record<string, unknown>>;
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
    kpis?: Record<string, unknown>;
    recommendation?: Record<string, unknown>;
    timestamp: string;
  }>;
  stopped_after_rounds: number;
  final_recommendation?: Record<string, unknown>;
}

// API calls (unchanged except they now always go through /api)
export const apiService = {
  generateData: () => api.post("/data/generate"),
  trainModels: () => api.post("/models/train"),

  simulatePrice: (
    changes: Record<string, number>
  ): Promise<{ data: SimulationResult }> => api.post("/simulate/price", changes),
  simulateDelist: (
    ids: number[]
  ): Promise<{ data: { rows: Array<Record<string, unknown>> } }> =>
    api.post("/simulate/delist", ids),

  runOptimizer: (round: number = 1): Promise<{data: OptimizationResult}> =>
    api.post("/optimize/run", {}, { params: { round } }),

  ragSearch: (q: string): Promise<{data: {hits: Array<{doc: string; score: number}>}}> =>
    api.get("/rag/search", { params: { q } }),

  getInsight: (
    panelId: string,
    q?: string,
    data?: Array<Record<string, unknown>>
  ): Promise<{data: {insight: string}}> =>
    api.post("/genai/insight", { panel_id: panelId, q, data }),

  agenticHuddle: (question: string, budget?: number, rounds: number = 3) =>
    api.post("/huddle/run", { q: question, budget, rounds }),

  health: () => api.get("/healthz"),
};

export default api;
