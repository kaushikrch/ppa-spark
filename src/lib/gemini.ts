// Gemini AI integration for chart insights
export class GeminiService {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateInsight(panelId: string, title: string, context?: string): Promise<string> {
    const prompt = this.buildPrompt(panelId, title, context);
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 200,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate insight';
    } catch (error) {
      console.error('Gemini API failed:', error);
      throw error;
    }
  }

  private buildPrompt(panelId: string, title: string, context?: string): string {
    return `As a data analyst for a beverage company, provide a concise 2-3 sentence insight for this chart:

Panel: ${panelId}
Chart Title: ${title}
${context ? `Context: ${context}` : ''}

Focus on:
- Key business implications
- Actionable insights
- Performance trends
- Strategic opportunities

Keep it executive-ready and concise.`;
  }
}

// Create service instance - will be initialized when API key is available
export let geminiService: GeminiService | null = null;

export const initializeGemini = (apiKey: string) => {
  geminiService = new GeminiService(apiKey);
};

// For demo purposes, we'll use your provided API key
initializeGemini('AIzaSyAmOv2zkIZeWC9gQMD2SJz--9U78vmasVE');