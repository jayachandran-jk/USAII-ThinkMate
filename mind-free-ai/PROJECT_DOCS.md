# ThinkMate AI — Complete Project Documentation

> **Built for the USAII Global Hackathon · Productivity Track**
> *"Think less about what to do. Do more of what matters."*

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Overview](#2-project-overview)
3. [Tech Stack & Architecture](#3-tech-stack--architecture)
4. [System Architecture Diagram](#4-system-architecture-diagram)
5. [Core Features & Modules](#5-core-features--modules)
6. [Complete Workflow — End to End](#6-complete-workflow--end-to-end)
7. [How the AI Decides — Deep Dive](#7-how-the-ai-decides--deep-dive)
8. [How It Works — Component by Component](#8-how-it-works--component-by-component)
9. [Data Flow & State Management](#9-data-flow--state-management)
10. [Authentication & Security](#10-authentication--security)
11. [AI Provider Architecture](#11-ai-provider-architecture)
12. [Database Layer](#12-database-layer)
13. [File Structure Reference](#13-file-structure-reference)
14. [Running the Project](#14-running-the-project)

---

## 1. Executive Summary

**ThinkMate AI** (codebase: `mind-free-ai`) is an AI-powered personal productivity assistant designed to reduce cognitive overload. Users dump everything on their mind — tasks, worries, deadlines, decisions — in free-form text, and the AI:

- **Extracts** structured tasks from the brain dump
- **Classifies** each task across the Eisenhower Priority Matrix (urgent × important)
- **Scores** the user's mental load on a 0–100 scale
- **Surfaces** exactly ONE recommended next step with a time estimate
- **Helps make decisions** using weighted factor comparison
- **Breaks down long-term goals** into monthly milestones
- **Reflects** each evening to carry forward unfinished work

The app was designed for the USAII Hackathon and prioritises simplicity, calm UI, and human agency — AI provides recommendations, but the user always makes the final call.

---

## 2. Project Overview

| Property         | Value                                              |
|------------------|----------------------------------------------------|
| **App Name**     | ThinkMate AI (branded as mind-free-ai internally)  |
| **Domain**       | Personal Productivity / AI Second Brain            |
| **Type**         | Full-stack SSR Web App (TanStack Start)            |
| **Port**         | `localhost:8080` (dev)                             |
| **Entry**        | `src/start.ts` → `src/router.tsx`                  |
| **AI Models**    | Gemini 2.5 Flash (primary), Llama 3.3 70B (Groq fallback) |
| **Storage**      | localStorage (client) + PostgreSQL (server, via db.server.ts) |

---

## 3. Tech Stack & Architecture

### Frontend
| Layer              | Technology                              |
|--------------------|-----------------------------------------|
| Framework          | React 19                                |
| Router             | TanStack Router v1 (file-based routes)  |
| SSR / Server Fns   | TanStack Start + Nitro                  |
| Styling            | Tailwind CSS v4 + tw-animate-css        |
| UI Components      | Radix UI (shadcn/ui patterns)           |
| Icons              | Lucide React                            |
| Form Handling      | React Hook Form + Zod                   |
| State Management   | Custom `useThinkMate` hook (localStorage-backed) |
| Build Tool         | Vite 7                                  |

### Backend (Server Functions)
| Layer              | Technology                              |
|--------------------|-----------------------------------------|
| Server Runtime     | Nitro (via TanStack Start)              |
| Server Functions   | `createServerFn` — type-safe RPC        |
| Database Client    | pg (node-postgres)                      |
| Validation         | Zod schemas (shared client/server)      |
| AI Gateway         | Multi-provider: OpenRouter / Groq / Direct Gemini / Lovable Gateway |

### AI & LLM
| Provider           | Model                    | Key Prefix   |
|--------------------|--------------------------|--------------|
| OpenRouter         | `google/gemini-2.5-flash`| `sk-or-`     |
| Groq               | `llama-3.3-70b-versatile`| `gsk_`       |
| Direct Gemini      | `gemini-2.5-flash`       | `AIzaSy`     |
| Lovable Gateway    | `google/gemini-2.5-flash`| `AQ.`        |

---

## 4. System Architecture Diagram

```
┌────────────────────────────────────────────────────────────┐
│                        USER BROWSER                        │
│                                                            │
│  Landing  ──►  Brain Dump  ──►  Dashboard  ──►  Matrix    │
│                    │               │                       │
│                  Goals          Reflect    Decide          │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           useThinkMate Hook (State Layer)           │  │
│  │    localStorage ◄──► React State ◄──► CustomEvent  │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────────┬───────────────────────────────┘
                             │ HTTP (TanStack Server Functions)
                             ▼
┌────────────────────────────────────────────────────────────┐
│                   NITRO SERVER (SSR Layer)                  │
│                                                            │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │  thinkmate.fns   │    │       db.server.ts            │  │
│  │  (AI functions)  │    │  (PostgreSQL operations)     │  │
│  └────────┬─────────┘    └──────────────┬───────────────┘  │
│           │                             │                  │
│    ┌──────▼──────┐            ┌─────────▼──────────┐      │
│    │  callGateway│            │   PostgreSQL DB     │      │
│    │  (Multi AI) │            │  (Sessions, Tasks,  │      │
│    └──────┬──────┘            │   Users, Reflections│      │
│           │                  └────────────────────┘       │
└───────────┼────────────────────────────────────────────────┘
            │ HTTPS API calls
            ▼
┌──────────────────────────────────────┐
│          AI PROVIDER GATEWAY         │
│                                      │
│  1. OpenRouter  → Gemini 2.5 Flash   │
│  2. Groq        → Llama 3.3 70B      │
│  3. Direct Gemini API                │
│  4. Lovable Gateway → Gemini Flash   │
└──────────────────────────────────────┘
```

---

## 5. Core Features & Modules

### 5.1 Brain Dump (`/brain-dump`)
The entry point of the user journey. Accepts free-form text input (up to 8,000 characters). Supports:
- **Sample prompts** — 3 pre-written scenarios to get started
- **Demo mode** — auto-fills and auto-submits a realistic demo dump (triggered from landing page)
- **Akinator Wizard** — interactive Q&A session (up to 5 questions) to clarify ambiguous items before analysis

### 5.2 Dashboard (`/dashboard`)
The central command center showing:
- **Mental Load Score** — circular gauge (0–100) with risk indicator (low / moderate / high)
- **Smart Next Step** — highlighted hero card with the single most important task + rationale + estimated time
- **Top 3 Priority Tasks** — sorted by Eisenhower quadrant then priority level
- **7-Day Sparkline** — bar chart of daily mental load history with commentary
- **AI Rationale Panel** — collapsible section explaining why each task was classified the way it was
- **Carried-Over Alert** — banner when incomplete tasks are detected from previous days

### 5.3 Eisenhower Matrix (`/matrix`)
Visual 2×2 grid displaying all extracted tasks by quadrant:
- **Do Now** — Urgent + Important (red tone)
- **Schedule** — Important, Not Urgent (primary tone)
- **Delegate** — Urgent, Not Important (warning tone)
- **Ignore** — Neither Urgent nor Important (muted tone)

Features drag-and-drop to override AI classifications. Users can manually reassign tasks between quadrants.

### 5.4 Decision Framework (`/decide`)
For binary or multi-option choices. User provides:
- Decision description
- 2–6 options
- Optional personal values/priorities

AI returns a weighted factor comparison table with scores per option, a totaled score, and a reasoned recommendation (while reminding the user the final call is theirs).

### 5.5 Goal Breakdown (`/goals`)
Converts a high-level ambition into a concrete action plan:
- **Goal restatement** in clear language
- **3–6 milestones** each with month label, title, and 3 concrete sub-actions
- **Week 1 Actions** — exactly 3 specific tasks for the first week
- **Today's First Step** — one tiny, immediately actionable step
- **Estimated Duration** — realistic overall timeline
- One-click "Add to Tasks" button pushes first step to the Dashboard

### 5.6 Evening Reflection (`/reflect`)
End-of-day ritual:
- Checklist of all current tasks to mark complete/incomplete
- Free-text journal entry
- AI generates:
  - 2-sentence accomplishment summary
  - Tailored encouragement (not generic)
  - Tomorrow's primary focus task
  - List of carried-over incomplete tasks
- "Push to Tomorrow" button adds carried items back to the task queue

---

## 6. Complete Workflow — End to End

```
User arrives at Landing (/)
        │
        ▼
┌─────────────────┐
│  Brain Dump     │  ← User types everything on their mind
│  (/brain-dump)  │
└────────┬────────┘
         │  POST → conductBrainDumpSession (action: "next_question")
         ▼
┌────────────────────┐
│  Akinator Wizard   │  ← AI asks up to 5 clarifying questions
│  (up to 5 rounds)  │     (deadline pressure, delegation, energy, etc.)
└────────┬───────────┘
         │  POST → conductBrainDumpSession (action: "finalize")
         ▼
┌─────────────────────────────────────┐
│  AI Analysis (Gemini 2.5 Flash)     │
│                                     │
│  • Extract all tasks from dump      │
│  • Classify: quadrant + priority    │
│  • Calculate mental load score      │
│  • Select ONE next step             │
│  • Write session summary            │
│  • Write classification rationale  │
└─────────────────────────────────────┘
         │  Result saved to localStorage + PostgreSQL
         ▼
┌──────────────────────┐
│  Dashboard           │  ← Mental load, Top 3, Next Step
│  (/dashboard)        │
└──────────┬───────────┘
           │
    ┌──────┴───────────────────────────────┐
    │              │                       │
    ▼              ▼                       ▼
Matrix        Decide Tool            Goal Breakdown
(/matrix)     (/decide)              (/goals)
 Drag tasks    Compare options        Milestone roadmap
 Reassign       Weighted matrix        Week 1 actions
 quadrants      AI recommendation      Add first step
    │
    └──────────────────────┐
                           ▼
                  Evening Reflect (/reflect)
                  Check off tasks done
                  Journal entry
                  AI generates recap
                  Carry forward tomorrow
```

---

## 7. How the AI Decides — Deep Dive

### 7.1 The Core System Prompt

Every AI call is grounded by this persona and ruleset sent as the `system` message:

```
You are ThinkMate AI — a calm, focused personal thinking partner.
Your job is not to impress users with everything you can do.
Your job is to help them think clearly and take their most important next step.

CORE BEHAVIOURS:
1. Extract tasks from the user's brain dump, identify deadlines,
   spot dependencies, classify each by urgency and importance (Eisenhower).
2. Always return STRICT JSON matching the schema. No prose outside JSON.
3. Recommend exactly ONE next step. Justify in one sentence.
4. Calculate Mental Load Score (0-100):
   - Tasks count: 30%
   - Urgent tasks: 40%
   - High-stakes decisions: 20%
   - Interdependencies: 10%
5. Never list more than 3 priority tasks. Focus beats comprehensiveness.
6. Tone: calm, grounding, never catastrophising.
7. If mental load > 75, suggest 1-2 tasks to postpone/delegate
   proactively in the recommendation field.
8. Preserve human agency — surface options, not mandates.
```

### 7.2 Mental Load Score Formula

The AI uses this weighted formula to produce a score from 0–100:

| Factor                       | Weight |
|------------------------------|--------|
| Number of tasks              | 30%    |
| Number of urgent tasks       | 40%    |
| High-stakes decisions present| 20%    |
| Task interdependencies       | 10%    |

**Risk Thresholds:**
- `0–39` → **Low** — Manageable. Keep moving with intention.
- `40–70` → **Moderate** — Build in buffer time. Protect deep work.
- `71–100` → **High** — Consider postponing or delegating non-essentials.

### 7.3 Eisenhower Matrix Classification Logic

The AI classifies each task into one of four quadrants based on two axes:

```
         HIGH IMPORTANCE
              │
    DO_NOW    │    SCHEDULE
  (Urgent +   │  (Important,
  Important)  │   not urgent)
──────────────┼──────────────► HIGH URGENCY
   DELEGATE   │    IGNORE
  (Urgent,    │  (Neither)
  not imp.)   │
              │
          LOW IMPORTANCE
```

For each task, the AI evaluates:
1. **Urgency** — Does it have a hard deadline? Is someone waiting? Will there be consequences today?
2. **Importance** — Does it advance core goals? Does it have lasting impact? Is it irreversible if missed?
3. **Dependencies** — Does another task block on this? Is this a prerequisite?

Then it writes a `classificationExplanation` (1–2 sentences) for each task explaining the *why* behind its placement.

### 7.4 The "Smart Next Step" Decision

From the full task list, the AI selects exactly ONE task as the recommended next step using this logic:
1. First, filter to `do_now` quadrant tasks
2. Among those, prefer `high` priority
3. Among equals, prefer the task with the lowest `estimatedMinutes` (momentum principle)
4. If no `do_now` tasks exist, select from `schedule` quadrant

The recommendation includes:
- `task` — the action title
- `reason` — one sentence justifying why this task, right now
- `estimatedMinutes` — realistic time estimate

### 7.5 The Akinator Wizard — Clarifying Questions

When the user submits a brain dump, the AI doesn't immediately finalize. Instead, it:

1. **Reads** the raw dump and prior Q&A history
2. **Identifies the single highest uncertainty dimension:**
   - Deadline pressure (hidden urgency?)
   - Personal vs. professional split (energy allocation?)
   - Delegation availability (can this be offloaded?)
   - Energy level (how much capacity today?)
   - Decision complexity (is this really a decision or a task?)
3. **Asks ONE targeted question** (never multiple at once)
4. Optionally provides **2–4 quickOptions** (pill buttons) for fast answers
5. After ≥2 answered questions OR reaching 5 questions → finalizes analysis

The user can always click **"Skip to instant analysis"** to bypass the wizard.

### 7.6 Decision Framework — Weighted Comparison

For the `/decide` tool, the AI:
1. Reads the decision description, all options, and user values
2. **Auto-derives 4–6 relevant factors** (e.g., financial stability, growth, work-life balance)
3. Assigns a **weight (1–10)** to each factor based on stated user values
4. **Scores each option per factor (1–10)** with a one-line reason
5. Calculates `totalScore = Σ(score × weight)` for each option
6. Recommends the highest-scoring option but always ends with: *"Final decision is yours."*

### 7.7 Goal Breakdown — Long-Horizon Planning

The `breakdownGoal` server function instructs the AI to:
1. Restate the goal in actionable language
2. Design **3–6 logical milestones** (monthly cadence)
   - Each milestone has a month label, title, and 3 concrete sub-actions
3. Extract **exactly 3 Week 1 actions** (near-term momentum)
4. Identify the **smallest possible first step TODAY** (reduces activation energy)
5. Estimate a **realistic total duration** (e.g., "6–9 months")

### 7.8 Evening Reflection — AI Recap Generation

The `generateReflection` function:
1. Receives completed task list, incomplete task list, and optional journal text
2. Generates a **2-sentence accomplishment summary** (specific, not generic)
3. Writes **tailored encouragement** based on what was actually done (not boilerplate)
4. Selects the **primary focus for tomorrow** from incomplete tasks
5. Lists **carried-over tasks** — items that should roll into tomorrow's queue

---

## 8. How It Works — Component by Component

### 8.1 `src/lib/thinkmate.functions.ts` — The AI Engine
- **`conductBrainDumpSession`** — Akinator-style interactive session. Decides whether to ask another question or finalize analysis. The core brain of the app.
- **`analyzeBrainDump`** — (legacy) Direct single-shot analysis, bypassing the wizard.
- **`analyzeDecision`** — Weighted decision matrix generator.
- **`generateReflection`** — Evening recap generator.
- **`breakdownGoal`** — Long-term goal decomposition.
- **`callGateway`** — Multi-provider AI dispatcher with cascading fallback logic (OpenRouter → Groq → Gemini → Lovable).

### 8.2 `src/lib/thinkmate-store.ts` — The State Layer
A custom React hook that provides:
- **`useThinkMate()`** — Returns `state` + mutating functions
- **`saveAnalysis()`** — Saves AI results to localStorage + database
- **`toggleTask()`** — Marks a task complete/incomplete (synced to DB)
- **`moveTask()`** — Reassigns a task to a different quadrant
- **`addTask()`** — Manually adds a task (used in Goals and Reflect)
- **`clearAll()`** — Wipes all stored data
- **`initializeFromDB()`** — On auth, hydrates localStorage from server DB

State is persisted under `thinkmate:state:v1` in localStorage and rehydrated via `storage` events and a custom `thinkmate:update` CustomEvent for cross-tab sync.

### 8.3 `src/lib/auth.ts` — Authentication
- Session-token-based auth (no Supabase; custom local DB)
- `useAuth()` hook exposes: `user`, `loading`, `signIn`, `signUp`, `signOut`, `isAuthenticated`
- Token stored in `localStorage["thinkmate-session-token"]`
- `AuthGuard` component wraps all protected routes — redirects to `/login` if not authenticated

### 8.4 `src/lib/db.ts` — Database Client Bridge
All DB operations are wrapped in `createServerFn` to ensure database credentials never leak to the client. Each function:
1. Checks if user is in **demo mode** (skips all DB writes in demo)
2. Reads session token from localStorage
3. Calls the corresponding server function in `db.server.ts`

### 8.5 `src/lib/db.server.ts` — Server Database Operations
Runs only on the Nitro server. Uses `pg` (node-postgres) to interact with PostgreSQL. Operations include:
- `saveSessionServer` — Saves brain dump + analysis + conversation history
- `saveTasksServer` — Bulk upserts tasks with session linkage
- `updateTaskServer` — Patches task fields (completed, quadrant)
- `getUserTasksServer` — Fetches tasks for authenticated user
- `appendLoadHistoryServer` — Adds daily mental load entry
- `getLoadHistoryServer` — Returns last N entries
- `saveReflectionServer` / `getReflectionsServer`
- `saveGoalServer` / `getGoalsServer`
- `saveDecisionServer` / `getDecisionsServer`
- `signUpUserServer` / `signInUserServer` / `signOutUserServer` — User management with bcrypt password hashing

### 8.6 `src/components/AppShell.tsx` — Layout Component
The main navigation shell that wraps every page. Contains:
- Top navigation bar with links to all sections
- User avatar / auth state display
- Mobile-responsive hamburger menu
- Theme-consistent background and typography

### 8.7 `src/components/MentalLoadGauge.tsx`
SVG-based circular gauge component. Takes `score` (0–100) and `risk` level as props. Renders:
- Stroke-based arc representing the score
- Color coded: green (low), amber (moderate), red (high)
- Animated on mount

---

## 9. Data Flow & State Management

### Session Lifecycle

```
1. User types brain dump
        │
2. POST: conductBrainDumpSession (next_question)
        │ AI returns Question #1
3. User answers → POST: conductBrainDumpSession (next_question)
        │ AI returns Question #2 (or result if confident)
4. After ≥2 answers → POST: conductBrainDumpSession (finalize)
        │ AI returns AkinatorResult
5. saveAnalysis() called:
   ├─ Writes to localStorage["thinkmate:state:v1"]
   ├─ Saves session + tasks to PostgreSQL (fire-and-forget)
   └─ Appends to load history (localStorage + DB)
6. Navigate to /dashboard
```

### localStorage Keys

| Key                           | Contents                                    |
|-------------------------------|---------------------------------------------|
| `thinkmate:state:v1`          | Full ThinkMateState (tasks, score, nextStep)|
| `thinkmate-tasks`             | Task array (mirror)                         |
| `thinkmate-analysis`          | Full analysis object (mirror)               |
| `thinkmate-load-history`      | Last 7 {date, score, risk_level} entries    |
| `thinkmate-session-context`   | Session summary + classification reasons    |
| `thinkmate-reflections`       | Array of evening reflection results         |
| `thinkmate-goals`             | Array of goal breakdown results             |
| `thinkmate-session-token`     | Auth session token                          |
| `thinkmate-user-id`           | Authenticated user UUID                     |
| `thinkmate-display-name`      | User display name                           |
| `thinkmate-demo-mode`         | `"true"` when in demo (skips DB writes)     |
| `thinkmate-explain-expanded`  | UI state for rationale panel                |

---

## 10. Authentication & Security

- **No external auth provider** — self-hosted custom auth in `db.server.ts`
- Passwords are hashed server-side (bcrypt assumed from implementation pattern)
- Session tokens are opaque random strings stored in DB
- Token validated on every server function call before DB access
- **Demo mode** is a separate bypass path — all AI calls work, but all DB writes are silently skipped
- `AuthGuard` component redirects unauthenticated users; the Brain Dump page in demo mode bypasses the guard

---

## 11. AI Provider Architecture

The `callGateway` function implements a **cascading fallback waterfall**:

```
callGateway(messages, tool)
        │
        ▼
1. Is an OpenRouter key configured? (starts with "sk-or-")
   └─ YES → Try OpenRouter /v1/chat/completions
             Model: google/gemini-2.5-flash
             ├─ SUCCESS → return parsed tool arguments
             └─ FAIL → log error, try next
        │
        ▼
2. Is a Groq key configured? (starts with "gsk_")
   └─ YES → Try Groq /openai/v1/chat/completions
             Model: llama-3.3-70b-versatile
             ├─ SUCCESS → return parsed tool arguments
             └─ FAIL → log error, try next
        │
        ▼
3. Is a direct Gemini key configured? (starts with "AIzaSy")
   └─ YES → Try Gemini generateContent API directly
             Model: gemini-2.5-flash
             Uses responseSchema (structured output)
             ├─ SUCCESS → return parsed JSON text
             └─ FAIL → log error, try next
        │
        ▼
4. Is a Lovable key configured? (starts with "AQ.")
   └─ YES → Try Lovable AI Gateway
             Model: google/gemini-2.5-flash
             ├─ SUCCESS → return parsed tool arguments
             └─ FAIL → log error
        │
        ▼
   ALL FAILED → throw Error with all collected error messages
```

All providers are configured via `.env` using any of:
- `LOVABLE_API_KEY`
- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `OPENROUTER_API_KEY`

A single key is auto-detected by its prefix to route to the correct provider.

---

## 12. Database Layer

### Schema (Inferred from `db.server.ts`)

**`users`**
```sql
id            UUID PRIMARY KEY
email         TEXT UNIQUE
password_hash TEXT
display_name  TEXT
created_at    TIMESTAMP
```

**`sessions` (auth)**
```sql
id            UUID PRIMARY KEY
user_id       UUID REFERENCES users
token         TEXT UNIQUE
created_at    TIMESTAMP
expires_at    TIMESTAMP
```

**`brain_sessions`**
```sql
id                         UUID PRIMARY KEY
user_id                    UUID REFERENCES users
brain_dump_text            TEXT
conversation_history       JSONB
analysis                   JSONB
session_summary            TEXT
classification_explanations JSONB
created_at                 TIMESTAMP
```

**`tasks`**
```sql
id               UUID PRIMARY KEY
user_id          UUID REFERENCES users
session_id       UUID REFERENCES brain_sessions
title            TEXT
priority         ENUM('high','medium','low')
quadrant         ENUM('do_now','schedule','delegate','ignore')
completed        BOOLEAN
estimated_minutes INT
deadline         TEXT
dependencies     JSONB
rationale        TEXT
carried_over_from DATE
created_at       TIMESTAMP
```

**`load_history`**
```sql
id          UUID PRIMARY KEY
user_id     UUID REFERENCES users
score       INT
risk_level  ENUM('low','moderate','high')
recorded_at TIMESTAMP
```

**`reflections`**
```sql
id               UUID PRIMARY KEY
user_id          UUID REFERENCES users
completed_tasks  JSONB
incomplete_tasks JSONB
free_text        TEXT
summary          TEXT
carried_over     JSONB
tomorrow_focus   TEXT
encouragement    TEXT
created_at       TIMESTAMP
```

**`goals`**
```sql
id          UUID PRIMARY KEY
user_id     UUID REFERENCES users
goal_text   TEXT
timeline    TEXT
result      JSONB
created_at  TIMESTAMP
```

**`decisions`**
```sql
id               UUID PRIMARY KEY
user_id          UUID REFERENCES users
decision_prompt  TEXT
result           JSONB
created_at       TIMESTAMP
```

---

## 13. File Structure Reference

```
mind-free-ai/
├── src/
│   ├── start.ts                    # App entry point (Nitro SSR)
│   ├── router.tsx                  # TanStack Router configuration
│   ├── styles.css                  # Global CSS + design tokens
│   │
│   ├── routes/
│   │   ├── __root.tsx              # Root layout, AppShell init, DB hydration
│   │   ├── index.tsx               # Landing page (/)
│   │   ├── brain-dump.tsx          # Brain dump + Akinator wizard (/brain-dump)
│   │   ├── dashboard.tsx           # Main dashboard (/dashboard)
│   │   ├── matrix.tsx              # Eisenhower matrix view (/matrix)
│   │   ├── decide.tsx              # Decision framework tool (/decide)
│   │   ├── reflect.tsx             # Evening reflection (/reflect)
│   │   ├── goals.tsx               # Goal breakdown (/goals)
│   │   ├── login.tsx               # Login page (/login)
│   │   └── signup.tsx              # Sign-up page (/signup)
│   │
│   ├── components/
│   │   ├── AppShell.tsx            # Navigation + layout shell
│   │   ├── AuthGuard.tsx           # Route protection HOC
│   │   ├── MentalLoadGauge.tsx     # SVG circular gauge
│   │   └── ui/                     # Radix UI / shadcn components
│   │
│   ├── hooks/
│   │   └── use-mobile.tsx          # Responsive breakpoint hook
│   │
│   └── lib/
│       ├── thinkmate.functions.ts  # All AI server functions (core logic)
│       ├── thinkmate-store.ts      # Client state hook + DB init
│       ├── auth.ts                 # useAuth hook
│       ├── db.ts                   # Client-side DB bridge (server fns)
│       ├── db.server.ts            # Server-only PostgreSQL operations
│       ├── config.server.ts        # Server config (env vars)
│       ├── utils.ts                # cn() class utility
│       ├── error-capture.ts        # Error boundary utilities
│       ├── error-page.ts           # Error page helper
│       └── lovable-error-reporting.ts
│
├── public/                         # Static assets
├── .env                            # API keys (not committed)
├── vite.config.ts                  # Vite + TanStack plugin config
├── package.json
├── tsconfig.json
├── start.bat                       # Smart launcher (auto-detects pkg manager)
└── run.bat                         # Simple launcher script
```

---

## 14. Running the Project

### Prerequisites
- Node.js 18+ or Bun
- API key for one of: OpenRouter, Groq, Gemini, or Lovable
- (Optional) PostgreSQL instance for persistent storage

### Environment Setup

Create or edit `mind-free-ai/.env`:
```env
# Choose ONE of the following (the app auto-detects by key prefix):
GEMINI_API_KEY=AIzaSy...          # Direct Google Gemini
GEMINI_API_KEY=sk-or-...          # OpenRouter
GEMINI_API_KEY=gsk_...            # Groq
LOVABLE_API_KEY=AQ....            # Lovable Gateway

# For database persistence (optional):
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Development

```bash
# Using npm
npm run dev

# Using Bun
bun run dev

# Using the provided launcher scripts (Windows):
start.bat     # Smart auto-detection of package manager
run.bat       # Quick launch script
```

The app will be available at **http://localhost:8080**.

### Without a Database
The app works in **demo mode** without any database configuration. All data is stored in localStorage only. The "See a Live Demo" button on the landing page triggers this mode automatically.

### Production Build
```bash
npm run build
npm run preview
```

---

*Documentation generated from source code analysis of the `mind-free-ai` codebase.*
*Last updated: June 2026*
