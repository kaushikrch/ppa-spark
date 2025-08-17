import { apiService } from './api';

export interface RAGHit {
  doc: string;
  score: number;
}

export class RAGService {
  async search(query: string): Promise<RAGHit[]> {
    try {
      const response = await apiService.ragSearch(query);
      return response.data.hits;
    } catch (error) {
      console.error('RAG search failed:', error);
      return [];
    }
  }

  async explainChart(panelId: string, customQuery?: string): Promise<string> {
    try {
      const response = await apiService.getInsight(panelId, customQuery);
      return response.data.insight;
    } catch (error) {
      console.error('Chart explanation failed:', error);
      return 'Unable to generate explanation at this time.';
    }
  }

  formatHits(hits: RAGHit[]): string {
    return hits.map((hit, i) => `${i + 1}. (Score: ${hit.score.toFixed(2)}) ${hit.doc}`).join('\n\n');
  }
}

export const ragService = new RAGService();