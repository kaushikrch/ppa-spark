import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface ElasticityData {
  sku_id: number;
  brand: string;
  own_elast: number;
  cross_elast: Record<string, number>;
  stat_sig: number;
}

const ElasticityMatrix: React.FC = () => {
  const [elasticityData, setElasticityData] = useState<ElasticityData[]>([]);

  // Mock data for demonstration
  useEffect(() => {
    const mockData: ElasticityData[] = [
      { sku_id: 1001, brand: 'Aurel', own_elast: -1.24, cross_elast: { 'Novis': 0.15, 'Verra': 0.08 }, stat_sig: 1 },
      { sku_id: 1002, brand: 'Novis', own_elast: -0.89, cross_elast: { 'Aurel': 0.12, 'Kairo': 0.18 }, stat_sig: 1 },
      { sku_id: 1003, brand: 'Verra', own_elast: -1.56, cross_elast: { 'Lumio': 0.22, 'Aurel': 0.09 }, stat_sig: 1 },
      { sku_id: 1004, brand: 'Kairo', own_elast: -0.78, cross_elast: { 'Novis': 0.14, 'Verra': 0.11 }, stat_sig: 0 },
      { sku_id: 1005, brand: 'Lumio', own_elast: -1.12, cross_elast: { 'Kairo': 0.16, 'Aurel': 0.13 }, stat_sig: 1 },
    ];
    setElasticityData(mockData);
  }, []);

  const getElasticityColor = (value: number, isOwn: boolean = false) => {
    if (isOwn) {
      if (value > -0.5) return 'text-destructive'; // Highly elastic - problematic
      if (value > -1.0) return 'text-warning'; // Moderately elastic
      return 'text-success'; // Low elasticity - good for pricing
    } else {
      if (value > 0.2) return 'text-destructive'; // High substitution
      if (value > 0.1) return 'text-warning'; // Medium substitution
      return 'text-muted-foreground'; // Low substitution
    }
  };

  const getElasticityIcon = (value: number, isOwn: boolean = false) => {
    if (isOwn) {
      return value > -1.0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />;
    } else {
      return value > 0.15 ? <TrendingUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Own-Price Elasticity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {elasticityData.map((item) => (
            <Card key={item.sku_id} className="p-4 bg-gradient-secondary border-0 shadow-elegant">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{item.brand}</p>
                  <p className="text-sm text-muted-foreground">SKU {item.sku_id}</p>
                </div>
                <div className="text-right">
                  <div className={`flex items-center space-x-1 ${getElasticityColor(item.own_elast, true)}`}>
                    {getElasticityIcon(item.own_elast, true)}
                    <span className="font-bold">{item.own_elast.toFixed(2)}</span>
                  </div>
                  <Badge variant={item.stat_sig ? "default" : "secondary"} className="text-xs">
                    {item.stat_sig ? "Significant" : "Not Sig"}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Cross-Price Elasticity Matrix</h3>
        <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left p-2 text-muted-foreground font-medium">Brand</th>
                {['Aurel', 'Novis', 'Verra', 'Kairo', 'Lumio'].map(brand => (
                  <th key={brand} className="text-center p-2 text-muted-foreground font-medium">{brand}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {elasticityData.map((item) => (
                <tr key={item.sku_id}>
                  <td className="p-2 font-medium text-foreground">{item.brand}</td>
                  {['Aurel', 'Novis', 'Verra', 'Kairo', 'Lumio'].map(brand => {
                    const value = brand === item.brand ? item.own_elast : (item.cross_elast[brand] || 0);
                    const isOwn = brand === item.brand;
                    return (
                      <td key={brand} className="text-center p-2">
                        <div className={`flex items-center justify-center space-x-1 ${getElasticityColor(value, isOwn)}`}>
                          {getElasticityIcon(value, isOwn)}
                          <span className={`text-sm ${isOwn ? 'font-bold' : ''}`}>
                            {value.toFixed(2)}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
};

export default ElasticityMatrix;