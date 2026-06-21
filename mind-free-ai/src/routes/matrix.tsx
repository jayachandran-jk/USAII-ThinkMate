import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useThinkMate, QUADRANTS } from "@/lib/thinkmate-store";
import type { ThinkMateTask } from "@/lib/thinkmate.functions";
import { CheckCircle2, Circle, Clock, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/AuthGuard";

export const Route = createFileRoute("/matrix")({
  head: () => ({
    meta: [
      { title: "Eisenhower Matrix — ThinkMate AI" },
      { name: "description", content: "Your tasks classified by urgency and importance." },
    ],
  }),
  component: () => (
    <AuthGuard>
      <MatrixPage />
    </AuthGuard>
  ),
});

const QUADRANT_ORDER: Array<ThinkMateTask["quadrant"]> = ["do_now", "schedule", "delegate", "ignore"];

function MatrixPage() {
  const { state, toggleTask, moveTask } = useThinkMate();

  if (state.tasks.length === 0) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl px-5 py-24 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">No tasks yet</h1>
          <p className="mt-3 text-muted-foreground">Drop a brain dump first and we'll build your matrix.</p>
          <Link to="/brain-dump" className="mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <PenLine className="w-4 h-4" /> Start Brain Dump
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.18em] text-primary font-medium">Eisenhower Matrix</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">Sort by what actually matters</h1>
          <p className="mt-2 text-sm text-muted-foreground">Drag tasks across quadrants to override the AI.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {QUADRANT_ORDER.map((q) => {
            const meta = QUADRANTS[q];
            const tasks = state.tasks.filter((t) => t.quadrant === q);
            return (
              <div
                key={q}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) moveTask(id, q);
                }}
                className="rounded-2xl border border-border bg-card p-5 min-h-[260px] flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: `var(--color-${meta.tone})` }}
                      />
                      <h2 className="font-semibold tracking-tight">{meta.label}</h2>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{meta.action}</p>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">{tasks.length}</span>
                </div>

                <div className="space-y-2 flex-1">
                  {tasks.length === 0 ? (
                    <div className="h-full min-h-[120px] grid place-items-center text-xs text-muted-foreground/60 border border-dashed border-border rounded-lg">
                      Drop tasks here
                    </div>
                  ) : (
                    tasks.map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                        className={cn(
                          "group rounded-lg border border-border bg-background p-3.5 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors",
                          t.completed && "opacity-60",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <button onClick={() => toggleTask(t.id)} className={t.completed ? "text-success mt-0.5" : "text-muted-foreground hover:text-foreground mt-0.5"}>
                            {t.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-medium leading-snug", t.completed && "line-through")}>{t.title}</p>
                            <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                                <Clock className="w-3 h-3" /> {t.estimatedMinutes}m
                              </span>
                              {t.deadline && <span>· {t.deadline}</span>}
                              <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] uppercase tracking-wider">{t.priority}</span>
                            </div>
                            {t.rationale && (
                              <p className="mt-2 text-xs text-muted-foreground italic leading-relaxed">{t.rationale}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
