import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Brain, Loader2 } from 'lucide-react';
import { apiService } from '../lib/api';

interface ChartWithInsightProps {
  panelId: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}

const ChartWithInsight: React.FC<ChartWithInsightProps> = ({ 
  panelId, 
  title, 
  children, 
  className = "" 
}) => {
  const [insight, setInsight] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showInsight, setShowInsight] = useState(false);

  const generateInsight = async () => {
    setLoading(true);
    try {
      const { data } = await apiService.getInsight(panelId, title);
      setInsight(data.insight);
      setShowInsight(true);
    } catch (error) {
      console.error('Insight generation failed, using fallback:', error);
      const mockInsight = generateMockInsight(panelId, title);
      setInsight(mockInsight);
      setShowInsight(true);
    } finally {
      setLoading(false);
    }
  };

  const generateMockInsight = (panelId: string, title: string) => {
    const insights = {
      'revenue-trend': 'Revenue shows strong upward momentum with 12% growth over the past 8 weeks. The trend indicates successful pricing strategies and market expansion, with margin improvements suggesting operational efficiency gains.',
      'channel-mix': 'Modern Trade dominates with 45% share, reflecting strong retail partnerships. eCom growth (20%) presents expansion opportunities, while General Trade maintains stable 35% contribution.',
      'brand-performance': 'Aurel leads revenue generation at ₹3.2Cr but Lumio shows highest margin efficiency at 25.2%. Verra demonstrates strong premium positioning with sustainable profitability.',
      'price-ladder': 'Price ladder shows logical progression from ₹1.95 to ₹5.75. 330ml-500ml gap presents opportunity for 375ml premium variant. PPM efficiency decreases with larger formats.',
      'ppm-analysis': 'Premium tier maintains 15-20% price premium across pack sizes. Core variants show competitive positioning vs market. 1L+ formats offer margin expansion opportunities.',
      'whitespace-matrix': '375ml and 750ml gaps identified as high-potential opportunities. Score >85 indicates strong feasibility. Manufacturing complexity needs evaluation for new formats.',
      'attribute-importance': 'Price drives 34% of demand variance, followed by brand equity (28%). Pack size influences 18% of purchase decisions. Sugar-free variants show growing importance.',
      'promo-uplift': 'Optimal promotion depth is 15-20% for maximum ROI. Beyond 25% depth shows diminishing returns. Baseline volume resilience indicates strong brand equity.',
      'seasonality': 'Peak demand in October (35% uplift) driven by festival season. Summer months show 25% increase. Winter dip suggests category seasonality patterns.',
      'volume-trend': 'Volume recovery post price increases indicates inelastic segments. Week-over-week stability suggests successful demand planning and market acceptance.',
      'margin-trend': 'Margin expansion driven by strategic pricing and operational improvements. 15% quarter-over-quarter growth exceeds category benchmarks.',
      'default': `${title} analysis reveals key performance drivers and optimization opportunities. Data patterns suggest strategic focus areas for continued growth and profitability improvements.`
    };
    
    return insights[panelId as keyof typeof insights] || insights.default;
  };

  return (
    <Card className={`p-6 bg-gradient-secondary border-0 shadow-elegant hover:shadow-purple transition-all duration-300 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <Button
          onClick={generateInsight}
          disabled={loading}
          variant="outline"
          size="sm"
          className="bg-primary/5 border-primary/20 hover:bg-primary/10"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Brain className="h-4 w-4 mr-2" />
          )}
          Explain with GenAI
        </Button>
      </div>
      
      <div className="mb-4">
        {children}
      </div>

      {showInsight && (
        <div className="mt-4 p-4 rounded-lg bg-accent/50 border-l-4 border-primary">
          <div className="flex items-start space-x-2">
            <Brain className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-sm text-primary mb-2">AI Insights</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ChartWithInsight;