import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { analyzeDecision, type ThinkMateDecision } from "@/lib/thinkmate.functions";
import { Loader2, Plus, Scale, Sparkles, Trash2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/AuthGuard";

export const Route = createFileRoute("/decide")({
  head: () => ({
    meta: [
      { title: "Decision Tool — ThinkMate AI" },
      { name: "description", content: "Compare options with a weighted matrix. The final decision is yours." },
    ],
  }),
  component: () => (
    <AuthGuard>
      <DecidePage />
    </AuthGuard>
  ),
});

function DecidePage() {
  const [decision, setDecision] = useState("");
  const [values, setValues] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ThinkMateDecision | null>(null);
  const analyze = useServerFn(analyzeDecision);

  async function submit() {
    const filtered = options.map((o) => o.trim()).filter(Boolean);
    if (decision.trim().length < 5 || filtered.length < 2) {
      setError("Describe the decision and at least 2 options.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await analyze({ data: { decision: decision.trim(), options: filtered, values: values.trim() || undefined } });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not run analysis.");
    } finally {
      setLoading(false);
    }
  }

  const winner = result ? [...result.options].sort((a, b) => b.totalScore - a.totalScore)[0] : null;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.18em] text-primary font-medium inline-flex items-center gap-2">
            <Scale className="w-3.5 h-3.5" /> Decision Framework
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">When the answer isn't obvious</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Describe a complex choice. ThinkMate builds a weighted comparison and gives a reasoned recommendation — but the final call is yours.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* Input */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] space-y-5">
            <div>
              <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">The Decision</label>
              <textarea
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                disabled={loading}
                rows={3}
                placeholder="Should I accept the offer at Startup X or stay at BigCorp?"
                className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Options</label>
              <div className="mt-2 space-y-2">
                {options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground w-6">{String.fromCharCode(65 + i)}</span>
                    <input
                      value={o}
                      onChange={(e) => setOptions(options.map((v, j) => (j === i ? e.target.value : v)))}
                      disabled={loading}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => setOptions(options.filter((_, j) => j !== i))}
                        disabled={loading}
                        className="text-muted-foreground hover:text-destructive p-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {options.length < 6 && (
                  <button
                    onClick={() => setOptions([...options, ""])}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add option
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">What you value most <span className="opacity-60 normal-case">(optional)</span></label>
              <input
                value={values}
                onChange={(e) => setValues(e.target.value)}
                disabled={loading}
                placeholder="Growth, work-life balance, financial stability..."
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <button
              onClick={submit}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 shadow-[var(--shadow-glow)] hover:scale-[1.01] active:scale-[0.99] transition-transform"
              style={{ background: "var(--gradient-primary)" }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {loading ? "Weighing options..." : "Build comparison"}
            </button>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          {/* Result */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] min-h-[400px]">
            {!result ? (
              <div className="h-full grid place-items-center text-center text-sm text-muted-foreground">
                <div>
                  <Scale className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  Your weighted comparison will appear here.
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold inline-flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" /> Recommendation
                  </p>
                  <h2 className="mt-2 text-xl font-semibold leading-snug">{result.recommendation}</h2>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{result.reasoning}</p>
                </div>

                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-border">
                        <th className="py-2 px-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Factor</th>
                        {result.options.map((o) => (
                          <th key={o.name} className="py-2 px-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                            {o.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.factors.map((f) => (
                        <tr key={f.name} className="border-b border-border/50">
                          <td className="py-2.5 px-2">
                            <div className="font-medium">{f.name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">weight {f.weight}</div>
                          </td>
                          {result.options.map((o) => {
                            const s = o.scores.find((x) => x.factor === f.name);
                            return (
                              <td key={o.name} className="py-2.5 px-2">
                                <div className="font-mono font-semibold tabular-nums">{s?.score ?? "—"}</div>
                                {s?.reason && <div className="text-[11px] text-muted-foreground leading-snug">{s.reason}</div>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr>
                        <td className="py-3 px-2 font-semibold text-sm">Total</td>
                        {result.options.map((o) => (
                          <td
                            key={o.name}
                            className={cn(
                              "py-3 px-2 font-mono font-bold tabular-nums",
                              winner?.name === o.name ? "text-primary text-lg" : "text-foreground",
                            )}
                          >
                            {o.totalScore.toFixed(1)}
                            {winner?.name === o.name && <span className="ml-1.5 text-[10px] uppercase tracking-wider bg-primary/15 text-primary px-1.5 py-0.5 rounded">Top</span>}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
