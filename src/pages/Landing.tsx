import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import KPICards from '../components/KPICards';
import ChartWithInsight from '../components/ChartWithInsight';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Package, Target, Zap, RefreshCw } from 'lucide-react';
import { apiService } from '../lib/api';

const Landing: React.FC = () => {
  const [dataInitialized, setDataInitialized] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mock trend data
  const trendData = [
    { week: 'W1', revenue: 2.1, volume: 82, margin: 0.68 },
    { week: 'W2', revenue: 2.3, volume: 85, margin: 0.72 },
    { week: 'W3', revenue: 2.0, volume: 79, margin: 0.65 },
    { week: 'W4', revenue: 2.4, volume: 88, margin: 0.78 },
    { week: 'W5', revenue: 2.6, volume: 92, margin: 0.82 },
    { week: 'W6', revenue: 2.5, volume: 90, margin: 0.80 },
    { week: 'W7', revenue: 2.7, volume: 95, margin: 0.85 },
    { week: 'W8', revenue: 2.8, volume: 98, margin: 0.88 },
  ];

  const channelData = [
    { channel: 'ModernTrade', value: 45, color: '#8B5CF6' },
    { channel: 'GeneralTrade', value: 35, color: '#A78BFA' },
    { channel: 'eCom', value: 20, color: '#C4B5FD' },
  ];

  const brandPerformance = [
    { brand: 'Aurel', revenue: 3.2, margin: 28.5, change: 4.2 },
    { brand: 'Novis', revenue: 2.8, margin: 24.1, change: -1.8 },
    { brand: 'Verra', revenue: 2.1, margin: 32.8, change: 7.3 },
    { brand: 'Kairo', revenue: 1.9, margin: 22.4, change: -2.1 },
    { brand: 'Lumio', revenue: 2.4, margin: 35.2, change: 8.7 },
  ];

  const initializeData = async () => {
    setLoading(true);
    try {
      await apiService.generateData();
      await apiService.trainModels();
      setDataInitialized(true);
    } catch (error) {
      console.error('Data initialization failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if data exists, if not initialize
    apiService.health().then(() => {
      setDataInitialized(true);
    }).catch(() => {
      // Data might not exist, user can initialize manually
    });
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Executive Dashboard</h1>
          <p className="text-muted-foreground">Integrated NRM: Price-Pack Architecture + Assortment Optimization</p>
        </div>
        <div className="flex items-center space-x-3">
          {!dataInitialized && (
            <Button 
              onClick={initializeData}
              disabled={loading}
              className="bg-gradient-primary hover:opacity-90"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Initialize Demo Data
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards />

      {/* Trend Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartWithInsight panelId="revenue-trend" title="Revenue & Volume Trends">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="margin" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--success))', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartWithInsight>

        <ChartWithInsight panelId="channel-mix" title="Channel Performance Mix">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartWithInsight>
      </div>

      {/* Brand Performance */}
      <ChartWithInsight panelId="brand-performance" title="Brand Performance Matrix">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={brandPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="brand" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="margin" fill="hsl(var(--primary-glow))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartWithInsight>

      {/* Quick Insights */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="h-6 w-6 text-success" />
            <h3 className="font-semibold text-foreground">Revenue Growth</h3>
          </div>
          <p className="text-2xl font-bold text-success mb-2">+4.2%</p>
          <p className="text-sm text-muted-foreground">
            Driven by premium pack expansion and selective price increases in Modern Trade
          </p>
        </Card>

        <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
          <div className="flex items-center space-x-3 mb-4">
            <Package className="h-6 w-6 text-primary" />
            <h3 className="font-semibold text-foreground">Assortment Efficiency</h3>
          </div>
          <p className="text-2xl font-bold text-primary mb-2">78%</p>
          <p className="text-sm text-muted-foreground">
            Opportunity to optimize SKU mix and reduce tail complexity by 12 SKUs
          </p>
        </Card>

        <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
          <div className="flex items-center space-x-3 mb-4">
            <Target className="h-6 w-6 text-warning" />
            <h3 className="font-semibold text-foreground">Price Optimization</h3>
          </div>
          <p className="text-2xl font-bold text-warning mb-2">₹2.3M</p>
          <p className="text-sm text-muted-foreground">
            Potential margin uplift from strategic price-pack architecture changes
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Landing;