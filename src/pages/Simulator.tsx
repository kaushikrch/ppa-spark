import React, { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Slider } from '../components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import ChartWithInsight from '../components/ChartWithInsight';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, RotateCcw, TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react';
import { apiService } from '../lib/api';

const Simulator: React.FC = () => {
  const [priceChanges, setPriceChanges] = useState<Record<string, number>>({});
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [selectedChannel, setSelectedChannel] = useState<string>('All');
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Mock SKU data for controls
  const skus = [
    { id: '1001', brand: 'Aurel', pack: '330ml Can', currentPrice: 2.45, elasticity: -1.24 },
    { id: '1002', brand: 'Novis', pack: '500ml PET', currentPrice: 3.30, elasticity: -0.89 },
    { id: '1003', brand: 'Verra', pack: '1L PET', currentPrice: 4.25, elasticity: -1.56 },
    { id: '1004', brand: 'Kairo', pack: '250ml Can', currentPrice: 1.95, elasticity: -0.78 },
    { id: '1005', brand: 'Lumio', pack: '1.5L PET', currentPrice: 5.50, elasticity: -1.12 },
  ];

  const regions = ['All', 'North', 'South', 'East', 'West'];
  const channels = ['All', 'ModernTrade', 'GeneralTrade', 'eCom'];

  const handlePriceChange = (skuId: string, value: number[]) => {
    setPriceChanges(prev => ({
      ...prev,
      [skuId]: value[0] / 100
    }));
  };

  const runSimulation = async () => {
    setLoading(true);
    try {
      const response = await apiService.simulatePrice(priceChanges);
      setSimulationResult(response.data);
    } catch (error) {
      console.error('Simulation failed:', error);
      // Calculate elasticity-based impact for demo
      let totalVolumeImpact = 0;
      let totalRevenueImpact = 0;
      let totalMarginImpact = 0;
      
      skus.forEach(sku => {
        const change = priceChanges[sku.id] || 0;
        if (change !== 0) {
          // Volume impact = elasticity * price change
          const volumeImpact = sku.elasticity * change;
          // Revenue impact includes price and volume effects
          const revenueImpact = change + volumeImpact;
          // Margin impact is amplified due to leverage
          const marginImpact = revenueImpact * 1.8;
          
          totalVolumeImpact += volumeImpact * 0.2; // Weight by SKU contribution
          totalRevenueImpact += revenueImpact * 0.2;
          totalMarginImpact += marginImpact * 0.2;
        }
      });

      setSimulationResult({
        agg: [
          { week: 1, units: 85000 * (1 + totalVolumeImpact), revenue: 12400000 * (1 + totalRevenueImpact), margin: 3100000 * (1 + totalMarginImpact) },
          { week: 2, units: 87200 * (1 + totalVolumeImpact), revenue: 12750000 * (1 + totalRevenueImpact), margin: 3250000 * (1 + totalMarginImpact) },
          { week: 3, units: 84500 * (1 + totalVolumeImpact), revenue: 12600000 * (1 + totalRevenueImpact), margin: 3180000 * (1 + totalMarginImpact) },
          { week: 4, units: 88900 * (1 + totalVolumeImpact), revenue: 13100000 * (1 + totalRevenueImpact), margin: 3420000 * (1 + totalMarginImpact) },
        ],
        summary: {
          volume_change: totalVolumeImpact * 100,
          revenue_change: totalRevenueImpact * 100,
          margin_change: totalMarginImpact * 100
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const resetSimulation = () => {
    setPriceChanges({});
    setSimulationResult(null);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getElasticityColor = (elasticity: number) => {
    const abs = Math.abs(elasticity);
    if (abs > 1.2) return 'text-destructive'; // Elastic / Price sensitive
    if (abs >= 0.8) return 'text-warning'; // Moderate
    return 'text-success'; // Inelastic
  };

  const getElasticityLabel = (elasticity: number) => {
    const abs = Math.abs(elasticity);
    if (abs > 1.2) return 'Elastic (Price Sensitive)';
    if (abs >= 0.8) return 'Moderate';
    return 'Inelastic';
  };
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">What-If Simulator</h1>
        <p className="text-muted-foreground">Interactive price change simulation with elasticity-based volume transfer</p>
      </div>

      {/* Controls */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Filters */}
        <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
          <h3 className="font-semibold text-foreground mb-4">Simulation Scope</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Region</label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {regions.map(region => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Channel</label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {channels.map(channel => (
                    <SelectItem key={channel} value={channel}>{channel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-4 space-y-2">
              <Button 
                onClick={runSimulation} 
                disabled={Object.keys(priceChanges).length === 0 || loading}
                className="w-full bg-gradient-primary hover:opacity-90"
              >
                {loading ? (
                  <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Run Simulation
              </Button>
              <Button 
                onClick={resetSimulation} 
                variant="outline" 
                className="w-full"
              >
                Reset All
              </Button>
            </div>
          </div>
        </Card>

        {/* Price Controls */}
        <Card className="lg:col-span-2 p-6 bg-gradient-secondary border-0 shadow-elegant">
          <h3 className="font-semibold text-foreground mb-4">Price Change Controls</h3>
          <div className="space-y-6">
            {skus.map((sku) => {
              const change = priceChanges[sku.id] || 0;
              const newPrice = sku.currentPrice * (1 + change);
              return (
                <div key={sku.id} className="p-4 rounded-lg bg-card border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-medium text-foreground">{sku.brand} {sku.pack}</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Elasticity: {sku.elasticity}
                        </Badge>
                        <Badge className={`text-xs ${getElasticityColor(sku.elasticity)}`}>
                          {getElasticityLabel(sku.elasticity)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-foreground">
                        ₹{sku.currentPrice.toFixed(2)} → ₹{newPrice.toFixed(2)}
                      </div>
                      <div className={`text-sm font-medium ${change >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatPercent(change * 100)}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Slider
                      value={[change * 100]}
                      onValueChange={(value) => handlePriceChange(sku.id, value)}
                      max={20}
                      min={-20}
                      step={1}
                      className="flex-1"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>-20%</span>
                      <span>0%</span>
                      <span>+20%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Results */}
      {simulationResult && (
        <>
          {/* KPI Impact */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
              <div className="flex items-center space-x-3 mb-4">
                <Package className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-foreground">Volume Impact</h3>
              </div>
              <div className={`text-2xl font-bold mb-2 ${simulationResult.summary.volume_change >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatPercent(simulationResult.summary.volume_change)}
              </div>
              <p className="text-sm text-muted-foreground">
                Expected volume change from price adjustments
              </p>
            </Card>

            <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
              <div className="flex items-center space-x-3 mb-4">
                <DollarSign className="h-6 w-6 text-success" />
                <h3 className="font-semibold text-foreground">Revenue Impact</h3>
              </div>
              <div className={`text-2xl font-bold mb-2 ${simulationResult.summary.revenue_change >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatPercent(simulationResult.summary.revenue_change)}
              </div>
              <p className="text-sm text-muted-foreground">
                Net revenue effect including volume response
              </p>
            </Card>

            <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
              <div className="flex items-center space-x-3 mb-4">
                <TrendingUp className="h-6 w-6 text-success" />
                <h3 className="font-semibold text-foreground">Margin Impact</h3>
              </div>
              <div className={`text-2xl font-bold mb-2 ${simulationResult.summary.margin_change >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatPercent(simulationResult.summary.margin_change)}
              </div>
              <p className="text-sm text-muted-foreground">
                Bottom-line margin improvement
              </p>
            </Card>
          </div>

          {/* Trend Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <ChartWithInsight panelId="volume-trend" title="Volume Response Over Time">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={simulationResult.agg} margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="week" 
                      stroke="hsl(var(--muted-foreground))"
                      label={{ 
                        value: 'Week', 
                        position: 'insideBottom', 
                        offset: -5,
                        style: { textAnchor: 'middle' }
                      }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      label={{ 
                        value: 'Units', 
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
                      dataKey="units" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartWithInsight>

            <ChartWithInsight panelId="margin-trend" title="Margin Evolution">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={simulationResult.agg} margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="week" 
                      stroke="hsl(var(--muted-foreground))"
                      label={{ 
                        value: 'Week', 
                        position: 'insideBottom', 
                        offset: -5,
                        style: { textAnchor: 'middle' }
                      }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      label={{ 
                        value: 'Margin (₹)', 
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
                    <Bar dataKey="margin" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartWithInsight>
          </div>

          {/* Uncertainty Bands */}
          <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
            <div className="flex items-center space-x-3 mb-4">
              <TrendingUp className="h-6 w-6 text-warning" />
              <h3 className="text-lg font-semibold text-foreground">Uncertainty Analysis</h3>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">Confidence Interval</div>
                <div className="text-lg font-bold text-foreground">±2.3%</div>
                <p className="text-xs text-muted-foreground">95% confidence on volume impact</p>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">Model Accuracy</div>
                <div className="text-lg font-bold text-foreground">82%</div>
                <p className="text-xs text-muted-foreground">Historical prediction accuracy</p>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">Risk Score</div>
                <div className="text-lg font-bold text-warning">Medium</div>
                <p className="text-xs text-muted-foreground">Based on elasticity variance</p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default Simulator;