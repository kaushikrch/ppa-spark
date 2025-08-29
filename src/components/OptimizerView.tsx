import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Play, RotateCcw, TrendingUp, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import { apiService } from '../lib/api';

interface OptimizerResult {
  solution: Array<{
    sku_id: number;
    brand?: string;
    pct_change: number;
    near_bound: number;
    new_price: number;
    margin: number;
    p0: number;
  }>;
  kpis: {
    status: string;
    n_near_bound: number;
    rev: number;
    margin: number;
    vol: number;
    rev_base: number;
    margin_base: number;
    vol_base: number;
    rev_delta: number;
    margin_delta: number;
    vol_delta: number;
  };
}

const OptimizerView: React.FC = () => {
  const [round, setRound] = useState<1 | 2>(1);
  const [result, setResult] = useState<OptimizerResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Clear previous results when switching rounds
    setResult(null);
  }, [round]);

  const runOptimization = async () => {
    setLoading(true);
    try {
      const response = await apiService.runOptimizer(round);
      setResult(response.data);
    } catch (error) {
      console.error('Optimization failed:', error);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => `₹${(value / 1000000).toFixed(1)}M`;
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatUnits = (value: number) => value.toLocaleString();

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">MILP Optimization Engine</h3>
          <div className="flex items-center space-x-2">
            <Badge variant={round === 1 ? "default" : "secondary"}>Round 1 (±20%)</Badge>
            <Badge variant={round === 2 ? "default" : "secondary"}>Round 2 (±40%)</Badge>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Optimization Round
              </label>
              <div className="flex space-x-2">
                <Button
                  variant={round === 1 ? "default" : "outline"}
                  onClick={() => setRound(1)}
                  className="flex-1"
                >
                  Round 1
                </Button>
                <Button
                  variant={round === 2 ? "default" : "outline"}
                  onClick={() => setRound(2)}
                  className="flex-1"
                >
                  Round 2
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Max price change: {round === 1 ? '±20%' : '±40%'}</p>
              <p>• Near-bound SKUs: ≤10%</p>
              <p>• Objective: Maximize margin</p>
              <p>• Constraints: Spend budget, guardrails</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <Button
              onClick={runOptimization}
              disabled={loading}
              className="w-full bg-gradient-primary hover:opacity-90"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <RotateCcw className="h-4 w-4 animate-spin" />
                  <span>Optimizing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Play className="h-4 w-4" />
                  <span>Run Optimization</span>
                </div>
              )}
            </Button>
            
            {result && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={result.kpis.status === 'Optimal' ? 'default' : 'secondary'}>
                    {result.kpis.status}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Near-bound SKUs:</span>
                  <span className="text-foreground">{result.kpis.n_near_bound}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* KPI Summary */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
              <div className="flex items-center space-x-3 mb-4">
                <Package className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-foreground">Volume Impact</h4>
              </div>
              <div className="text-2xl font-bold text-foreground mb-2 flex items-baseline space-x-2">
                <span>{formatUnits(result.kpis.vol)}</span>
                <span
                  className={`text-sm ${
                    result.kpis.vol_delta >= 0 ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {result.kpis.vol_delta >= 0 ? '+' : ''}
                  {formatUnits(result.kpis.vol_delta)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Baseline: {formatUnits(result.kpis.vol_base)}
              </p>
            </Card>
            <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
              <div className="flex items-center space-x-3 mb-4">
                <TrendingUp className="h-5 w-5 text-success" />
                <h4 className="font-semibold text-foreground">Revenue Impact</h4>
              </div>
              <div className="text-2xl font-bold text-foreground mb-2 flex items-baseline space-x-2">
                <span>{formatCurrency(result.kpis.rev)}</span>
                <span
                  className={`text-sm ${
                    result.kpis.rev_delta >= 0 ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {result.kpis.rev_delta >= 0 ? '+' : ''}
                  {formatCurrency(result.kpis.rev_delta)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Baseline: {formatCurrency(result.kpis.rev_base)}
              </p>
            </Card>
            
            <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
              <div className="flex items-center space-x-3 mb-4">
                <CheckCircle className="h-5 w-5 text-success" />
                <h4 className="font-semibold text-foreground">Margin Improvement</h4>
              </div>
              <div className="text-2xl font-bold text-foreground mb-2 flex items-baseline space-x-2">
                <span>{formatCurrency(result.kpis.margin)}</span>
                <span
                  className={`text-sm ${
                    result.kpis.margin_delta >= 0 ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {result.kpis.margin_delta >= 0 ? '+' : ''}
                  {formatCurrency(result.kpis.margin_delta)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Baseline: {formatCurrency(result.kpis.margin_base)}
              </p>
            </Card>
          </div>

          {/* Solution Details */}
          <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <h4 className="font-semibold text-foreground">SKU-Level Decisions</h4>
            </div>
            
            <div className="space-y-3">
              {result.solution.map((item) => (
                <div 
                  key={item.sku_id}
                  className="p-4 rounded-lg bg-card border border-border"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-foreground">
                          {item.brand || 'Brand'} (SKU {item.sku_id})
                        </span>
                        {item.near_bound === 1 && (
                          <Badge variant="destructive" className="text-xs">Near Bound</Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Old: ₹{item.p0?.toFixed(2) || '0.00'}</span>
                        <span>New: ₹{item.new_price.toFixed(2)}</span>
                        <span>Margin: ₹{item.margin.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        item.pct_change > 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {item.pct_change > 0 ? '+' : ''}{formatPercent(item.pct_change)}
                      </div>
                      <Progress 
                        value={Math.abs(item.pct_change) * 100 / (round === 1 ? 20 : 40)} 
                        className="w-20 h-2 mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default OptimizerView;