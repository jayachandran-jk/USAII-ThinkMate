import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useThinkMate } from "@/lib/thinkmate-store";
import { generateReflection } from "@/lib/thinkmate.functions";
import * as db from "@/lib/db";
import { Moon, CheckCircle2, Circle, Loader2, Sparkles, Calendar, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/AuthGuard";

export const Route = createFileRoute("/reflect")({
  head: () => ({
    meta: [
      { title: "Evening Reflection — ThinkMate AI" },
      { name: "description", content: "Reflect on your achievements and plan tomorrow." },
    ],
  }),
  component: () => (
    <AuthGuard>
      <ReflectPage />
    </AuthGuard>
  ),
});

type RecapState = {
  summary: string;
  carriedOver: string[];
  tomorrowFocus: string;
  encouragement: string;
};

function ReflectPage() {
  const { state, toggleTask, addTask } = useThinkMate();
  const getRecap = useServerFn(generateReflection);

  const [journal, setJournal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recap, setRecap] = useState<RecapState | null>(null);
  const [pushedTasks, setPushedTasks] = useState<Record<string, boolean>>({});

  // Format today's date
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Pull existing reflection on mount if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = window.localStorage.getItem("thinkmate-reflections");
        if (cached) {
          const list = JSON.parse(cached);
          if (list && list.length > 0) {
            // Can display latest if we want, but usually reflection is created per session.
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  if (state.tasks.length === 0) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl px-5 py-24 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl grid place-items-center bg-primary/10 text-primary mb-6">
            <Moon className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Nothing to reflect on yet</h1>
          <p className="mt-3 text-muted-foreground">Start with a brain dump to populate tasks, then return in the evening.</p>
          <Link
            to="/brain-dump"
            className="mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
            style={{ background: "var(--gradient-primary)" }}
          >
            Start Brain Dump
          </Link>
        </div>
      </AppShell>
    );
  }

  async function handleGenerateRecap() {
    setLoading(true);
    setError(null);
    try {
      const completedTasks = state.tasks.filter((t) => t.completed).map((t) => t.title);
      const incompleteTasks = state.tasks.filter((t) => !t.completed).map((t) => t.title);

      const res = await getRecap({
        data: {
          completedTasks,
          incompleteTasks,
          freeText: journal.trim() || undefined,
        },
      });

      setRecap(res);

      // Save locally (append to array)
      const cached = window.localStorage.getItem("thinkmate-reflections");
      const reflectionsList = cached ? JSON.parse(cached) : [];
      reflectionsList.unshift(res);
      window.localStorage.setItem("thinkmate-reflections", JSON.stringify(reflectionsList));

      // Save to Database
      db.saveReflection({
        completed_tasks: completedTasks,
        incomplete_tasks: incompleteTasks,
        free_text: journal.trim(),
        summary: res.summary,
        carried_over: res.carriedOver,
        tomorrow_focus: res.tomorrowFocus,
        encouragement: res.encouragement,
      });

    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate reflection recap.");
    } finally {
      setLoading(false);
    }
  }

  function handlePushToTomorrow(taskTitle: string) {
    addTask(taskTitle, "high", "do_now", new Date().toISOString().slice(0, 10));
    setPushedTasks((prev) => ({ ...prev, [taskTitle]: true }));
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <div className="flex items-center justify-between border-b border-border/60 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl grid place-items-center bg-primary/10 text-primary">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Evening Reflection</h1>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 font-medium uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" /> {dateStr}
              </p>
            </div>
          </div>
        </div>

        {!recap ? (
          <div className="space-y-8 animate-fade-in">
            {/* Checklist */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <h2 className="text-lg font-semibold tracking-tight mb-4">What did you complete today?</h2>
              <div className="space-y-2.5">
                {state.tasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => toggleTask(t.id)}
                    className={cn(
                      "w-full flex items-start gap-3 rounded-xl border border-border bg-background p-4 text-left hover:border-primary/40 transition-colors",
                      t.completed && "bg-success/5 border-success/30 opacity-80"
                    )}
                  >
                    <span className={t.completed ? "text-success mt-0.5" : "text-muted-foreground mt-0.5"}>
                      {t.completed ? <CheckCircle2 className="w-4.5 h-4.5" /> : <Circle className="w-4.5 h-4.5" />}
                    </span>
                    <span className={cn("text-sm font-medium leading-snug", t.completed && "line-through text-muted-foreground")}>
                      {t.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Journal Input */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <h2 className="text-lg font-semibold tracking-tight mb-1">Anything else on your mind?</h2>
              <p className="text-xs text-muted-foreground mb-4">A stray thought, a win you want to record, or something that's still bothering you…</p>
              <textarea
                value={journal}
                onChange={(e) => setJournal(e.target.value)}
                placeholder="Today was highly productive, though I spent too much time on logo design revisions. Feeling glad to clear my coding targets..."
                className="w-full min-h-[140px] rounded-xl border border-border bg-background p-4 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerateRecap}
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 shadow-[var(--shadow-glow)] hover:scale-[1.01] active:scale-[0.99] transition-transform"
              style={{ background: "var(--gradient-primary)" }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? "Generating Recap..." : "Generate My Recap"}
            </button>
          </div>
        ) : (
          <div className="space-y-8 animate-slide-up">
            {/* Recap Summary */}
            <div className="rounded-2xl border-l-4 border-l-primary border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <h2 className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">Accomplishment Recap</h2>
              <p className="mt-3 text-base leading-relaxed text-foreground">
                {recap.summary}
              </p>
            </div>

            {/* Carried Over Incomplete Tasks */}
            {recap.carriedOver.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                <h2 className="text-lg font-semibold tracking-tight mb-4">Carried Over to Tomorrow</h2>
                <div className="space-y-3">
                  {recap.carriedOver.map((task) => (
                    <div key={task} className="flex items-center justify-between gap-4 border border-border rounded-xl p-3.5 bg-background">
                      <span className="text-sm font-medium text-muted-foreground">{task}</span>
                      <button
                        onClick={() => handlePushToTomorrow(task)}
                        disabled={pushedTasks[task]}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:scale-[1.02]",
                          pushedTasks[task]
                            ? "bg-success/10 border-success/30 text-success cursor-default"
                            : "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
                        )}
                      >
                        {pushedTasks[task] ? <Check className="w-3.5 h-3.5" /> : null}
                        {pushedTasks[task] ? "Pushed!" : "Push to Tomorrow"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tomorrow's Focus */}
            {recap.tomorrowFocus && (
              <div className="rounded-2xl p-7 text-primary-foreground shadow-[var(--shadow-glow)] relative overflow-hidden" style={{ background: "var(--gradient-primary)" }}>
                <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
                <div className="relative">
                  <div className="text-xs uppercase tracking-[0.18em] font-medium opacity-80 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Tomorrow's Primary Focus
                  </div>
                  <h3 className="mt-4 text-2xl font-bold tracking-tight">
                    {recap.tomorrowFocus}
                  </h3>
                </div>
              </div>
            )}

            {/* Encouragement */}
            {recap.encouragement && (
              <div className="text-center py-6">
                <p className="text-base text-primary italic font-medium max-w-lg mx-auto leading-relaxed">
                  "{recap.encouragement}"
                </p>
              </div>
            )}

            <div className="flex justify-center pt-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold hover:bg-accent transition-colors"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
