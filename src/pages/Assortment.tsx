import React from 'react';
import AssortmentSim from '../components/AssortmentSim';
import ChartWithInsight from '../components/ChartWithInsight';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { Package, Target, AlertTriangle, TrendingUp, Minus } from 'lucide-react';

const Assortment: React.FC = () => {
  // Mock MSL vs Actual data
  const mslData = [
    { sku: 'Aurel 330ml', msl: 85, actual: 78, gap: -7, channel: 'ModernTrade' },
    { sku: 'Novis 500ml', msl: 92, actual: 95, gap: 3, channel: 'ModernTrade' },
    { sku: 'Verra 1L', msl: 75, actual: 68, gap: -7, channel: 'GeneralTrade' },
    { sku: 'Kairo 250ml', msl: 45, actual: 52, gap: 7, channel: 'eCom' },
    { sku: 'Lumio 1.5L', msl: 65, actual: 71, gap: 6, channel: 'ModernTrade' },
  ];

  // Perfect basket analysis
  const basketData = [
    { combination: 'Aurel + Novis', frequency: 0.23, lift: 1.8, value: 'High' },
    { combination: 'Verra + Lumio', frequency: 0.18, lift: 2.1, value: 'High' },
    { combination: 'Kairo + Others', frequency: 0.12, lift: 0.9, value: 'Low' },
    { combination: 'Multi-pack', frequency: 0.31, lift: 2.5, value: 'Very High' },
  ];

  // Cannibalization matrix
  const cannibalizationData = [
    { source: 'Aurel 500ml', target: 'Aurel 330ml', rate: 0.15, severity: 'Medium' },
    { source: 'Novis 1L', target: 'Novis 500ml', rate: 0.22, severity: 'High' },
    { source: 'Verra Premium', target: 'Verra Core', rate: 0.08, severity: 'Low' },
    { source: 'New Variants', target: 'Existing', rate: 0.18, severity: 'Medium' },
  ];

  // Duplication analysis
  const duplicationData = [
    { pair: 'Aurel 250ml vs 330ml', overlap: 0.67, recommendation: 'Consider delisting 250ml' },
    { pair: 'Novis Core vs Premium', overlap: 0.45, recommendation: 'Maintain differentiation' },
    { pair: 'Verra 1L vs 1.5L', overlap: 0.78, recommendation: 'Focus on one format' },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'text-destructive';
      case 'Medium': return 'text-warning';
      case 'Low': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  const getValueColor = (value: string) => {
    switch (value) {
      case 'Very High': return 'text-success';
      case 'High': return 'text-success';
      case 'Medium': return 'text-warning';
      case 'Low': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Assortment & Shelf Optimization</h1>
        <p className="text-muted-foreground">MSL compliance, perfect basket analysis, and SKU rationalization</p>
      </div>

      {/* MSL vs Actual Performance */}
      <ChartWithInsight panelId="msl-compliance" title="MSL vs Actual Distribution">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mslData} margin={{ top: 20, right: 30, bottom: 100, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="sku" 
                stroke="hsl(var(--muted-foreground))" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                tick={{ fontSize: 12 }}
                label={{ 
                  value: 'SKU', 
                  position: 'insideBottom', 
                  offset: -5,
                  style: { textAnchor: 'middle' }
                }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                label={{ 
                  value: 'Distribution (%)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              <Bar dataKey="msl" fill="hsl(var(--muted))" radius={[2, 2, 0, 0]} name="MSL Target" />
              <Bar dataKey="actual" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartWithInsight>

      {/* Perfect Basket & Duplication Analysis */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
          <div className="flex items-center space-x-3 mb-4">
            <Package className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Perfect Basket Analysis</h3>
          </div>
          <div className="space-y-4">
            {basketData.map((item, index) => (
              <div key={index} className="p-3 rounded-lg bg-card border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">{item.combination}</span>
                  <Badge className={getValueColor(item.value)}>{item.value}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Frequency: {(item.frequency * 100).toFixed(0)}%</span>
                  <span>Lift: {item.lift}x</span>
                </div>
                <Progress value={item.frequency * 100} className="mt-2 h-2" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h3 className="font-semibold text-foreground">Cannibalization Matrix</h3>
          </div>
          <div className="space-y-4">
            {cannibalizationData.map((item, index) => (
              <div key={index} className="p-3 rounded-lg bg-card border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground text-sm">{item.source}</span>
                  <Badge variant={item.severity === 'High' ? 'destructive' : item.severity === 'Medium' ? 'secondary' : 'default'}>
                    {item.severity}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>→ {item.target}</span>
                  <span className={getSeverityColor(item.severity)}>{(item.rate * 100).toFixed(0)}%</span>
                </div>
                <Progress value={item.rate * 100} className="mt-2 h-2" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Assortment Simulator */}
      <AssortmentSim />

      {/* Duplication & Rationalization */}
      <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
        <div className="flex items-center space-x-3 mb-4">
          <Target className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">SKU Duplication Analysis</h3>
        </div>
        <div className="space-y-4">
          {duplicationData.map((item, index) => (
            <div key={index} className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-foreground">{item.pair}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Overlap:</span>
                  <span className={`font-bold ${item.overlap > 0.6 ? 'text-destructive' : item.overlap > 0.4 ? 'text-warning' : 'text-success'}`}>
                    {(item.overlap * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Progress value={item.overlap * 100} className="flex-1 mr-4 h-2" />
                <span className="text-sm font-medium text-primary">{item.recommendation}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Strategic Recommendations */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="h-6 w-6 text-success" />
            <h3 className="font-semibold text-foreground">Optimization Opportunities</h3>
          </div>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start space-x-2">
              <span className="w-2 h-2 rounded-full bg-success mt-2 flex-shrink-0"></span>
              <span className="text-muted-foreground">
                Rationalize 3 tail SKUs with &lt;0.5% share to improve shelf efficiency
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-2 h-2 rounded-full bg-success mt-2 flex-shrink-0"></span>
              <span className="text-muted-foreground">
                Focus distribution on top 15 velocity drivers per channel
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-2 h-2 rounded-full bg-success mt-2 flex-shrink-0"></span>
              <span className="text-muted-foreground">
                Improve MSL compliance by 12% to capture ₹2.1M revenue opportunity
              </span>
            </li>
          </ul>
        </Card>

        <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
          <div className="flex items-center space-x-3 mb-4">
            <Package className="h-6 w-6 text-primary" />
            <h3 className="font-semibold text-foreground">New Product Pipeline</h3>
          </div>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start space-x-2">
              <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></span>
              <span className="text-muted-foreground">
                Launch 375ml premium format to fill whitespace gap
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></span>
              <span className="text-muted-foreground">
                Introduce functional variants in core 500ml size
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></span>
              <span className="text-muted-foreground">
                Test multi-pack offerings for family segment
              </span>
            </li>
          </ul>
        </Card>

        <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-warning" />
            <h3 className="font-semibold text-foreground">Risk Mitigation</h3>
          </div>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start space-x-2">
              <span className="w-2 h-2 rounded-full bg-warning mt-2 flex-shrink-0"></span>
              <span className="text-muted-foreground">
                Monitor cannibalization rates during transition period
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-2 h-2 rounded-full bg-warning mt-2 flex-shrink-0"></span>
              <span className="text-muted-foreground">
                Ensure retailer buy-in for shelf space reallocation
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-2 h-2 rounded-full bg-warning mt-2 flex-shrink-0"></span>
              <span className="text-muted-foreground">
                Phase delistings gradually to maintain category presence
              </span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default Assortment;