import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { MessageSquare, Brain, Zap, Target, Users, Clock, CheckCircle } from 'lucide-react';
import { apiService } from '../lib/api';
import PromptTiles from './PromptTiles';

interface HuddleRound {
  role: string;
  content: string;
  evidence?: string[];
  kpis?: any;
  recommendation?: any;
  timestamp: string;
  confidence?: number;
}

interface HuddleResult {
  rounds: HuddleRound[];
  stopped_after_rounds: number;
  final_recommendation?: any;
}

const AgenticHuddle: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [budget, setBudget] = useState(500000);
  const [result, setResult] = useState<HuddleResult | null>(null);
  const [loading, setLoading] = useState(false);

  const startHuddle = async (selectedQuestion?: string) => {
    const q = selectedQuestion || question;
    if (!q.trim()) return;

    setLoading(true);
    try {
      const response = await apiService.agenticHuddle(q, budget);
      setResult(response.data);
    } catch (error) {
      console.error('Huddle failed:', error);
      // Mock result for demo
      setResult({
        rounds: [
          {
            role: 'RAGAgent',
            content: 'Retrieved evidence from data tables',
            evidence: [
              'Price elasticity data shows Verra brand has -1.56 own-price elasticity',
              'Cross-elasticity between Aurel and Novis is 0.15, indicating moderate substitution',
              'Modern Trade channel shows 23% higher margin potential'
            ],
            timestamp: '2024-01-15T10:00:00Z'
          },
          {
            role: 'OptimizationAgent',
            content: 'Ran round-1 optimizer with 20% bound constraints',
            kpis: { status: 'Optimal', margin: 3890000, n_near_bound: 1 },
            timestamp: '2024-01-15T10:05:00Z'
          },
          {
            role: 'CoachAgent',
            content: 'Consensus recommendation after multi-agent analysis',
            recommendation: {
              summary: 'Focus on premium pack price increases in Modern Trade with selective promotional rationalization',
              actions: [
                'Apply +6% on Verra 1L PET in Modern Trade (low elasticity)',
                'Reduce promo depth from 28% to 18% on Kairo 330ml cans',
                'Delist Aurel 250ml cans in eCom (0.2% share, high cannibalization)'
              ],
              kpis_expected: {
                revenue_lift: '3.2%',
                margin_improvement: '8.4%',
                volume_impact: '-0.8%'
              }
            },
            confidence: 0.82,
            timestamp: '2024-01-15T10:10:00Z'
          }
        ],
        stopped_after_rounds: 3,
        final_recommendation: {}
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'RAGAgent': return <Brain className="h-4 w-4" />;
      case 'OptimizationAgent': return <Target className="h-4 w-4" />;
      case 'CoachAgent': return <Users className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'RAGAgent': return 'bg-blue-500';
      case 'OptimizationAgent': return 'bg-green-500';
      case 'CoachAgent': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Query Input */}
      <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
        <div className="flex items-center space-x-3 mb-4">
          <Zap className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Agentic AI Huddle</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Business Question
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a complex PPA or assortment question..."
              className="w-full p-3 rounded-lg border border-border bg-card text-foreground resize-none"
              rows={3}
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Budget Constraint (₹)
              </label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full p-3 rounded-lg border border-border bg-card text-foreground"
              />
            </div>
            <div className="pt-6">
              <Button
                onClick={() => startHuddle()}
                disabled={!question.trim() || loading}
                className="bg-gradient-primary hover:opacity-90"
              >
                {loading ? 'Starting Huddle...' : 'Start Huddle'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Prompt Tiles */}
      {!result && (
        <PromptTiles onAsk={(q) => startHuddle(q)} />
      )}

      {/* Huddle Results */}
      {result && (
        <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Users className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Huddle Transcript</h3>
            </div>
            <Badge variant="default" className="bg-primary">
              {result.stopped_after_rounds} Rounds Complete
            </Badge>
          </div>

          <div className="space-y-6">
            {result.rounds.map((round, index) => (
              <div key={index} className="relative">
                {/* Timeline connector */}
                {index < result.rounds.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-16 bg-border" />
                )}
                
                <div className="flex space-x-4">
                  {/* Agent Avatar */}
                  <div className={`w-12 h-12 rounded-full ${getRoleColor(round.role)} flex items-center justify-center text-white`}>
                    {getRoleIcon(round.role)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-semibold text-foreground">{round.role}</h4>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(round.timestamp).toLocaleTimeString()}
                      </Badge>
                      {round.confidence && (
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(round.confidence * 100)}% confidence
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-muted-foreground">{round.content}</p>
                    
                    {/* Evidence */}
                    {round.evidence && (
                      <div className="p-3 rounded-lg bg-card border border-border">
                        <h5 className="font-medium text-foreground mb-2">Evidence:</h5>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {round.evidence.map((item, i) => (
                            <li key={i} className="flex items-start space-x-2">
                              <span className="text-primary mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* KPIs */}
                    {round.kpis && (
                      <div className="p-3 rounded-lg bg-card border border-border">
                        <h5 className="font-medium text-foreground mb-2">Optimization Results:</h5>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Status: </span>
                            <span className="text-foreground font-medium">{round.kpis.status}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Margin: </span>
                            <span className="text-foreground font-medium">₹{(round.kpis.margin / 1000000).toFixed(1)}M</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Near-bound: </span>
                            <span className="text-foreground font-medium">{round.kpis.n_near_bound} SKUs</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Final Recommendation */}
                    {round.recommendation && (
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-center space-x-2 mb-3">
                          <CheckCircle className="h-5 w-5 text-primary" />
                          <h5 className="font-semibold text-primary">Final Recommendation</h5>
                        </div>
                        
                        <p className="text-foreground mb-4">{round.recommendation.summary}</p>
                        
                        <div className="space-y-3">
                          <div>
                            <h6 className="font-medium text-foreground mb-2">Actions:</h6>
                            <ul className="space-y-1">
                              {round.recommendation.actions?.map((action: string, i: number) => (
                                <li key={i} className="flex items-start space-x-2 text-sm">
                                  <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                                  <span className="text-muted-foreground">{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          {round.recommendation.kpis_expected && (
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Revenue: </span>
                                <span className="text-success font-medium">+{round.recommendation.kpis_expected.revenue_lift}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Margin: </span>
                                <span className="text-success font-medium">+{round.recommendation.kpis_expected.margin_improvement}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Volume: </span>
                                <span className="text-warning font-medium">{round.recommendation.kpis_expected.volume_impact}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AgenticHuddle;