import React, { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Download, FileText, CheckCircle, AlertTriangle, Calendar, User } from 'lucide-react';

const Decisions: React.FC = () => {
  const [selectedDecisions, setSelectedDecisions] = useState<string[]>([]);

  // Mock decision log data
  const decisions = [
    {
      id: '1',
      title: 'Premium Pack Price Increase',
      description: 'Apply +6% price increase on Verra 1L PET in Modern Trade',
      category: 'Pricing',
      impact: { revenue: '+3.2%', margin: '+8.4%', volume: '-1.2%' },
      confidence: 0.85,
      assumptions: [
        'Own-price elasticity remains at -1.56',
        'No competitive response in first 4 weeks',
        'Modern Trade acceptance of premium positioning'
      ],
      constraints: [
        'Maximum 6% increase to stay within guardrails',
        'Implement gradually over 2 weeks',
        'Monitor weekly performance indicators'
      ],
      expectedKpis: {
        revenue: 12850000,
        margin: 3420000,
        volume: 842000
      },
      riskLevel: 'Medium',
      implementationDate: '2024-02-01',
      owner: 'Price Strategy Team'
    },
    {
      id: '2',
      title: 'SKU Rationalization',
      description: 'Delist 3 tail SKUs with <0.5% market share',
      category: 'Assortment',
      impact: { revenue: '-0.3%', margin: '+2.1%', volume: '-2.8%' },
      confidence: 0.72,
      assumptions: [
        '75% volume transfer to remaining SKUs',
        'No significant retailer pushback',
        'Shelf space reallocation successful'
      ],
      constraints: [
        'Maintain category presence in all channels',
        'Complete transition within 6 weeks',
        'Ensure adequate substitute availability'
      ],
      expectedKpis: {
        revenue: 12420000,
        margin: 3210000,
        volume: 826000
      },
      riskLevel: 'Low',
      implementationDate: '2024-02-15',
      owner: 'Category Management'
    },
    {
      id: '3',
      title: 'Promotional Optimization',
      description: 'Reduce promo depth from 25% to 18% on low-ROI SKUs',
      category: 'Trade Spend',
      impact: { revenue: '+1.8%', margin: '+4.2%', volume: '-0.5%' },
      confidence: 0.78,
      assumptions: [
        'Promo elasticity curve holds at lower depths',
        'Competitive promo activity remains stable',
        'Retailer cooperation on new depth levels'
      ],
      constraints: [
        'Maintain minimum 15% depth for key events',
        'Test in select regions first',
        'ROI must exceed 2.5x threshold'
      ],
      expectedKpis: {
        revenue: 12680000,
        margin: 3340000,
        volume: 846000
      },
      riskLevel: 'Medium',
      implementationDate: '2024-01-20',
      owner: 'Trade Marketing'
    }
  ];

  const handleDecisionToggle = (decisionId: string) => {
    setSelectedDecisions(prev => 
      prev.includes(decisionId) 
        ? prev.filter(id => id !== decisionId)
        : [...prev, decisionId]
    );
  };

  const exportDecisions = () => {
    const selectedData = decisions.filter(d => selectedDecisions.includes(d.id));
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Title,Category,Revenue Impact,Margin Impact,Volume Impact,Risk Level,Implementation Date,Owner\n" +
      selectedData.map(d => 
        `"${d.title}","${d.category}","${d.impact.revenue}","${d.impact.margin}","${d.impact.volume}","${d.riskLevel}","${d.implementationDate}","${d.owner}"`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "decision_log.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'bg-success text-success-foreground';
      case 'Medium': return 'bg-warning text-warning-foreground';
      case 'High': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Pricing': return <CheckCircle className="h-4 w-4" />;
      case 'Assortment': return <FileText className="h-4 w-4" />;
      case 'Trade Spend': return <AlertTriangle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Decision Log & Export</h1>
          <p className="text-muted-foreground">Final recommendations with assumptions, constraints, and expected KPIs</p>
        </div>
        <Button 
          onClick={exportDecisions}
          disabled={selectedDecisions.length === 0}
          className="bg-gradient-primary hover:opacity-90"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Selected ({selectedDecisions.length})
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="p-4 bg-gradient-secondary border-0 shadow-elegant">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">{decisions.length}</div>
            <div className="text-sm text-muted-foreground">Total Decisions</div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-secondary border-0 shadow-elegant">
          <div className="text-center">
            <div className="text-2xl font-bold text-success mb-1">
              +{decisions.reduce((sum, d) => sum + parseFloat(d.impact.revenue.replace('%', '')), 0).toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Combined Revenue Impact</div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-secondary border-0 shadow-elegant">
          <div className="text-center">
            <div className="text-2xl font-bold text-success mb-1">
              +{decisions.reduce((sum, d) => sum + parseFloat(d.impact.margin.replace('%', '')), 0).toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Combined Margin Impact</div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-secondary border-0 shadow-elegant">
          <div className="text-center">
            <div className="text-2xl font-bold text-warning mb-1">0.78</div>
            <div className="text-sm text-muted-foreground">Average Confidence</div>
          </div>
        </Card>
      </div>

      {/* Decision Cards */}
      <div className="space-y-6">
        {decisions.map((decision) => (
          <Card 
            key={decision.id} 
            className={`p-6 border-2 transition-all duration-200 cursor-pointer ${
              selectedDecisions.includes(decision.id) 
                ? 'border-primary bg-primary/5 shadow-purple' 
                : 'border-border bg-gradient-secondary shadow-elegant hover:shadow-purple'
            }`}
            onClick={() => handleDecisionToggle(decision.id)}
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {getCategoryIcon(decision.category)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{decision.title}</h3>
                      <p className="text-sm text-muted-foreground">{decision.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{decision.category}</Badge>
                    <Badge className={getRiskColor(decision.riskLevel)}>{decision.riskLevel} Risk</Badge>
                    <Badge variant="secondary">
                      Confidence: {Math.round(decision.confidence * 100)}%
                    </Badge>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{decision.implementationDate}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{decision.owner}</span>
                  </div>
                </div>
              </div>

              {/* Impact Metrics */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-card border border-border text-center">
                  <div className="text-lg font-bold text-success">{decision.impact.revenue}</div>
                  <div className="text-sm text-muted-foreground">Revenue Impact</div>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border text-center">
                  <div className="text-lg font-bold text-success">{decision.impact.margin}</div>
                  <div className="text-sm text-muted-foreground">Margin Impact</div>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border text-center">
                  <div className={`text-lg font-bold ${decision.impact.volume.startsWith('-') ? 'text-warning' : 'text-success'}`}>
                    {decision.impact.volume}
                  </div>
                  <div className="text-sm text-muted-foreground">Volume Impact</div>
                </div>
              </div>

              {/* Expected KPIs */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="font-medium text-primary mb-3">Expected KPIs After Implementation</h4>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Revenue: </span>
                    <span className="font-medium text-foreground">₹{(decision.expectedKpis.revenue / 1000000).toFixed(1)}M</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Margin: </span>
                    <span className="font-medium text-foreground">₹{(decision.expectedKpis.margin / 1000000).toFixed(1)}M</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Volume: </span>
                    <span className="font-medium text-foreground">{(decision.expectedKpis.volume / 1000).toFixed(0)}K units</span>
                  </div>
                </div>
              </div>

              {/* Assumptions & Constraints */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-foreground mb-3">Key Assumptions</h4>
                  <ul className="space-y-2">
                    {decision.assumptions.map((assumption, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{assumption}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-3">Implementation Constraints</h4>
                  <ul className="space-y-2">
                    {decision.constraints.map((constraint, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{constraint}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Export Options */}
      <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
        <div className="flex items-center space-x-3 mb-4">
          <Download className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Export Options</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <Button variant="outline" className="w-full" disabled={selectedDecisions.length === 0}>
            <FileText className="h-4 w-4 mr-2" />
            Export to CSV
          </Button>
          <Button variant="outline" className="w-full" disabled={selectedDecisions.length === 0}>
            <FileText className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
          <Button variant="outline" className="w-full" disabled={selectedDecisions.length === 0}>
            <FileText className="h-4 w-4 mr-2" />
            Export to PowerPoint
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          Select decisions above to enable export. Exports include all assumptions, constraints, and expected KPIs.
        </p>
      </Card>
    </div>
  );
};

export default Decisions;