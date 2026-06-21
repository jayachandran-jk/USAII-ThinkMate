import { useEffect, useState } from "react";
import type { ThinkMateAnalysis, ThinkMateTask } from "./thinkmate.functions";
import * as db from "./db";

const KEY = "thinkmate:state:v1";

export type StoredTask = ThinkMateTask & { id: string; completed: boolean; createdAt: number; carried_over_from?: string; session_id?: string | null };

export interface ThinkMateState {
  tasks: StoredTask[];
  mentalLoadScore: number;
  mentalLoadRisk: "low" | "moderate" | "high";
  nextStep: ThinkMateAnalysis["nextStep"] | null;
  recommendation: string;
  lastBrainDump: string;
  lastUpdated: number | null;
}

const empty: ThinkMateState = {
  tasks: [],
  mentalLoadScore: 0,
  mentalLoadRisk: "low",
  nextStep: null,
  recommendation: "",
  lastBrainDump: "",
  lastUpdated: null,
};

function read(): ThinkMateState {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty;
    return { ...empty, ...JSON.parse(raw) };
  } catch {
    return empty;
  }
}

function write(state: ThinkMateState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
  window.localStorage.setItem("thinkmate-tasks", JSON.stringify(state.tasks));
  
  const analysis: ThinkMateAnalysis = {
    tasks: state.tasks,
    mentalLoadScore: state.mentalLoadScore,
    mentalLoadRisk: state.mentalLoadRisk,
    nextStep: state.nextStep || { task: "", reason: "", estimatedMinutes: 0 },
    recommendation: state.recommendation,
  };
  window.localStorage.setItem("thinkmate-analysis", JSON.stringify(analysis));
  
  window.dispatchEvent(new CustomEvent("thinkmate:update"));
}

export function useThinkMate() {
  const [state, setState] = useState<ThinkMateState>(empty);

  useEffect(() => {
    setState(read());
    const handler = () => setState(read());
    window.addEventListener("thinkmate:update", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("thinkmate:update", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return {
    state,
    saveAnalysis(brainDump: string, analysis: ThinkMateAnalysis, extras?: { sessionSummary?: string; classificationExplanations?: any[]; conversationHistory?: any[] }) {
      const tasks: StoredTask[] = analysis.tasks.map((t, i) => {
        // Ensure id is a UUID if not already formatted (for Supabase mapping)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((t as any).id || "");
        const uuid = isUUID ? (t as any).id : (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${i}`);
        return {
          ...t,
          id: uuid,
          completed: false,
          createdAt: Date.now(),
        };
      });

      const newState = {
        tasks,
        mentalLoadScore: analysis.mentalLoadScore,
        mentalLoadRisk: analysis.mentalLoadRisk,
        nextStep: analysis.nextStep,
        recommendation: analysis.recommendation,
        lastBrainDump: brainDump,
        lastUpdated: Date.now(),
      };
      
      write(newState);

      // Fire-and-forget write to DB
      const sessionData = {
        brain_dump_text: brainDump,
        conversation_history: extras?.conversationHistory || [],
        analysis,
        session_summary: extras?.sessionSummary || "",
        classification_explanations: extras?.classificationExplanations || [],
      };

      db.saveSession(sessionData).then((sessionId) => {
        if (sessionId) {
          const tasksWithSession = tasks.map(t => ({ ...t, sessionId }));
          db.saveTasks(tasksWithSession);
        } else {
          db.saveTasks(tasks);
        }
      });

      db.appendLoadHistory({
        score: analysis.mentalLoadScore,
        risk_level: analysis.mentalLoadRisk,
      });

      // Maintain local history cache (keep last 7)
      if (typeof window !== "undefined") {
        try {
          const rawHist = window.localStorage.getItem("thinkmate-load-history");
          const hist = rawHist ? JSON.parse(rawHist) : [];
          hist.unshift({
            date: new Date().toISOString(),
            score: analysis.mentalLoadScore,
            risk_level: analysis.mentalLoadRisk,
          });
          window.localStorage.setItem("thinkmate-load-history", JSON.stringify(hist.slice(0, 7)));
        } catch (e) {
          console.error(e);
        }
      }
    },
    
    toggleTask(id: string) {
      const s = read();
      let updatedTask: StoredTask | undefined;
      const nextTasks = s.tasks.map((t) => {
        if (t.id === id) {
          updatedTask = { ...t, completed: !t.completed };
          return updatedTask;
        }
        return t;
      });

      write({ ...s, tasks: nextTasks });

      if (updatedTask) {
        db.updateTask(id, { completed: updatedTask.completed });
      }
    },

    moveTask(id: string, quadrant: ThinkMateTask["quadrant"]) {
      const s = read();
      const nextTasks = s.tasks.map((t) => (t.id === id ? { ...t, quadrant } : t));
      write({ ...s, tasks: nextTasks });
      db.updateTask(id, { quadrant });
    },

    addTask(title: string, priority: "high" | "medium" | "low" = "medium", quadrant: ThinkMateTask["quadrant"] = "do_now", carriedOverFrom?: string) {
      const s = read();
      const uuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newTask: StoredTask = {
        id: uuid,
        title,
        priority,
        quadrant,
        completed: false,
        createdAt: Date.now(),
        estimatedMinutes: 15,
        dependencies: [],
        rationale: "Added manually",
        carried_over_from: carriedOverFrom,
      };

      const nextTasks = [newTask, ...s.tasks];
      write({ ...s, tasks: nextTasks });
      db.saveTasks([newTask]);
    },

    clearAll() {
      write(empty);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("thinkmate-analysis");
        window.localStorage.removeItem("thinkmate-tasks");
        window.localStorage.removeItem("thinkmate-decision");
        window.localStorage.removeItem("thinkmate-reflections");
        window.localStorage.removeItem("thinkmate-goals");
        window.localStorage.removeItem("thinkmate-load-history");
        window.localStorage.removeItem("thinkmate-session-context");
      }
    },
  };
}

export async function initializeFromDB() {
  if (typeof window === "undefined") return;
  const isDemoMode = window.localStorage.getItem("thinkmate-demo-mode") === "true";
  if (isDemoMode) return;

  try {
    const [latestSession, tasks, loadHistory] = await Promise.all([
      db.getLatestSession(),
      db.getUserTasks(),
      db.getLoadHistory(30)
    ]);

    // Hydrate tasks
    const mappedTasks: StoredTask[] = tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      quadrant: t.quadrant,
      completed: t.completed,
      createdAt: new Date(t.created_at).getTime(),
      estimatedMinutes: t.estimated_minutes || 15,
      dependencies: t.dependencies || [],
      rationale: t.rationale || "",
      carried_over_from: t.carried_over_from || undefined,
      session_id: t.session_id,
    }));
    window.localStorage.setItem("thinkmate-tasks", JSON.stringify(mappedTasks));

    // Hydrate latest session analysis
    let score = 0;
    let risk: "low" | "moderate" | "high" = "low";
    let nextStep = null;
    let recommendation = "";
    let lastBrainDump = "";

    if (latestSession) {
      const analysis = latestSession.analysis;
      score = analysis?.mentalLoadScore ?? 0;
      risk = analysis?.mentalLoadRisk ?? "low";
      nextStep = analysis?.nextStep ?? null;
      recommendation = latestSession.analysis?.recommendation || "";
      lastBrainDump = latestSession.brain_dump_text || "";
      
      window.localStorage.setItem("thinkmate-analysis", JSON.stringify(analysis));
      window.localStorage.setItem("thinkmate-session-context", JSON.stringify({
        sessionSummary: latestSession.session_summary || "",
        classificationExplanations: latestSession.classification_explanations || [],
        conversationHistory: latestSession.conversation_history || []
      }));
    }

    // Hydrate main state v1
    const consolidatedState: ThinkMateState = {
      tasks: mappedTasks,
      mentalLoadScore: score,
      mentalLoadRisk: risk,
      nextStep,
      recommendation,
      lastBrainDump,
      lastUpdated: latestSession ? new Date(latestSession.created_at).getTime() : Date.now(),
    };
    window.localStorage.setItem(KEY, JSON.stringify(consolidatedState));

    // Hydrate load history cache (only 7 entries locally)
    const localHist = loadHistory.slice(0, 7).map((h: any) => ({
      date: h.recorded_at,
      score: h.score,
      risk_level: h.risk_level,
    }));
    window.localStorage.setItem("thinkmate-load-history", JSON.stringify(localHist));

    window.dispatchEvent(new CustomEvent("thinkmate:update"));
  } catch (err) {
    console.error("Failed to initialize state from database:", err);
  }
}

export const QUADRANTS: Record<ThinkMateTask["quadrant"], { label: string; action: string; tone: string }> = {
  do_now: { label: "Do Now", action: "Urgent + Important", tone: "risk" },
  schedule: { label: "Schedule", action: "Important, not urgent", tone: "primary" },
  delegate: { label: "Delegate", action: "Urgent, not important", tone: "warning" },
  ignore: { label: "Ignore", action: "Neither urgent nor important", tone: "muted" },
};
