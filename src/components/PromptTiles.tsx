import React from 'react';
import { Card } from './ui/card';
import { MessageSquare, Zap } from 'lucide-react';

const PROMPT_TILES = [
  "Where are price-pack ladder gaps by channel and what packs should fill them?",
  "Which SKUs are cannibalizing each other most in Modern Trade?",
  "Top 10 price moves within ±10% to maximize margin next quarter under budget X",
  "If we delist 5 tail SKUs, where does volume transfer and what do we add instead?",
  "Recommend pack-size changes for eCom to grow NSV without hurting GM%",
  "Which promotions to reduce because of low ROI and high duplication?",
  "What MSL should be enforced per region to meet shelf-share guardrails?",
  "Create an executive summary for the proposed plan with risks and mitigations"
];

interface PromptTilesProps {
  onAsk: (question: string) => void;
}

const PromptTiles: React.FC<PromptTilesProps> = ({ onAsk }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-6">
        <MessageSquare className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">Pre-Built Agentic Prompts</h2>
        <Zap className="h-5 w-5 text-primary-glow" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROMPT_TILES.map((prompt, index) => (
          <Card
            key={index}
            className="p-4 cursor-pointer bg-gradient-secondary border-0 shadow-elegant hover:shadow-purple hover:scale-[1.02] transition-all duration-300 group"
            onClick={() => onAsk(prompt)}
          >
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                <Zap className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-300 leading-relaxed">
                  {prompt}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PromptTiles;