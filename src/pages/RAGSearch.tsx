import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

interface RAGHit {
  text: string;
  score: number;
  table: string;
}

export default function RAGSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<RAGHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!q.trim()) return;
    
    setLoading(true);
    setError("");
    
    try {
      const response = await axios.get(`${API_BASE}/rag/search`, { 
        params: { q, topk: 6 },
        timeout: 30000
      });
      setHits(response.data.hits || []);
    } catch (e: any) {
      console.error("RAG search failed:", e);
      setError("Search failed. Please check your connection and try again.");
      setHits([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">RAG Search Console</h1>
        <p className="text-muted-foreground">Search across indexed table data using the Vector Store</p>
      </div>

      {/* Search Interface */}
      <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
        <div className="flex gap-3">
          <Input
            className="flex-1 p-3 rounded-xl border border-border bg-background text-foreground"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about tables: pricing, demand, elasticities, SKUs..."
            disabled={loading}
          />
          <Button
            onClick={handleSearch}
            disabled={!q.trim() || loading}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-4 bg-destructive/10 border-destructive/20">
          <div className="text-destructive text-sm font-medium">{error}</div>
        </Card>
      )}

      {/* Results */}
      {hits.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Search Results ({hits.length} hits)
          </h2>
          {hits.map((hit, i) => (
            <Card key={i} className="p-4 bg-background border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="text-sm font-medium text-foreground">
                  Table: {hit.table}
                </div>
                <div className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  Score: {hit.score.toFixed(3)}
                </div>
              </div>
              <pre className="text-xs whitespace-pre-wrap text-muted-foreground font-mono leading-relaxed bg-muted/30 p-3 rounded-lg overflow-x-auto">
                {hit.text.slice(0, 1000)}{hit.text.length > 1000 ? "..." : ""}
              </pre>
            </Card>
          ))}
        </div>
      )}

      {/* Usage Tips */}
      <Card className="p-4 bg-muted/50 border">
        <h3 className="text-sm font-semibold text-foreground mb-2">Search Tips</h3>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Try queries like "SKU pricing data", "demand patterns", "elasticity coefficients"</li>
          <li>• Search for specific products, channels, or time periods</li>
          <li>• Use business terms like "revenue", "margin", "volume", "seasonality"</li>
          <li>• The system indexes: SKU master, pricing, demand, elasticities, and attributes</li>
        </ul>
      </Card>
    </div>
  );
}