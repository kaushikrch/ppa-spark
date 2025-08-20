import React from 'react';
import { Card } from './ui/card';
import { TrendingUp, TrendingDown, DollarSign, Package, Target, Zap } from 'lucide-react';
import { calculateTrend, formatChange } from '../lib/kpi';

interface KPICardProps {
  title: string;
  current: number;
  previous: number;
  formatter: (value: number) => string;
  icon: React.ReactNode;
}

const KPICard: React.FC<KPICardProps> = ({ title, current, previous, formatter, icon }) => {
  const { change, trend } = calculateTrend(current, previous);
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';
  const TrendIcon = trend === 'down' ? TrendingDown : TrendingUp;

  return (
    <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant hover:shadow-purple transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{formatter(current)}</p>
          </div>
        </div>
        <div className={`flex items-center space-x-1 ${trendColor}`}>
          <TrendIcon className="h-4 w-4" />
          <span className="text-sm font-medium">{formatChange(change)}</span>
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
  const baseline = {
    revenue: 12500000,
    volume: 850000,
    margin: 3250000,
    gm_percent: 26.8,
    spend: 950000
  };
  const kpis = data || baseline;

  const formatCurrency = (value: number) => `₹${(value / 1000000).toFixed(1)}M`;
  const formatUnits = (value: number) => `${(value / 1000).toFixed(0)}K`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <KPICard
        title="Revenue"
        current={kpis.revenue}
        previous={baseline.revenue}
        formatter={formatCurrency}
        icon={<DollarSign className="h-5 w-5" />}
      />
      <KPICard
        title="Volume"
        current={kpis.volume}
        previous={baseline.volume}
        formatter={formatUnits}
        icon={<Package className="h-5 w-5" />}
      />
      <KPICard
        title="Margin"
        current={kpis.margin}
        previous={baseline.margin}
        formatter={formatCurrency}
        icon={<Target className="h-5 w-5" />}
      />
      <KPICard
        title="GM%"
        current={kpis.gm_percent}
        previous={baseline.gm_percent}
        formatter={formatPercent}
        icon={<TrendingUp className="h-5 w-5" />}
      />
      <KPICard
        title="Trade Spend"
        current={kpis.spend}
        previous={baseline.spend}
        formatter={formatCurrency}
        icon={<Zap className="h-5 w-5" />}
      />
    </div>
  );
};

export default KPICards;
