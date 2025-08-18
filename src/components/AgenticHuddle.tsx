import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../lib/api";
import { Card } from "./ui/card";
import PromptTiles from "./PromptTiles";

type PlanAction = {
  action_type: string;
  target_type: string;
  ids: string[];
  magnitude_pct: number;
  expected_impact?: { units?: number; revenue?: number; margin?: number };
  constraints?: string[];
  risks?: string[];
  confidence?: number;
  evidence_refs?: string[];
};

type PlanJSON = {
  plan_name: string;
  assumptions?: string[];
  actions: PlanAction[];
  rationale?: string;
};

export default function AgenticHuddle() {
  const [q, setQ] = useState("");
  const [budget, setBudget] = useState<number>(500000);
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [apiOverride, setApiOverride] = useState<string>(localStorage.getItem('API_BASE_OVERRIDE') || "");

  const start = async () => {
    setLoading(true); 
    setError(""); 
    setResp(null);
    try {
      const r = await axios.post(`${API_BASE}/huddle/run`, null, { params: { q, budget }});
      setResp(r.data);
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || e?.response?.data?.detail || e?.message || "Failed to run huddle";
      setError(status ? `${status}: ${msg} @ ${API_BASE}/huddle/run` : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleTileClick = (question: string) => {
    setQ(question);
    // Auto-start huddle when tile is clicked
    setTimeout(() => {
      start();
    }, 100);
  };

  const FinalPlan: PlanJSON | undefined = resp?.final;

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <Card className="p-6 bg-gradient-secondary border-0 shadow-elegant">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="col-span-3">
              <label className="block text-sm font-medium text-foreground mb-2">
                Business Question
              </label>
              <textarea
                className="w-full p-3 rounded-xl border border-border bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Ask a complex PPA or assortment question..."
                value={q}
                onChange={e => setQ(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Budget (₹)
              </label>
              <input
                className="w-full p-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                type="number"
                value={budget}
                onChange={e => setBudget(Number(e.target.value))}
                placeholder="Budget (₹)"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={start}
              disabled={!q || loading}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors duration-200"
            >
              {loading ? "Huddle Running..." : "Start Huddle"}
            </button>
            <details className="rounded-lg p-3 bg-muted">
              <summary className="cursor-pointer text-sm text-muted-foreground">Advanced API settings</summary>
              <div className="mt-3 space-y-2 text-xs">
                <div className="text-muted-foreground">Current API base: <span className="font-mono">{API_BASE}</span></div>
                <input
                  className="w-full p-2 rounded-md border border-border bg-background text-foreground"
                  placeholder="https://your-api-domain"
                  value={apiOverride}
                  onChange={e => setApiOverride(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    className="px-3 py-2 rounded-md bg-primary text-primary-foreground"
                    onClick={() => { localStorage.setItem('API_BASE_OVERRIDE', apiOverride); window.location.reload(); }}
                  >Save & Use</button>
                  <button
                    className="px-3 py-2 rounded-md bg-secondary text-secondary-foreground"
                    onClick={() => { localStorage.removeItem('API_BASE_OVERRIDE'); localStorage.removeItem('API_BASE_SELECTED'); window.location.reload(); }}
                  >Clear</button>
                </div>
                <div className="text-muted-foreground">If you see 404, ensure your API exposes /huddle/run and /health.</div>
              </div>
            </details>
          </div>
        </div>
      </Card>

      {error && (
        <Card className="p-4 bg-destructive/10 border-destructive/20">
          <div className="text-destructive text-sm font-medium">{error}</div>
        </Card>
      )}

      {/* Show prompt tiles if no response */}
      {!resp && !loading && (
        <PromptTiles onAsk={handleTileClick} />
      )}

      {/* Transcript */}
      {resp?.transcript && (
        <Card className="p-6 bg-background border shadow-elegant">
          <div className="text-lg font-semibold mb-4 text-foreground">Debate Transcript (3 rounds max)</div>
          <div className="space-y-3">
            {resp.transcript.map((t: any, idx: number) => (
              <div key={idx} className="p-4 bg-muted rounded-xl border">
                <div className="text-xs text-muted-foreground font-medium mb-2">
                  {t.role} • Round {t.round}
                </div>
                {t.plan && (
                  <div className="bg-background rounded-lg p-3 mb-2">
                    <div className="text-sm font-medium text-foreground mb-1">
                      Plan: {t.plan.plan_name || "Unnamed Plan"}
                    </div>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                      {JSON.stringify(t.plan, null, 2)}
                    </pre>
                  </div>
                )}
                {t.kpis && (
                  <div className="text-xs mt-2 p-2 bg-primary/5 rounded">
                    <span className="font-medium text-primary">KPIs:</span>{" "}
                    <span className="text-foreground">{JSON.stringify(t.kpis)}</span>
                  </div>
                )}
                {t.risks && (
                  <div className="text-xs mt-2 p-2 bg-destructive/5 rounded">
                    <span className="font-medium text-destructive">Risks:</span>{" "}
                    <span className="text-foreground">{JSON.stringify(t.risks)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Final Plan */}
      {FinalPlan && (
        <Card className="p-6 bg-gradient-primary border-0 shadow-purple">
          <div className="text-xl font-bold mb-4 text-primary-foreground">
            Final Action Plan: {FinalPlan.plan_name}
          </div>
          
          {FinalPlan.assumptions && FinalPlan.assumptions.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium text-primary-foreground/90 mb-2">Assumptions:</div>
              <ul className="list-disc pl-5 text-sm text-primary-foreground/80">
                {FinalPlan.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm bg-background/10 rounded-lg">
              <thead>
                <tr className="text-left border-b border-primary-foreground/20">
                  <th className="p-3 text-primary-foreground font-medium">Action</th>
                  <th className="p-3 text-primary-foreground font-medium">Targets</th>
                  <th className="p-3 text-primary-foreground font-medium">Δ%</th>
                  <th className="p-3 text-primary-foreground font-medium">Impact (U/Rev/Mgn)</th>
                  <th className="p-3 text-primary-foreground font-medium">Risks</th>
                  <th className="p-3 text-primary-foreground font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {FinalPlan.actions?.map((a, i) => (
                  <tr key={i} className="border-t border-primary-foreground/10">
                    <td className="p-3 text-primary-foreground/90 font-medium">
                      {a.action_type.replace('_', ' ')}
                    </td>
                    <td className="p-3 text-primary-foreground/80">
                      <div>{a.target_type}</div>
                      <div className="text-xs text-primary-foreground/60">
                        {a.ids?.join(", ")}
                      </div>
                    </td>
                    <td className="p-3 text-primary-foreground/90 font-mono">
                      {(a.magnitude_pct * 100).toFixed(1)}%
                    </td>
                    <td className="p-3 text-primary-foreground/80 text-xs">
                      <div>U: {a.expected_impact?.units?.toFixed(0) ?? "-"}</div>
                      <div>Rev: {a.expected_impact?.revenue?.toFixed(0) ?? "-"}</div>
                      <div>Mgn: {a.expected_impact?.margin?.toFixed(0) ?? "-"}</div>
                    </td>
                    <td className="p-3 text-primary-foreground/70 text-xs max-w-48">
                      {a.risks?.slice(0, 2).join("; ") || "-"}
                    </td>
                    <td className="p-3 text-primary-foreground/90 font-mono">
                      {(a.confidence ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {FinalPlan.rationale && (
            <div className="mt-4 p-3 bg-background/10 rounded-lg">
              <div className="text-sm font-medium text-primary-foreground/90 mb-1">Rationale:</div>
              <div className="text-sm text-primary-foreground/80">{FinalPlan.rationale}</div>
            </div>
          )}
        </Card>
      )}

      {/* Citations */}
      {resp?.citations && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors p-3 bg-muted rounded-lg">
            Evidence & Citations (RAG) - Click to expand
          </summary>
          <Card className="mt-2 p-4 bg-background border">
            <pre className="text-xs whitespace-pre-wrap text-muted-foreground font-mono leading-relaxed">
              {resp.citations.join("\n\n---\n\n")}
            </pre>
          </Card>
        </details>
      )}
    </div>
  );
}