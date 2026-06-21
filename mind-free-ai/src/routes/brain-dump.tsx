import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { conductBrainDumpSession } from "@/lib/thinkmate.functions";
import { useThinkMate } from "@/lib/thinkmate-store";
import { Loader2, Sparkles, Wand2, ArrowRight } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";

export const Route = createFileRoute("/brain-dump")({
  head: () => ({
    meta: [
      { title: "Brain Dump — ThinkMate AI" },
      { name: "description", content: "Empty your mind. ThinkMate AI structures it into clear priorities." },
    ],
  }),
  component: () => (
    <AuthGuard>
      <BrainDumpPage />
    </AuthGuard>
  ),
});

const SAMPLES = [
  "I have a midterm on Friday I haven't started studying for, an internship application due tomorrow, and my mom wants me to visit this weekend. I also said I'd help my friend with their resume and I keep meaning to start working out. I'm overwhelmed.",
  "Need to decide between two job offers by next week. Should ship the v2 launch announcement, prep slides for Thursday board meeting, follow up with the legal team on contract review. Also Mom's birthday is Sunday and I haven't bought a gift.",
  "Client A wants their site redesign mockups by Wednesday. Client B keeps asking for revisions on logo. I want to launch my newsletter but haven't written first issue. Quarterly taxes due in 2 weeks. Should I hire a VA?",
];

type QuestionState = {
  questionNumber: number;
  question: string;
  hint: string;
  quickOptions?: string[];
};

function BrainDumpPage() {
  const navigate = useNavigate();
  const conductSession = useServerFn(conductBrainDumpSession);
  const { saveAnalysis } = useThinkMate();

  const [phase, setPhase] = useState<"input" | "wizard">("input");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wizard States
  const [history, setHistory] = useState<Array<{ question: string; answer: string }>>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionState | null>(null);
  const [qInput, setQInput] = useState("");
  const [animateCard, setAnimateCard] = useState(false);

  // Check demo mode on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDemo = window.localStorage.getItem("thinkmate-demo-mode") === "true";
      if (isDemo) {
        // Pre-fill prompt
        const demoText = "I have a project submission due this Friday, Java exam on Monday, hackathon this Sunday, need to apply for 3 internships before month end, call my team for project update, haven't started studying Unit 3, also need to pay hostel fee by tomorrow, and I got two internship offers I can't decide between — Offer A pays more but Offer B has better learning.";
        setText(demoText);
        // We will trigger auto analysis in useEffect to make it seamless
        setLoading(true);
        conductSession({
          data: {
            brainDump: demoText,
            conversationHistory: [],
            action: "finalize",
          },
        })
          .then((res) => {
            if (res.type === "result") {
              saveAnalysis(demoText, res, {
                sessionSummary: res.sessionSummary,
                classificationExplanations: res.classificationExplanations,
                conversationHistory: [],
              });
              navigate({ to: "/dashboard" });
            }
          })
          .catch((e) => {
            setError(e instanceof Error ? e.message : "Demo analysis failed.");
            setLoading(false);
          });
      }
    }
  }, []);

  async function handleStartDump() {
    if (text.trim().length < 3) return;
    setLoading(true);
    setError(null);
    try {
      const res = await conductSession({
        data: {
          brainDump: text.trim(),
          conversationHistory: [],
          action: "next_question",
        },
      });

      if (res.type === "question") {
        setCurrentQuestion({
          questionNumber: res.questionNumber,
          question: res.question,
          hint: res.hint,
          quickOptions: res.quickOptions,
        });
        setPhase("wizard");
        setAnimateCard(true);
      } else {
        // Got a result directly
        saveAnalysis(text.trim(), res, {
          sessionSummary: res.sessionSummary,
          classificationExplanations: res.classificationExplanations,
          conversationHistory: [],
        });
        navigate({ to: "/dashboard" });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze your input.");
    } finally {
      setLoading(false);
    }
  }

  async function handleNextQuestion(answerText: string) {
    if (!answerText.trim() || !currentQuestion) return;
    setLoading(true);
    setError(null);
    setAnimateCard(false);

    const updatedHistory = [...history, { question: currentQuestion.question, answer: answerText.trim() }];
    setHistory(updatedHistory);
    setQInput("");

    try {
      const res = await conductSession({
        data: {
          brainDump: text.trim(),
          conversationHistory: updatedHistory,
          action: "next_question",
        },
      });

      if (res.type === "question") {
        setCurrentQuestion({
          questionNumber: res.questionNumber,
          question: res.question,
          hint: res.hint,
          quickOptions: res.quickOptions,
        });
        setTimeout(() => setAnimateCard(true), 50);
      } else {
        saveAnalysis(text.trim(), res, {
          sessionSummary: res.sessionSummary,
          classificationExplanations: res.classificationExplanations,
          conversationHistory: updatedHistory,
        });
        navigate({ to: "/dashboard" });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load next step.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSkipToFinalize() {
    setLoading(true);
    setError(null);
    try {
      const res = await conductSession({
        data: {
          brainDump: text.trim(),
          conversationHistory: history,
          action: "finalize",
        },
      });

      if (res.type === "result") {
        saveAnalysis(text.trim(), res, {
          sessionSummary: res.sessionSummary,
          classificationExplanations: res.classificationExplanations,
          conversationHistory: history,
        });
        navigate({ to: "/dashboard" });
      } else {
        setError("AI returned a question instead of final result.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to finalize analysis.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        {phase === "input" ? (
          <div>
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="w-3.5 h-3.5" /> Step 1 of ~5
              </span>
              <h1 className="mt-5 text-4xl sm:text-5xl font-semibold tracking-tight">What's on your mind?</h1>
              <p className="mt-3 text-muted-foreground">
                Tasks, worries, deadlines, decisions — type it raw. No structure required.
              </p>
            </div>

            <div className="mt-10 rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={loading}
                placeholder="I have three deadlines this week, my apartment lease ends next month, I keep meaning to call my dad, and I'm trying to decide whether to take that promotion..."
                className="w-full min-h-[260px] p-6 bg-transparent text-base leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none resize-y font-sans"
              />
              <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 bg-muted/30">
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {text.length} / 8000
                </span>
                <button
                  onClick={handleStartDump}
                  disabled={loading || text.trim().length < 3}
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed shadow-[var(--shadow-glow)] hover:scale-[1.02] active:scale-[0.99] transition-transform"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {loading ? "Thinking..." : "Start Thinking →"}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="mt-10">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-medium mb-3">Or try a sample</p>
              <div className="grid sm:grid-cols-3 gap-3">
                {SAMPLES.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setText(s)}
                    disabled={loading}
                    className="text-left rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-accent/40 transition-colors disabled:opacity-50"
                  >
                    <span className="font-mono text-[10px] text-primary">SAMPLE 0{i + 1}</span>
                    <p className="mt-1.5 line-clamp-4 leading-relaxed">{s}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Step {history.length + 2} of ~5
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {history.length * 20}% completed
              </span>
            </div>

            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${history.length * 20}%` }}
              />
            </div>

            {loading ? (
              <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-[var(--shadow-soft)] min-h-[300px] flex flex-col justify-center items-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="mt-4 text-sm text-muted-foreground animate-pulse">
                  ThinkMate is thinking...
                </p>
              </div>
            ) : (
              currentQuestion && (
                <div
                  className={`rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)] min-h-[300px] flex flex-col justify-between transition-all duration-300 ease-out transform ${
                    animateCard ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                >
                  <div className="space-y-6">
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-primary leading-tight">
                      {currentQuestion.question}
                    </h2>
                    
                    {currentQuestion.quickOptions && currentQuestion.quickOptions.length > 0 ? (
                      <div className="flex flex-wrap gap-2.5 pt-4">
                        {currentQuestion.quickOptions.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => handleNextQuestion(opt)}
                            className="px-5 py-2.5 rounded-full border border-border bg-background text-sm font-semibold text-foreground hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.02] active:scale-[0.98] transition-all"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2.5 pt-4">
                        <input
                          type="text"
                          value={qInput}
                          onChange={(e) => setQInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleNextQuestion(qInput)}
                          placeholder="Type your response..."
                          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <p className="text-xs text-muted-foreground italic pl-1">
                          {currentQuestion.hint}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-8 border-t border-border mt-8">
                    <button
                      onClick={handleSkipToFinalize}
                      className="text-xs text-muted-foreground hover:text-foreground font-semibold underline"
                    >
                      Skip to instant analysis
                    </button>
                    {!currentQuestion.quickOptions && (
                      <button
                        onClick={() => handleNextQuestion(qInput)}
                        disabled={!qInput.trim()}
                        className="inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                        style={{ background: "var(--gradient-primary)" }}
                      >
                        Next <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            )}

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
