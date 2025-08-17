import React from 'react';
import { Card } from './ui/card';
import { TrendingUp, TrendingDown, DollarSign, Package, Target, Zap } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, change, trend, icon }) => {
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;

  return (
    <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant hover:shadow-purple transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        </div>
        <div className={`flex items-center space-x-1 ${trendColor}`}>
          <TrendIcon className="h-4 w-4" />
          <span className="text-sm font-medium">{change}</span>
        </div>
      </div>
    </Card>
  );
};

interface KPICardsProps {
  data?: {
    revenue: number;
    volume: number;
    margin: number;
    gm_percent: number;
    spend: number;
  };
}

const KPICards: React.FC<KPICardsProps> = ({ data }) => {
  const kpis = data || {
    revenue: 12500000,
    volume: 850000,
    margin: 3250000,
    gm_percent: 26.8,
    spend: 950000
  };

  const formatCurrency = (value: number) => `₹${(value / 1000000).toFixed(1)}M`;
  const formatUnits = (value: number) => `${(value / 1000).toFixed(0)}K`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <KPICard
        title="Revenue"
        value={formatCurrency(kpis.revenue)}
        change="+4.2%"
        trend="up"
        icon={<DollarSign className="h-5 w-5" />}
      />
      <KPICard
        title="Volume"
        value={formatUnits(kpis.volume)}
        change="-1.8%"
        trend="down"
        icon={<Package className="h-5 w-5" />}
      />
      <KPICard
        title="Margin"
        value={formatCurrency(kpis.margin)}
        change="+7.3%"
        trend="up"
        icon={<Target className="h-5 w-5" />}
      />
      <KPICard
        title="GM%"
        value={formatPercent(kpis.gm_percent)}
        change="+2.1%"
        trend="up"
        icon={<TrendingUp className="h-5 w-5" />}
      />
      <KPICard
        title="Trade Spend"
        value={formatCurrency(kpis.spend)}
        change="-5.4%"
        trend="down"
        icon={<Zap className="h-5 w-5" />}
      />
    </div>
  );
};

export default KPICards;