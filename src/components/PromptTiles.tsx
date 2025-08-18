import React from 'react';
import { Card } from './ui/card';
import { MessageSquare, Zap } from 'lucide-react';

const PROMPT_TILES = [
  "Margin-first PPA: ±10% price moves, spend ≤ ₹5M, near-bound ≤10%, maintain GM% ≥ last qtr.",
  "Volume-defend: defend units in GT; cut deep low-ROI promos; enforce MSL ≥ 90% in top clusters.",
  "Tail-cleanup: delist up to 5 SKUs (<0.5% share); propose 3 replacements with pack-size rationale.",
  "eCom re-ladder: shift to 330ml & 1L; NSV↑ without GM%↓; limit price moves to ±6%.",
  "Promo rationalization: remove bottom-quartile ROI events; show recovered margin & unit impact.",
  "Balanced plan: joint price+promo+assortment under ₹8M budget; minimize near-bound hits."
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