import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useThinkMate } from "@/lib/thinkmate-store";
import { breakdownGoal } from "@/lib/thinkmate.functions";
import * as db from "@/lib/db";
import { Target, Calendar, Loader2, Sparkles, ChevronDown, ChevronUp, Plus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/AuthGuard";

export const Route = createFileRoute("/goals")({
  head: () => ({
    meta: [
      { title: "Goal Breakdown — ThinkMate AI" },
      { name: "description", content: "Break down long term goals into monthly milestones and start today." },
    ],
  }),
  component: () => (
    <AuthGuard>
      <GoalsPage />
    </AuthGuard>
  ),
});

type Milestone = {
  month: string;
  title: string;
  actions: string[];
};

type GoalBreakdown = {
  goal: string;
  milestones: Milestone[];
  weekOneActions: string[];
  todayFirstStep: string;
  estimatedDuration: string;
};

function GoalsPage() {
  const navigate = useNavigate();
  const getGoalBreakdown = useServerFn(breakdownGoal);
  const { addTask } = useThinkMate();

  const [goalText, setGoalText] = useState("");
  const [timeline, setTimeline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Goals & Current Breakdown State
  const [activeGoals, setActiveGoals] = useState<any[]>([]);
  const [currentBreakdown, setCurrentBreakdown] = useState<GoalBreakdown | null>(null);
  
  // UI Expand States
  const [expandedMilestones, setExpandedMilestones] = useState<Record<number, boolean>>({});
  const [taskAdded, setTaskAdded] = useState(false);

  useEffect(() => {
    // Load existing active goals from DB
    db.getGoals().then((data) => {
      if (data) {
        setActiveGoals(data);
      }
    });
  }, []);

  async function handleBreakdown(e: React.FormEvent) {
    e.preventDefault();
    if (!goalText.trim()) return;

    setLoading(true);
    setError(null);
    setTaskAdded(false);
    try {
      const result = await getGoalBreakdown({
        data: {
          goalText: goalText.trim(),
          timeline: timeline.trim() || undefined,
        },
      });

      setCurrentBreakdown(result);

      // Save locally
      const cached = window.localStorage.getItem("thinkmate-goals");
      const goalsList = cached ? JSON.parse(cached) : [];
      goalsList.unshift({
        goal_text: goalText.trim(),
        timeline: timeline.trim(),
        result,
      });
      window.localStorage.setItem("thinkmate-goals", JSON.stringify(goalsList));

      // Save to database
      await db.saveGoal({
        goal_text: goalText.trim(),
        timeline: timeline.trim(),
        result,
      });

      // Refresh goals list
      const freshGoals = await db.getGoals();
      if (freshGoals) setActiveGoals(freshGoals);

    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to break down your goal.");
    } finally {
      setLoading(false);
    }
  }

  function toggleMilestone(index: number) {
    setExpandedMilestones((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  function handleStartGoal(firstStep: string) {
    addTask(firstStep, "high", "do_now");
    setTaskAdded(true);
    setTimeout(() => {
      navigate({ to: "/dashboard" });
    }, 800);
  }

  function handleContinueGoal(goalObj: any) {
    setCurrentBreakdown(goalObj.result);
    setTaskAdded(false);
    setExpandedMilestones({});
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <div className="flex items-center justify-between border-b border-border/60 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl grid place-items-center bg-primary/10 text-primary">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Goal Breakdown</h1>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">
                Deconstruct ambition into tiny habits
              </p>
            </div>
          </div>
        </div>

        {/* Existing Active Goals list */}
        {activeGoals.length > 0 && !currentBreakdown && (
          <div className="mb-10 animate-fade-in">
            <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">Your Active Goals</h2>
            <div className="space-y-3">
              {activeGoals.slice(0, 4).map((g) => (
                <div key={g.id} className="flex items-center justify-between gap-4 border border-border rounded-xl p-4 bg-card">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate text-foreground">{g.goal_text}</h3>
                    {g.timeline && <p className="text-xs text-muted-foreground mt-1">Timeline: {g.timeline}</p>}
                  </div>
                  <button
                    onClick={() => handleContinueGoal(g)}
                    className="inline-flex items-center gap-1 bg-primary/5 hover:bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-primary transition-all hover:scale-[1.02]"
                  >
                    Continue <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!currentBreakdown ? (
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-soft)] animate-fade-in">
            <h2 className="text-lg font-semibold tracking-tight mb-6">What do you want to achieve?</h2>
            
            <form onSubmit={handleBreakdown} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="goalText" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Describe your goal
                </label>
                <input
                  id="goalText"
                  type="text"
                  required
                  disabled={loading}
                  value={goalText}
                  onChange={(e) => setGoalText(e.target.value)}
                  placeholder="e.g. Become a cybersecurity engineer, Launch my freelance business"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="timeline" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Target Timeline (Optional)
                </label>
                <input
                  id="timeline"
                  type="text"
                  disabled={loading}
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  placeholder="e.g. 6 months, By end of this year"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !goalText.trim()}
                className="w-full flex justify-center items-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 shadow-[var(--shadow-glow)] hover:scale-[1.01] active:scale-[0.99] transition-transform"
                style={{ background: "var(--gradient-primary)" }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? "Analyzing & Breaking Down..." : "Break It Down"}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-8 animate-slide-up">
            {/* Header / Meta */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">Goal Breakdown</p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{currentBreakdown.goal}</h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary tracking-wide">
                Target: {currentBreakdown.estimatedDuration}
              </span>
            </div>

            {/* Start Today Hero Card */}
            <div className="rounded-2xl p-7 text-primary-foreground relative overflow-hidden shadow-[var(--shadow-glow)]" style={{ background: "var(--gradient-primary)" }}>
              <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <div className="text-xs uppercase tracking-[0.18em] font-medium opacity-80 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Start Today
                </div>
                <h3 className="mt-4 text-xl sm:text-2xl font-bold leading-snug">
                  {currentBreakdown.todayFirstStep}
                </h3>
                <div className="mt-6">
                  <button
                    onClick={() => handleStartGoal(currentBreakdown.todayFirstStep)}
                    disabled={taskAdded}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl bg-background text-foreground px-6 py-3.5 text-sm font-semibold hover:opacity-95 transition-all hover:scale-[1.02]",
                      taskAdded && "bg-success text-success-foreground hover:scale-100"
                    )}
                  >
                    <Plus className="w-4 h-4" />
                    {taskAdded ? "Added to Tasks!" : "Add to My Tasks"}
                  </button>
                </div>
              </div>
            </div>

            {/* Milestones Timeline */}
            <div className="space-y-5">
              <h3 className="text-lg font-semibold tracking-tight">Milestones Roadmap</h3>
              
              <div className="relative border-l-2 border-border pl-6 ml-3 space-y-8 py-2">
                {currentBreakdown.milestones.map((milestone, idx) => {
                  const expanded = !!expandedMilestones[idx];
                  return (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-primary bg-background grid place-items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </span>

                      <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="text-xs font-mono font-semibold text-primary uppercase tracking-wider">{milestone.month}</span>
                            <h4 className="text-base font-bold text-foreground mt-0.5">{milestone.title}</h4>
                          </div>
                          <button
                            onClick={() => toggleMilestone(idx)}
                            className="p-1.5 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground"
                          >
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        {expanded && (
                          <ul className="mt-4 border-t border-border/60 pt-4 space-y-2.5 animate-slide-up">
                            {milestone.actions.map((act, aIdx) => (
                              <li key={aIdx} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-2 shrink-0" />
                                <span>{act}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Week 1 Actions */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <h3 className="text-lg font-semibold tracking-tight mb-4">Focus For Week 1</h3>
              <ul className="space-y-3.5">
                {currentBreakdown.weekOneActions.map((action, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-foreground/90 leading-relaxed bg-muted/20 rounded-xl p-3.5 border border-border/50">
                    <span className="font-mono text-xs text-primary font-bold bg-primary/10 rounded px-1.5 py-0.5">0{idx + 1}</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action CTAs */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
              <button
                onClick={() => {
                  setCurrentBreakdown(null);
                  setGoalText("");
                  setTimeline("");
                }}
                className="text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                ← Create New Goal
              </button>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-muted text-foreground border border-border px-5 py-2.5 text-sm font-semibold hover:bg-accent"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
