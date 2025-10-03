import React from 'react';
import { Card } from './ui/card';
import { TrendingUp, TrendingDown, DollarSign, Package, Target, Zap } from 'lucide-react';
import { calculateTrend, formatChange } from '../lib/kpi';
import { formatCurrency, formatPercent, formatUnits } from '../lib/metrics';

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

type KPIKeys = 'revenue' | 'volume' | 'margin' | 'gm_percent' | 'spend';

type KPIMap = Record<KPIKeys, number>;

interface KPICardsProps {
  data?: Partial<KPIMap>;
  previous?: Partial<KPIMap>;
}

const defaultCurrent: KPIMap = {
  revenue: 12_800_000,
  volume: 872_000,
  margin: 3_380_000,
  gm_percent: 27.4,
  spend: 925_000,
};

const defaultPrevious: KPIMap = {
  revenue: 12_050_000,
  volume: 838_000,
  margin: 3_210_000,
  gm_percent: 26.1,
  spend: 960_000,
};

const resolveKpis = (
  overrides: Partial<KPIMap> | undefined,
  fallback: KPIMap,
): KPIMap => ({
  revenue: overrides?.revenue ?? fallback.revenue,
  volume: overrides?.volume ?? fallback.volume,
  margin: overrides?.margin ?? fallback.margin,
  gm_percent: overrides?.gm_percent ?? fallback.gm_percent,
  spend: overrides?.spend ?? fallback.spend,
});

const KPICards: React.FC<KPICardsProps> = ({ data, previous }) => {
  const currentKpis = resolveKpis(data, defaultCurrent);
  const previousKpis = resolveKpis(previous, defaultPrevious);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <KPICard
        title="Revenue"
        current={currentKpis.revenue}
        previous={previousKpis.revenue}
        formatter={(v) => formatCurrency(v)}
        icon={<DollarSign className="h-5 w-5" />}
      />
      <KPICard
        title="Volume"
        current={currentKpis.volume}
        previous={previousKpis.volume}
        formatter={(v) => formatUnits(v)}
        icon={<Package className="h-5 w-5" />}
      />
      <KPICard
        title="Margin"
        current={currentKpis.margin}
        previous={previousKpis.margin}
        formatter={(v) => formatCurrency(v)}
        icon={<Target className="h-5 w-5" />}
      />
      <KPICard
        title="GM%"
        current={currentKpis.gm_percent}
        previous={previousKpis.gm_percent}
        formatter={(v) => formatPercent(v)}
        icon={<TrendingUp className="h-5 w-5" />}
      />
      <KPICard
        title="Trade Spend"
        current={currentKpis.spend}
        previous={previousKpis.spend}
        formatter={(v) => formatCurrency(v)}
        icon={<Zap className="h-5 w-5" />}
      />
    </div>
  );
};

export default KPICards;
