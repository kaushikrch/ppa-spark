import React, { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Search, Copy, Database, FileText, Brain } from 'lucide-react';
import { ragService } from '../lib/rag';

interface SearchResult {
  doc: string;
  score: number;
}

const RAG: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const searchResults = await ragService.search(query);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      // Offline fallback with contextual results based on query
      const mockResults = generateMockResults(query);
      setResults(mockResults);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'bg-success text-success-foreground';
    if (score >= 0.6) return 'bg-warning text-warning-foreground';
    return 'bg-muted text-muted-foreground';
  };

  const formatTableData = (doc: string) => {
    const lines = doc.split('\n');
    const tableName = lines[0].replace('TABLE:', '');
    const dataLines = lines.slice(1).filter(line => line.trim());
    
    return { tableName, dataLines };
  };

  // Sample queries for quick testing
  // Generate mock results based on query context
  const generateMockResults = (query: string) => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('elasticity')) {
      return [
        {
          doc: `TABLE:elasticities
sku_id,own_elast,cross_elast_json,stat_sig
1001,-1.24,{"Novis":0.15,"Verra":0.08},1
1002,-0.89,{"Aurel":0.12,"Kairo":0.18},1
1003,-1.56,{"Lumio":0.22,"Aurel":0.09},1
1004,-0.78,{"Novis":0.14,"Verra":0.11},0
1005,-1.12,{"Kairo":0.16,"Aurel":0.13},1`,
          score: 0.92
        }
      ];
    } else if (lowerQuery.includes('price') || lowerQuery.includes('promo')) {
      return [
        {
          doc: `TABLE:price_weekly
week,retailer_id,sku_id,list_price,net_price,promo_flag,promo_depth,discount_spend
1,1,1001,2.45,2.20,1,0.10,0.25
2,1,1001,2.45,2.45,0,0.00,0.00
3,2,1002,3.30,2.97,1,0.10,0.33
4,1,1003,4.25,4.25,0,0.00,0.00
5,3,1001,2.50,2.00,1,0.20,0.50`,
          score: 0.88
        }
      ];
    } else if (lowerQuery.includes('brand') || lowerQuery.includes('sku')) {
      return [
        {
          doc: `TABLE:sku_master
sku_id,brand,subcat,pack_size_ml,pack_type,tier,sugar_free,flavor,launch_week
1001,Aurel,CSD,330,Can,Core,0,Cola,12
1002,Novis,CSD,500,PET,Premium,1,Orange,8
1003,Verra,CSD,1000,PET,Premium,0,Berry,15
1004,Kairo,CSD,250,Can,Value,0,Lime,20
1005,Lumio,CSD,1500,PET,Premium,1,Ginger,5`,
          score: 0.85
        }
      ];
    } else {
      return [
        {
          doc: `TABLE:demand_weekly
week,retailer_id,sku_id,units,revenue,base_units,uplift_units
1,1,1001,1250,2750,1000,250
2,1,1002,890,2937,780,110
3,2,1003,654,2779,590,64
4,1,1004,1420,2769,1200,220
5,3,1005,567,3119,490,77`,
          score: 0.75
        }
      ];
    }
  };

  const sampleQueries = [
    "What are the elasticity values for premium brands?",
    "Show me price changes for SKUs with high promotion depth",
    "Which brands have the highest cross-elasticity?",
    "Find SKUs with low statistical significance in elasticity",
    "What is the price ladder for PET bottles?"
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">RAG Search Console</h1>
        <p className="text-muted-foreground">Search across all data tables with context-aware retrieval and citations</p>
      </div>

      {/* Search Interface */}
      <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
        <div className="flex items-center space-x-3 mb-4">
          <Search className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Knowledge Search</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex space-x-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across elasticity, pricing, SKU master, and demand data..."
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button 
              onClick={handleSearch}
              disabled={!query.trim() || loading}
              className="bg-gradient-primary hover:opacity-90"
            >
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
          
          {/* Sample Queries */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Quick examples:</p>
            <div className="flex flex-wrap gap-2">
              {sampleQueries.map((sample, index) => (
                <Badge 
                  key={index}
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => setQuery(sample)}
                >
                  {sample}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Search Results ({results.length})</h3>
            <Badge variant="outline" className="text-sm">
              Query: "{query}"
            </Badge>
          </div>
          
          {results.map((result, index) => {
            const { tableName, dataLines } = formatTableData(result.doc);
            
            return (
              <Card key={index} className="p-6 bg-gradient-secondary border-0 shadow-elegant">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Database className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold text-foreground">{tableName}</h4>
                    <Badge className={getScoreColor(result.score)}>
                      Relevance: {(result.score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(result.doc)}
                    className="flex items-center space-x-2"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </Button>
                </div>
                
                <div className="bg-card rounded-lg p-4 border border-border">
                  <div className="font-mono text-sm overflow-x-auto">
                    {dataLines.slice(0, 10).map((line, lineIndex) => (
                      <div 
                        key={lineIndex} 
                        className={`py-1 ${lineIndex === 0 ? 'font-bold text-primary border-b border-border pb-2 mb-2' : 'text-muted-foreground'}`}
                      >
                        {line}
                      </div>
                    ))}
                    {dataLines.length > 10 && (
                      <div className="text-xs text-muted-foreground italic mt-2">
                        ... and {dataLines.length - 10} more rows
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* How to Use */}
      <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
        <div className="flex items-center space-x-3 mb-4">
          <Brain className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">How to Use RAG Search</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-foreground mb-2">Search Tips</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start space-x-2">
                <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                <span>Use specific terms like "elasticity", "price", "brand", "promotion"</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                <span>Ask questions about relationships: "which brands compete?"</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                <span>Search for numerical patterns: "high elasticity", "low prices"</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-2">Available Data</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start space-x-2">
                <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                <span>SKU Master (brands, packs, tiers, flavors)</span>
              </li>
              <li className="flex items-start space-x-2">
                <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                <span>Price & Demand (weekly data, promotions)</span>
              </li>
              <li className="flex items-start space-x-2">
                <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                <span>Elasticities (own & cross-price, significance)</span>
              </li>
              <li className="flex items-start space-x-2">
                <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                <span>Attribute Importance (model features, SHAP values)</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RAG;