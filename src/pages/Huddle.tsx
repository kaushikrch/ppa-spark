import React from 'react';
import AgenticHuddle from '../components/AgenticHuddle';

const Huddle: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Agentic AI Huddle</h1>
        <p className="text-muted-foreground">Multi-agent collaboration for complex PPA and assortment decisions</p>
      </div>

      {/* Huddle Component */}
      <AgenticHuddle />
    </div>
  );
};

export default Huddle;