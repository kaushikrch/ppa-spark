import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Trash2, Plus, ArrowRight, Package } from 'lucide-react';
import { apiService } from '../lib/api';

interface AssortmentSimProps {
  className?: string;
}

const AssortmentSim: React.FC<AssortmentSimProps> = ({ className = "" }) => {
  const [selectedForDelist, setSelectedForDelist] = useState<number[]>([]);
  interface SimulationRow {
    id: number;
    brand: string;
    pack: string;
    tier: string;
    share?: number;
    units: number;
    new_units?: number;
    volume_gain?: number;
  }

  interface DelistResult {
    rows: SimulationRow[];
  }

  const [simulationResult, setSimulationResult] = useState<DelistResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Mock SKU data
  const skus = [
    { id: 1001, brand: 'Aurel', pack: '250ml Can', tier: 'Value', share: 0.3, units: 1200 },
    { id: 1002, brand: 'Aurel', pack: '500ml PET', tier: 'Core', share: 2.1, units: 8500 },
    { id: 1003, brand: 'Novis', pack: '330ml Can', tier: 'Premium', share: 4.2, units: 15600 },
    { id: 1004, brand: 'Verra', pack: '1L PET', tier: 'Core', share: 1.8, units: 7200 },
    { id: 1005, brand: 'Kairo', pack: '250ml Can', tier: 'Value', share: 0.2, units: 800 },
    { id: 1006, brand: 'Lumio', pack: '1.5L PET', tier: 'Premium', share: 3.1, units: 12000 },
  ];

  const handleDelistSelection = (skuId: number) => {
    setSelectedForDelist(prev => 
      prev.includes(skuId) 
        ? prev.filter(id => id !== skuId)
        : [...prev, skuId]
    );
  };

  const runDelistSimulation = async () => {
    if (selectedForDelist.length === 0) return;
    
    setLoading(true);
    try {
      const response = await apiService.simulateDelist(selectedForDelist);
      setSimulationResult(response.data);
    } catch (error) {
      console.error('Simulation failed:', error);
      // Mock result for demo
      setSimulationResult({
        rows: skus.filter(sku => !selectedForDelist.includes(sku.id))
          .map(sku => ({
            ...sku,
            new_units: sku.units + Math.floor(Math.random() * 500),
            volume_gain: Math.floor(Math.random() * 500)
          }))
      });
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Premium': return 'bg-primary text-primary-foreground';
      case 'Core': return 'bg-secondary text-secondary-foreground';
      case 'Value': return 'bg-muted text-muted-foreground';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Current Assortment */}
        <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Current Assortment</h3>
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-3">
            {skus.map((sku) => (
              <div 
                key={sku.id}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  selectedForDelist.includes(sku.id)
                    ? 'border-destructive bg-destructive/10'
                    : 'border-border hover:border-primary/50 bg-card'
                }`}
                onClick={() => handleDelistSelection(sku.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-foreground">{sku.brand}</span>
                      <Badge className={getTierColor(sku.tier)}>{sku.tier}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{sku.pack}</p>
                    <p className="text-xs text-muted-foreground">
                      Share: {sku.share}% • Units: {sku.units.toLocaleString()}
                    </p>
                  </div>
                  {selectedForDelist.includes(sku.id) && (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-border">
            <Button 
              onClick={runDelistSimulation}
              disabled={selectedForDelist.length === 0 || loading}
              className="w-full bg-gradient-primary hover:opacity-90"
            >
              {loading ? 'Running Simulation...' : `Simulate Delist (${selectedForDelist.length} SKUs)`}
            </Button>
          </div>
        </Card>

        {/* Volume Transfer Results */}
        <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Volume Transfer Impact</h3>
            <ArrowRight className="h-5 w-5 text-primary" />
          </div>
          
          {simulationResult ? (
            <div className="space-y-3">
              {simulationResult.rows.slice(0, 6).map((sku: SimulationRow) => (
                <div key={sku.id} className="p-3 rounded-lg bg-card border border-border">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-foreground">{sku.brand}</span>
                        <Badge className={getTierColor(sku.tier)}>{sku.tier}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{sku.pack}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-success">
                        +{(sku.volume_gain || 0).toLocaleString()} units
                      </p>
                      <p className="text-xs text-muted-foreground">
                        New total: {(sku.new_units || sku.units).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm text-primary font-medium">
                  Total volume transferred: {simulationResult.rows
                    .reduce((sum: number, sku: SimulationRow) => sum + (sku.volume_gain || 0), 0)
                    .toLocaleString()} units
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select SKUs to delist and run simulation</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Pack Size Change Simulator */}
      <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
        <h3 className="text-lg font-semibold text-foreground mb-4">Pack Size Change Recommendations</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-foreground">eCom Channel</span>
              <Plus className="h-4 w-4 text-success" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">Add 750ml PET variant for convenience</p>
            <div className="space-y-1 text-xs">
              <p className="text-success">+12% NSV potential</p>
              <p className="text-muted-foreground">Low cannibalization risk</p>
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-foreground">Modern Trade</span>
              <ArrowRight className="h-4 w-4 text-warning" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">Upsize 330ml → 375ml premium cans</p>
            <div className="space-y-1 text-xs">
              <p className="text-success">+8% margin improvement</p>
              <p className="text-muted-foreground">Maintain price perception</p>
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-foreground">General Trade</span>
              <Trash2 className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">Phase out 1.5L for smaller households</p>
            <div className="space-y-1 text-xs">
              <p className="text-warning">Focus on 1L variants</p>
              <p className="text-muted-foreground">Better turnover</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AssortmentSim;