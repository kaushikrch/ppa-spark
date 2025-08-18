import React from 'react';
import ElasticityMatrix from '../components/ElasticityMatrix';
import ChartWithInsight from '../components/ChartWithInsight';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { TrendingDown, Target, Zap, Calendar } from 'lucide-react';

const Elasticities: React.FC = () => {
  // Mock attribute importance data
  const attributeData = [
    { attribute: 'Price', importance: 0.34, category: 'Economic' },
    { attribute: 'Brand', importance: 0.28, category: 'Brand' },
    { attribute: 'Pack Size', importance: 0.18, category: 'Physical' },
    { attribute: 'Flavor', importance: 0.12, category: 'Product' },
    { attribute: 'Sugar Free', importance: 0.08, category: 'Health' },
  ];

  // Mock promo uplift curves
  const promoData = [
    { depth: 0, uplift: 0, brand: 'Aurel' },
    { depth: 5, uplift: 12, brand: 'Aurel' },
    { depth: 10, uplift: 28, brand: 'Aurel' },
    { depth: 15, uplift: 45, brand: 'Aurel' },
    { depth: 20, uplift: 58, brand: 'Aurel' },
    { depth: 25, uplift: 67, brand: 'Aurel' },
    { depth: 30, uplift: 72, brand: 'Aurel' },
  ];

  // Mock seasonality data
  const seasonalityData = [
    { month: 'Jan', factor: 0.85, events: 'New Year' },
    { month: 'Feb', factor: 0.92, events: 'Valentine' },
    { month: 'Mar', factor: 1.05, events: 'Holi' },
    { month: 'Apr', factor: 1.15, events: 'Summer Start' },
    { month: 'May', factor: 1.25, events: 'Peak Summer' },
    { month: 'Jun', factor: 1.18, events: 'Monsoon' },
    { month: 'Jul', factor: 1.08, events: 'Monsoon' },
    { month: 'Aug', factor: 1.12, events: 'Independence' },
    { month: 'Sep', factor: 1.22, events: 'Festivals' },
    { month: 'Oct', factor: 1.35, events: 'Diwali' },
    { month: 'Nov', factor: 1.08, events: 'Post Festival' },
    { month: 'Dec', factor: 0.95, events: 'Winter' },
  ];

  // Mock elasticity insights
  const elasticityInsights = [
    { 
      brand: 'Verra', 
      insight: 'High elasticity (-1.56) means very price sensitive - avoid increases',
      action: 'Focus on value proposition and volume efficiency',
      risk: 'High'
    },
    {
      brand: 'Kairo',
      insight: 'Low elasticity (-0.78) indicates inelastic demand - pricing opportunity',
      action: 'Strategic price increases with limited volume loss',
      risk: 'Low'
    },
    {
      brand: 'Novis-Aurel',
      insight: 'High cross-elasticity (0.18) indicates strong substitution',
      action: 'Coordinate pricing to avoid cannibalization',
      risk: 'High'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Elasticities & Drivers</h1>
        <p className="text-muted-foreground">Price sensitivity analysis, attribute importance, and demand drivers</p>
      </div>

      {/* Elasticity Matrix */}
      <ElasticityMatrix />

      {/* Attribute Importance & Promo Analysis */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartWithInsight panelId="attribute-importance" title="Attribute Importance (Random Forest SHAP)">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart 
                data={attributeData.map((item, index) => ({ ...item, yPos: index }))}
                margin={{ top: 20, right: 80, bottom: 60, left: 120 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  type="number" 
                  dataKey="importance"
                  domain={[0, 0.4]}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  label={{ 
                    value: 'Importance Score (%)', 
                    position: 'insideBottom', 
                    offset: -5,
                    style: { textAnchor: 'middle' }
                  }}
                />
                <YAxis 
                  type="number"
                  dataKey="yPos"
                  domain={[-0.5, 4.5]}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(value) => {
                    const attr = attributeData[value];
                    return attr ? attr.attribute : '';
                  }}
                  tick={{ fontSize: 12 }}
                  label={{ 
                    value: 'Attributes', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle' }
                  }}
                />
                <Tooltip 
                  formatter={(value, name) => [`${(Number(value) * 100).toFixed(1)}%`, 'Importance']}
                  labelFormatter={(label, payload) => 
                    payload?.[0] ? payload[0].payload.attribute : label
                  }
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Scatter 
                  dataKey="importance" 
                  fill="hsl(var(--primary))" 
                  r={8}
                />
                {/* Add data labels */}
                {attributeData.map((entry, index) => (
                  <text
                    key={index}
                    x={entry.importance * 1000 + 30}
                    y={index * 40 + 35}
                    fill="hsl(var(--foreground))"
                    fontSize="12"
                    fontWeight="500"
                  >
                    {(entry.importance * 100).toFixed(1)}%
                  </text>
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </ChartWithInsight>

        <ChartWithInsight panelId="promo-uplift" title="Promotional Uplift Curves">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={promoData} margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="depth" 
                  stroke="hsl(var(--muted-foreground))"
                  label={{ 
                    value: 'Discount Depth (%)', 
                    position: 'insideBottom', 
                    offset: -5,
                    style: { textAnchor: 'middle' }
                  }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  label={{ 
                    value: 'Volume Uplift (%)', 
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
                <Line 
                  type="monotone" 
                  dataKey="uplift" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--success))', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartWithInsight>
      </div>

      {/* Seasonality & Calendar Effects */}
      <ChartWithInsight panelId="seasonality" title="Seasonality & Calendar Effects">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={seasonalityData} margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                label={{ 
                  value: 'Month', 
                  position: 'insideBottom', 
                  offset: -5,
                  style: { textAnchor: 'middle' }
                }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                label={{ 
                  value: 'Seasonal Factor', 
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
              <Bar dataKey="factor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartWithInsight>

      {/* Strategic Insights */}
      <div className="grid md:grid-cols-3 gap-6">
        {elasticityInsights.map((item, index) => (
          <Card key={index} className="p-6 bg-gradient-secondary border-0 shadow-elegant">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">{item.brand}</h3>
              <Badge variant={item.risk === 'Low' ? 'default' : item.risk === 'Medium' ? 'secondary' : 'destructive'}>
                {item.risk} Risk
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <TrendingDown className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{item.insight}</p>
              </div>
              <div className="flex items-start space-x-2">
                <Target className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                <p className="text-sm font-medium text-foreground">{item.action}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Driver Analysis Summary */}
      <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
        <div className="flex items-center space-x-3 mb-4">
          <Zap className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Key Driver Insights</h3>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <TrendingDown className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">-1.12</span>
            </div>
            <p className="text-sm text-muted-foreground">Average Own-Price Elasticity</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Target className="h-5 w-5 text-success" />
              <span className="text-2xl font-bold text-foreground">0.15</span>
            </div>
            <p className="text-sm text-muted-foreground">Average Cross Elasticity</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Zap className="h-5 w-5 text-warning" />
              <span className="text-2xl font-bold text-foreground">58%</span>
            </div>
            <p className="text-sm text-muted-foreground">Promo Response (20% depth)</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">35%</span>
            </div>
            <p className="text-sm text-muted-foreground">Peak Season Uplift</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Elasticities;