import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ArrowRight, Brain, Compass, Gauge, Sparkles, Target, ListChecks } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ThinkMate AI — Your Personal Thinking Partner" },
      {
        name: "description",
        content:
          "ThinkMate AI is an AI-powered second brain. Dump everything on your mind and get one focused next step, a mental load score, and a clear plan.",
      },
      { property: "og:title", content: "ThinkMate AI — Your Personal Thinking Partner" },
      {
        property: "og:description",
        content: "Brain dump → structured tasks, mental load score, and your single most important next step.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <AppShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full -z-10 opacity-30 blur-3xl"
             style={{ background: "radial-gradient(circle, var(--color-primary), transparent 60%)" }} />

        <div className="mx-auto max-w-5xl px-5 pt-20 pb-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="w-3.5 h-3.5" /> USAII Global Hackathon · Productivity
          </span>

          <h1 className="mt-7 text-5xl sm:text-6xl md:text-7xl font-semibold tracking-[-0.03em] text-foreground">
            Think less about <em className="not-italic text-primary">what to do.</em>
            <br />
            Do more of <span className="italic">what matters.</span>
          </h1>

          <p className="mt-6 mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
            ThinkMate AI is your personal thinking partner. Dump everything on your mind — tasks, worries, deadlines, decisions.
            We organise it, score your mental load, and surface the <strong className="text-foreground font-semibold">one next step</strong> worth doing.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/brain-dump"
              onClick={() => {
                localStorage.removeItem("thinkmate-demo-mode");
              }}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:scale-[1.02] active:scale-[0.99] transition-transform"
              style={{ background: "var(--gradient-primary)" }}
            >
              Start Brain Dump <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/brain-dump"
              onClick={() => {
                localStorage.setItem("thinkmate-demo-mode", "true");
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-primary text-primary px-6 py-3.5 text-sm font-semibold hover:bg-primary/5 transition-colors"
            >
              See a Live Demo
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
            >
              View Dashboard
            </Link>
          </div>

          <p className="mt-5 text-xs text-muted-foreground">No signup. Your thoughts stay on your device.</p>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] hover:border-primary/30 transition-colors">
              <div className="w-11 h-11 rounded-xl grid place-items-center bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-5 pb-28">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Five stages. One clear next step.</h2>
        </div>
        <ol className="grid sm:grid-cols-5 gap-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-xl border border-border bg-card p-5">
              <div className="font-mono text-xs text-primary">0{i + 1}</div>
              <div className="mt-2 font-semibold text-sm">{s.title}</div>
              <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{s.desc}</div>
            </li>
          ))}
        </ol>

        <div className="mt-14 rounded-2xl p-8 sm:p-10 text-center" style={{ background: "var(--gradient-primary)" }}>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary-foreground/70">Try it now</p>
          <h3 className="mt-3 text-2xl sm:text-3xl font-semibold text-primary-foreground">Your mind is full. Let's empty it.</h3>
          <Link
            to="/brain-dump"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-background text-foreground px-6 py-3 text-sm font-semibold hover:opacity-95"
          >
            Open Brain Dump <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

const features = [
  { icon: Brain, title: "Brain Dump", desc: "Type everything on your mind in any format. No templates. No friction." },
  { icon: ListChecks, title: "AI Task Extraction", desc: "Auto-classified across Eisenhower quadrants with deadlines and dependencies." },
  { icon: Target, title: "Smart Next Step", desc: "One recommended action with reasoning and time estimate. No 50-item lists." },
  { icon: Gauge, title: "Mental Load Score", desc: "Real-time 0–100 cognitive load. We flag burnout before it happens." },
  { icon: Compass, title: "Decision Framework", desc: "Weighted comparisons for the choices that actually matter." },
  { icon: Sparkles, title: "Daily Reflection", desc: "End-of-day recap that carries over what's left into tomorrow." },
];

const steps = [
  { title: "Brain Dump", desc: "Everything on your mind, raw." },
  { title: "AI Analysis", desc: "Extract, classify, score." },
  { title: "Dashboard", desc: "Top 3 + load score." },
  { title: "Smart Action", desc: "Your single next step." },
  { title: "Reflect", desc: "Recalibrate for tomorrow." },
];
