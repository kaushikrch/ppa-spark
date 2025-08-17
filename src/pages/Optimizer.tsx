import React from 'react';
import OptimizerView from '../components/OptimizerView';

const Optimizer: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Price Optimization Engine</h1>
        <p className="text-muted-foreground">MILP-based optimization with guardrails and constraint management</p>
      </div>

      {/* Optimizer Component */}
      <OptimizerView />
    </div>
  );
};

export default Optimizer;