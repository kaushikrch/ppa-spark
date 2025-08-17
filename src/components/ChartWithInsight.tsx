import React, { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Brain, Loader2 } from 'lucide-react';
import { ragService } from '../lib/rag';

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
      const result = await ragService.explainChart(panelId, `Explain the ${title} chart and provide key insights`);
      setInsight(result);
      setShowInsight(true);
    } catch (error) {
      setInsight("Unable to generate insights at this time.");
      setShowInsight(true);
    } finally {
      setLoading(false);
    }
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