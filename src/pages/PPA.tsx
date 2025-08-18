import React from 'react';
import ChartWithInsight from '../components/ChartWithInsight';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from 'recharts';
import { Package, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

const PPA: React.FC = () => {
  // Mock price-pack ladder data
  const priceLadder = [
    { pack: '250ml Can', value: 250, premium: 2.20, core: 1.95, competitors: [2.10, 2.05, 2.25] },
    { pack: '330ml Can', value: 330, premium: 2.75, core: 2.45, competitors: [2.70, 2.55, 2.80] },
    { pack: '500ml PET', value: 500, premium: 3.25, core: 2.95, competitors: [3.20, 3.10, 3.35] },
    { pack: '1L PET', value: 1000, premium: 4.50, core: 4.15, competitors: [4.45, 4.25, 4.60] },
    { pack: '1.5L PET', value: 1500, premium: 5.75, core: 5.35, competitors: [5.80, 5.50, 5.90] },
  ];

  // Price per ml analysis
  const ppmData = priceLadder.map(item => ({
    pack: item.pack,
    ppm_premium: Number((item.premium / item.value).toFixed(4)),
    ppm_core: Number((item.core / item.value).toFixed(4)),
    ppm_comp_avg: Number(((item.competitors.reduce((a, b) => a + b, 0) / item.competitors.length) / item.value).toFixed(4)),
    value: item.value
  }));

  // Whitespace matrix (hypothetical gaps)
  const whitespaceData = [
    { size: 375, price: 2.8, segment: 'Premium', gap_score: 85, feasible: true },
    { size: 600, price: 3.6, segment: 'Core', gap_score: 72, feasible: true },
    { size: 750, price: 4.2, segment: 'Premium', gap_score: 91, feasible: true },
    { size: 1250, price: 5.1, segment: 'Core', gap_score: 68, feasible: false },
  ];

  // Channel price corridors
  const corridorData = [
    { channel: 'ModernTrade', min: 1.95, max: 5.90, avg: 3.25, opportunity: 'Price premium' },
    { channel: 'GeneralTrade', min: 1.85, max: 5.70, avg: 3.05, opportunity: 'Volume focus' },
    { channel: 'eCom', min: 2.10, max: 6.20, avg: 3.45, opportunity: 'Convenience premium' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Price-Pack Architecture</h1>
        <p className="text-muted-foreground">Strategic analysis of pack ladder, price corridors, and whitespace opportunities</p>
      </div>

      {/* Price Ladder Analysis */}
      <ChartWithInsight panelId="price-ladder" title="Pack Ladder & Price Per ml">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="value" 
                type="number" 
                domain={[200, 1600]}
                stroke="hsl(var(--muted-foreground))"
                label={{ value: 'Pack Size (ml)', position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                dataKey="ppm"
                type="number"
                domain={[0.003, 0.011]}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v) => Number(v).toFixed(4)}
                label={{ value: 'Price per ml (₹/ml)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value, name) => [`₹${Number(value).toFixed(4)}/ml`, name]}
                labelFormatter={(label, payload) => 
                  payload?.[0] ? `${payload[0].payload.pack}` : `${label}ml`
                }
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              <Scatter 
                name="Premium Tier" 
                data={priceLadder.map(d => ({ 
                  value: d.value, 
                  ppm: Number((d.premium / d.value).toFixed(4)), 
                  pack: d.pack 
                }))}
                fill="hsl(var(--primary))"
                r={8}
              />
              <Scatter 
                name="Core Tier" 
                data={priceLadder.map(d => ({ 
                  value: d.value, 
                  ppm: Number((d.core / d.value).toFixed(4)), 
                  pack: d.pack 
                }))}
                fill="hsl(var(--primary-glow))"
                r={8}
              />
              <Scatter 
                name="Competitor Average" 
                data={priceLadder.map(d => ({ 
                  value: d.value, 
                  ppm: Number(((d.competitors.reduce((a, b) => a + b, 0) / d.competitors.length) / d.value).toFixed(4)),
                  pack: d.pack 
                }))}
                fill="hsl(var(--muted))"
                r={6}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </ChartWithInsight>

      {/* Price Per ML Analysis */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartWithInsight panelId="ppm-analysis" title="Price Per ml Efficiency">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ppmData} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="pack" 
                  stroke="hsl(var(--muted-foreground))" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  interval={0}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => Number(v).toFixed(4)}
                  label={{ value: 'Price per ml (₹/ml)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value, name) => [
                    `₹${Number(value).toFixed(4)}/ml`, 
                    typeof name === 'string' ? name.replace('ppm_', '').replace('_', ' ') : String(name)
                  ]}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="ppm_premium" name="Premium PPM" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                <Bar dataKey="ppm_core" name="Core PPM" fill="hsl(var(--primary-glow))" radius={[2, 2, 0, 0]} />
                <Bar dataKey="ppm_comp_avg" name="Competitor Avg" fill="hsl(var(--muted))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartWithInsight>

        <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="h-5 w-5 text-warning" />
            <h3 className="font-semibold text-foreground">Price Corridor Analysis</h3>
          </div>
          <div className="space-y-4">
            {corridorData.map((channel, index) => (
              <div key={index} className="p-3 rounded-lg bg-card border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">{channel.channel}</span>
                  <Badge variant="outline">{channel.opportunity}</Badge>
                </div>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>Min: ₹{channel.min}</span>
                  <span>Avg: ₹{channel.avg}</span>
                  <span>Max: ₹{channel.max}</span>
                </div>
                <div className="mt-2 w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${((channel.avg - channel.min) / (channel.max - channel.min)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Whitespace Opportunities */}
      <ChartWithInsight panelId="whitespace-matrix" title="Whitespace Opportunity Matrix">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="size" 
                  type="number"
                  domain={[300, 1400]}
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: 'Pack Size (ml)', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  dataKey="ppm"
                  type="number"
                  domain={[0.004, 0.010]}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => Number(v).toFixed(4)}
                  label={{ value: 'Price per ml (₹/ml)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value, name, props) => [
                    name === 'ppm' ? `₹${Number(value).toFixed(4)}/ml` : value,
                    name === 'ppm' ? 'Target PPM' : 'Gap Score'
                  ]}
                  labelFormatter={(label, payload) => 
                    payload?.[0] ? `${payload[0].payload.size}ml ${payload[0].payload.segment}` : label
                  }
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Scatter 
                  name="Feasible Opportunities" 
                  data={whitespaceData.filter(d => d.feasible).map(d => ({ 
                    size: d.size, 
                    ppm: d.price / d.size,
                    segment: d.segment,
                    gap_score: d.gap_score
                  }))}
                  fill="hsl(var(--success))"
                  r={8}
                />
                <Scatter 
                  name="High Risk Opportunities" 
                  data={whitespaceData.filter(d => !d.feasible).map(d => ({ 
                    size: d.size, 
                    ppm: d.price / d.size,
                    segment: d.segment,
                    gap_score: d.gap_score
                  }))}
                  fill="hsl(var(--warning))"
                  r={6}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground mb-3">Gap Opportunities</h4>
            {whitespaceData.map((gap, index) => (
              <div key={index} className="p-3 rounded-lg bg-card border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">{gap.size}ml {gap.segment}</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant={gap.feasible ? "default" : "secondary"}>
                      Score: {gap.gap_score}
                    </Badge>
                    <Badge variant={gap.feasible ? "default" : "destructive"}>
                      {gap.feasible ? "Feasible" : "Risky"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Target Price: ₹{gap.price}</span>
                  <span>PPM: ₹{(gap.price / gap.size).toFixed(4)}/ml</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ChartWithInsight>

      {/* Strategic Recommendations */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
          <div className="flex items-center space-x-3 mb-4">
            <Package className="h-6 w-6 text-primary" />
            <h3 className="font-semibold text-foreground">Pack Innovation</h3>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start space-x-2">
              <TrendingUp className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <span>Launch 375ml premium can for Modern Trade</span>
            </li>
            <li className="flex items-start space-x-2">
              <TrendingUp className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <span>Introduce 750ml PET for family segment</span>
            </li>
            <li className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
              <span>Evaluate 600ml core variant feasibility</span>
            </li>
          </ul>
        </Card>

        <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
          <div className="flex items-center space-x-3 mb-4">
            <DollarSign className="h-6 w-6 text-success" />
            <h3 className="font-semibold text-foreground">Pricing Strategy</h3>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start space-x-2">
              <TrendingUp className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <span>Optimize PPM efficiency in large formats</span>
            </li>
            <li className="flex items-start space-x-2">
              <TrendingUp className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <span>Channel-specific price corridors</span>
            </li>
            <li className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
              <span>Monitor competitive price gaps</span>
            </li>
          </ul>
        </Card>

        <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="h-6 w-6 text-warning" />
            <h3 className="font-semibold text-foreground">Risk Factors</h3>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <span>Cannibalization risk in 500-750ml range</span>
            </li>
            <li className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <span>Manufacturing complexity for new formats</span>
            </li>
            <li className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
              <span>Retailer acceptance of premium PPM</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default PPA;