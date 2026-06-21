import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MentalLoadGauge } from "@/components/MentalLoadGauge";
import { useThinkMate, QUADRANTS } from "@/lib/thinkmate-store";
import { ArrowRight, CheckCircle2, Circle, Clock, PenLine, Sparkles, Target, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/AuthGuard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ThinkMate AI" },
      { name: "description", content: "Your mental load score, today's top priorities, and your single smart next step." },
    ],
  }),
  component: () => (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  ),
});

type LoadHistoryItem = {
  date: string;
  score: number;
  risk_level: string;
};

type SessionContext = {
  sessionSummary: string;
  classificationExplanations: Array<{
    taskTitle: string;
    quadrant: "do_now" | "schedule" | "delegate" | "ignore";
    reason: string;
  }>;
};

function Dashboard() {
  const { state, toggleTask } = useThinkMate();
  const hasData = state.lastUpdated !== null;

  // Rationale section expand state
  const [explainExpanded, setExplainExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("thinkmate-explain-expanded") === "true";
    }
    return false;
  });

  // Load history local state
  const [loadHistory, setLoadHistory] = useState<LoadHistoryItem[]>([]);
  // Session context local state
  const [sessionContext, setSessionContext] = useState<SessionContext | null>(null);

  // Read load history and context on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const rawHist = window.localStorage.getItem("thinkmate-load-history");
        if (rawHist) setLoadHistory(JSON.parse(rawHist));

        const rawCtx = window.localStorage.getItem("thinkmate-session-context");
        if (rawCtx) setSessionContext(JSON.parse(rawCtx));
      } catch (e) {
        console.error(e);
      }
    }
  }, [state.lastUpdated]);

  const toggleExplain = () => {
    setExplainExpanded((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("thinkmate-explain-expanded", String(next));
      }
      return next;
    });
  };

  // 1. Carried over tasks logic
  const carriedOverTasks = useMemo(() => {
    const today = new Date().toDateString();
    return state.tasks.filter((t) => {
      const isPast = new Date(t.createdAt).toDateString() !== today;
      return !t.completed && isPast;
    });
  }, [state.tasks]);

  // 2. Sparkline setup (last 7 entries)
  const sparklineData = useMemo(() => {
    if (loadHistory.length === 0) return [];
    
    // Sort chronological: oldest to newest
    const sorted = [...loadHistory]
      .slice(0, 7)
      .reverse();

    const result = [];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    // Total slots to fill
    const totalSlots = 7;
    const placeholderCount = totalSlots - sorted.length;

    // Fill placeholder slots
    for (let i = 0; i < placeholderCount; i++) {
      result.push({
        dayLabel: "-",
        score: 10,
        isPlaceholder: true,
        dateStr: "No data",
      });
    }

    // Fill real entries
    sorted.forEach((item) => {
      const d = new Date(item.date);
      result.push({
        dayLabel: days[d.getDay()],
        score: item.score,
        isPlaceholder: false,
        dateStr: d.toLocaleDateString(),
      });
    });

    return result;
  }, [loadHistory]);

  // 3. Rule-based commentary line
  const commentaryText = useMemo(() => {
    if (loadHistory.length < 1) return "";
    if (loadHistory.length < 3) {
      return "Keep using ThinkMate daily to see your load trend here.";
    }
    
    const last3 = loadHistory.slice(0, 3).map(h => h.score);
    const allHigh = last3.every(s => s > 70);
    const allLow = last3.every(s => s < 40);

    if (allHigh) {
      return "Your load has been high 3 days running. Consider dropping or delegating something today.";
    }
    if (allLow) {
      return "You've had a light few days. Good time to tackle something you've been avoiding.";
    }
    return "Your load is fluctuating. Try to keep one consistent priority each morning.";
  }, [loadHistory]);

  if (!hasData) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl px-5 py-24 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl grid place-items-center bg-primary/10 text-primary mb-6">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Your dashboard is empty</h1>
          <p className="mt-3 text-muted-foreground">Do a brain dump and ThinkMate AI will fill this in with your priorities, load score, and next step.</p>
          <Link
            to="/brain-dump"
            className="mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
            style={{ background: "var(--gradient-primary)" }}
          >
            <PenLine className="w-4 h-4" /> Start Brain Dump
          </Link>
        </div>
      </AppShell>
    );
  }

  const top3 = [...state.tasks]
    .filter((t) => !t.completed)
    .sort((a, b) => {
      const order = { do_now: 0, schedule: 1, delegate: 2, ignore: 3 } as const;
      if (order[a.quadrant] !== order[b.quadrant]) return order[a.quadrant] - order[b.quadrant];
      const p = { high: 0, medium: 1, low: 2 } as const;
      return p[a.priority] - p[b.priority];
    })
    .slice(0, 3);

  const completed = state.tasks.filter((t) => t.completed).length;
  const total = state.tasks.length;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        {/* Carried Over Tasks Alert Banner */}
        {carriedOverTasks.length > 0 && (
          <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-4 flex-wrap animate-fade-in">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-primary shrink-0" />
              <p className="text-sm font-medium text-foreground">
                You have {carriedOverTasks.length} task{carriedOverTasks.length > 1 ? "s" : ""} carried over from yesterday — want to review them?
              </p>
            </div>
            <Link
              to="/matrix"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-colors"
            >
              Review in Matrix <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        <div className="flex items-end justify-between flex-wrap gap-3 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Your Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Last updated {new Date(state.lastUpdated!).toLocaleString()}
            </p>
          </div>
          <Link
            to="/brain-dump"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <PenLine className="w-4 h-4" /> New dump
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Mental Load card */}
          <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)] flex flex-col items-center">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-medium">Mental Load</p>
            <div className="my-5">
              <MentalLoadGauge score={state.mentalLoadScore} risk={state.mentalLoadRisk} />
            </div>
            <p className="text-xs text-muted-foreground text-center leading-relaxed max-w-[240px] mb-6">
              {state.mentalLoadRisk === "high"
                ? "High cognitive load. Consider postponing or delegating non-essentials."
                : state.mentalLoadRisk === "moderate"
                ? "Moderate load. Build in buffer time and protect deep work blocks."
                : "Manageable. Keep moving with intention."}
            </p>

            {/* Sparkline Bar Chart */}
            {loadHistory.length > 0 && (
              <div className="w-full border-t border-border/60 pt-6 mt-2 space-y-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">Your Load This Week</p>
                <div className="flex items-end justify-between h-20 px-2 pt-2">
                  {sparklineData.map((item, idx) => {
                    // Height calculation: min 8px, max 64px
                    const height = item.isPlaceholder ? 8 : Math.max(8, (item.score / 100) * 64);
                    // Color calculation
                    let barColor = "bg-muted-foreground/30"; // grey
                    if (!item.isPlaceholder) {
                      if (item.score < 40) barColor = "bg-[oklch(0.72_0.17_145)]"; // green
                      else if (item.score <= 70) barColor = "bg-[oklch(0.75_0.18_60)]"; // amber
                      else barColor = "bg-[oklch(0.62_0.22_25)]"; // red
                    }

                    return (
                      <div key={idx} className="flex flex-col items-center flex-1 group relative">
                        {/* Tooltip */}
                        {!item.isPlaceholder && (
                          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-foreground text-background text-[10px] font-bold rounded px-2 py-1 whitespace-nowrap shadow-md z-10">
                            Score: {item.score} ({item.dateStr})
                          </div>
                        )}
                        <div
                          className={cn("w-6 rounded-t transition-all", barColor)}
                          style={{ height: `${height}px` }}
                        />
                        <span className="text-[10px] font-mono text-muted-foreground mt-2 font-medium">
                          {item.dayLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {commentaryText && (
                  <p className="text-xs leading-relaxed text-muted-foreground italic border-l-2 border-primary/30 pl-3">
                    {commentaryText}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Next Step — hero card */}
          <div className="lg:col-span-2 rounded-2xl p-7 text-primary-foreground relative overflow-hidden shadow-[var(--shadow-glow)]" style={{ background: "var(--gradient-primary)" }}>
            <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] font-medium opacity-80">
                <Target className="w-4 h-4" /> Smart Next Step
              </div>
              <h2 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight leading-snug">
                {state.nextStep?.task}
              </h2>
              <p className="mt-4 text-primary-foreground/85 leading-relaxed max-w-xl">
                {state.nextStep?.reason}
              </p>
              <div className="mt-6 flex items-center gap-4 flex-wrap">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-medium">
                  <Clock className="w-3.5 h-3.5" /> ≈ {state.nextStep?.estimatedMinutes} min
                </div>
                <Link
                  to="/matrix"
                  className="inline-flex items-center gap-2 rounded-lg bg-background text-foreground px-4 py-2 text-sm font-semibold hover:opacity-95"
                >
                  See full matrix <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Top 3 */}
        <div className="mt-10">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-xl font-semibold tracking-tight">Today's Top 3</h2>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">{completed}/{total} done</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {top3.length === 0 ? (
              <div className="sm:col-span-3 rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground">
                Nothing left in your top 3. Beautiful.
              </div>
            ) : (
              top3.map((t, i) => {
                const q = QUADRANTS[t.quadrant];
                return (
                  <div key={t.id} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs text-primary">#{String(i + 1).padStart(2, "0")}</span>
                      <span
                        className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                        style={{ background: `var(--color-${q.tone})`, color: q.tone === "muted" ? "var(--color-foreground)" : "white" }}
                      >
                        {q.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium leading-snug">{t.title}</p>
                    {t.deadline && <p className="text-xs text-muted-foreground">Due: {t.deadline}</p>}
                    <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono tabular-nums">{t.estimatedMinutes} min</span>
                      <button
                        onClick={() => toggleTask(t.id)}
                        className={cn("inline-flex items-center gap-1.5 font-medium", t.completed ? "text-success" : "hover:text-foreground")}
                      >
                        {t.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        Done
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Collapsible Rationale Section */}
        {sessionContext && sessionContext.classificationExplanations && sessionContext.classificationExplanations.length > 0 && (
          <div className="mt-10 rounded-2xl border border-border bg-card overflow-hidden">
            <button
              onClick={toggleExplain}
              className="w-full flex items-center justify-between p-5 text-left font-semibold hover:bg-accent/40 transition-colors"
            >
              <span className="text-base tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Rationale: Why ThinkMate classified your tasks
              </span>
              {explainExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </button>

            {explainExpanded && (
              <div className="border-t border-border p-5 space-y-4 bg-muted/10 animate-slide-up">
                {sessionContext.sessionSummary && (
                  <div className="rounded-xl bg-muted/40 p-4 border border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Session Context Summary</p>
                    <p className="text-sm leading-relaxed text-foreground">{sessionContext.sessionSummary}</p>
                  </div>
                )}
                <div className="space-y-3">
                  {sessionContext.classificationExplanations.map((item, idx) => {
                    const q = QUADRANTS[item.quadrant];
                    return (
                      <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl border border-border/50 bg-background text-sm">
                        <span
                          className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                          style={{
                            background: `var(--color-${q.tone})`,
                            color: q.tone === "muted" ? "var(--color-foreground)" : "white",
                          }}
                        >
                          {q.label}
                        </span>
                        <div>
                          <p className="font-semibold text-foreground">{item.taskTitle}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.reason}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recommendation */}
        {state.recommendation && (
          <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">ThinkMate says</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{state.recommendation}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
