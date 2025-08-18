import axios from 'axios';

// Force same-origin proxy path; no more discovery/overrides:
export const API_BASE = "/api";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

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
  health: () => api.get('/healthz'),
};

export default api;