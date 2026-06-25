# ThinkMate AI

```
 ████████╗██╗  ██╗██╗███╗   ██╗██╗  ██╗███╗   ███╗ █████╗ ████████╗███████╗
    ██╔══╝██║  ██║██║████╗  ██║██║ ██╔╝████╗ ████║██╔══██╗╚══██╔══╝██╔════╝
    ██║   ███████║██║██╔██╗ ██║█████╔╝ ██╔████╔██║███████║   ██║   █████╗
    ██║   ██╔══██║██║██║╚██╗██║██╔═██╗ ██║╚██╔╝██║██╔══██║   ██║   ██╔══╝
    ██║   ██║  ██║██║██║ ╚████║██║  ██╗██║ ╚═╝ ██║██║  ██║   ██║   ███████╗
    ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝

      █████╗ ██╗
     ██╔══██╗██║
     ███████║██║
     ██╔══██║██║
     ██║  ██║██║
     ╚═╝  ╚═╝╚═╝
```

**`v1.0.0`** &nbsp;|&nbsp; **`Open Source`** &nbsp;|&nbsp; **`Productivity · AI`** &nbsp;|&nbsp; **`React 19`** &nbsp;|&nbsp; **`Full-Stack SSR`**

> **→ AI-Powered Cognitive Load Manager · Not another to-do list**

```
● Port: localhost:8080 | ◈ Stack: React 19 · TanStack Start · Nitro · PostgreSQL | ★ AI: Gemini 2.5 Flash · Llama 3.3 70B (fallback)
```

---

## `$ cat PROBLEM.md`

```
╔══════════════════════════════════════════════════════════════╗
║  PRODUCTIVITY APPS ARE LYING TO YOU                         ║
╚══════════════════════════════════════════════════════════════╝
```

They promise clarity and deliver more complexity. You install a task manager and now you're managing your task manager. You read four books on productivity and end up with four conflicting systems and zero peace of mind.

The real problem was never the number of tasks.  
It was that **nobody ever asked what's actually going on in your head.**

- ✗ **Notion** — adds more tabs to your brain
- ✗ **Todoist** — assumes you already know what to do
- ✗ **AI chatbots** — dumps 10 bullet points, zero prioritization
- ✗ **Pomodoro apps** — times your work, not your thinking

---

## `$ cat ARCHITECTURE.md`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     THINKMATE CORE PIPELINE                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

```
① BRAIN DUMP ──▶ ② AKINATOR WIZARD ──▶ ③ COI ANALYSIS ──▶ ④ FRAMEWORK SELECT ──▶ ⑤ ONE NEXT STEP
```

---

## System Architecture Diagrams

### 1. System Architecture Diagram

```mermaid
flowchart TD
    subgraph UX["UX / Browser Layer (React 19)"]
        BD["/brain-dump"]
        DASH["/dashboard"]
        MAT["/matrix"]
        DEC["/decide"]
        GOAL["/goals"]
        REF["/reflect"]
        
        HOOK["useThinkMate Hook (React State Layer)\nlocalStorage ◄──► React State ◄──► CustomEvent"]
        BD & DASH & MAT & DEC & GOAL & REF --> HOOK
    end

    subgraph SSR["Nitro SSR Server (TanStack Start)"]
        RPC["HTTP · createServerFn (type-safe RPC)"]
        FUNC["AI ENGINE (thinkmate.functions.ts)\n• conductBrainDumpSession\n• analyzeDecision\n• breakdownGoal\n• generateReflection\n• callGateway"]
        DB_BRIDGE["DATABASE BRIDGE (db.server.ts)\n• saveSessionServer\n• saveTasksServer\n• updateTaskServer\n• getUserTasksServer\n• signUpUserServer\n• signInUserServer"]
        
        RPC --> FUNC
        RPC --> DB_BRIDGE
    end

    subgraph AI["AI Provider Gateway (Cascading Fallback)"]
        OR["① OpenRouter (sk-or-)\nGoogle Gemini 2.5 Flash"]
        GR["② Groq (gsk_)\nLlama 3.3 70B"]
        DG["③ Direct Gemini (AIzaSy)\nGemini 2.5 Flash"]
        LG["④ Lovable Gateway (AQ.)\nGemini 2.5 Flash"]
        ERR["✗ Error Thrown"]
        
        OR -->|if fails| GR
        GR -->|if fails| DG
        DG -->|if fails| LG
        LG -->|all fail| ERR
    end

    subgraph DB["Data Persistence"]
        PG[(PostgreSQL Database\n8 Tables)]
        LS["Client localStorage\n(11 named keys)"]
        DEMO["Demo Mode\n(localStorage only, no DB writes)"]
    end

    HOOK -->|RPC Calls| RPC
    FUNC -->|HTTPS API Calls| OR
    DB_BRIDGE -->|pg queries| PG
    HOOK -->|Client Persistence| LS
    LS -.-> DEMO
```

### 2. Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as React 19 UI (/brain-dump)
    participant Store as useThinkMate Hook
    participant SSR as Nitro SSR (createServerFn)
    participant Gateway as AI Gateway Waterfall
    participant DB as PostgreSQL / localStorage

    User->>UI: Inputs raw thoughts into Brain Dump
    UI->>Store: Calls saveAnalysis(dumpText)
    Store->>SSR: HTTP RPC: conductBrainDumpSession(dumpText)
    SSR->>Gateway: callGateway(promptChain)
    
    alt Primary Provider (OpenRouter)
        Gateway->>Gateway: Try OpenRouter (sk-or-)
    else Fallback 1 (Groq)
        Gateway->>Gateway: Try Groq (gsk_) -> Llama 3.3 70B
    else Fallback 2 (Direct Gemini)
        Gateway->>Gateway: Try Direct Gemini API (AIzaSy)
    else Fallback 3 (Lovable Gateway)
        Gateway->>Gateway: Try Lovable Gateway (AQ.)
    end

    Gateway-->>SSR: Returns structured JSON analysis
    SSR->>DB: db.server.ts -> INSERT/UPDATE (brain_sessions, tasks)
    SSR-->>Store: Returns hydrated session & tasks data
    Store->>DB: Syncs to localStorage (thinkmate:state:v1)
    Store->>Store: Dispatches CustomEvent (cross-tab sync)
    Store-->>UI: Updates React State
    UI-->>User: Renders AI Analysis, COI vital sign & ONE Next Step
```

### 3. UML Class / Architecture Diagram

```mermaid
classDiagram
    class useThinkMate {
        +ThinkMateState state
        +saveAnalysis(dumpText: string) Promise~void~
        +toggleTask(taskId: string) Promise~void~
        +moveTask(taskId: string, quadrant: string) Promise~void~
        +addTask(task: Task) Promise~void~
        +initializeFromDB() Promise~void~
        +clearAll() void
    }

    class ThinkMateFunctions {
        <<thinkmate.functions.ts>>
        +conductBrainDumpSession(text: string) SessionResult
        +analyzeDecision(decision: string) DecisionResult
        +breakdownGoal(goal: string) GoalResult
        +generateReflection(context: string) ReflectionResult
        +callGateway(prompt: string) JSONB
    }

    class DatabaseBridge {
        <<db.server.ts>>
        +signUpUserServer(credentials: object) AuthResult
        +signInUserServer(credentials: object) SessionToken
        +saveSessionServer(session: BrainSession) void
        +saveTasksServer(tasks: Task[]) void
        +updateTaskServer(task: Task) void
        +getUserTasksServer(userId: UUID) Task[]
    }

    class AIGateway {
        +string GEMINI_API_KEY
        +string OPENROUTER_API_KEY
        +string GROQ_API_KEY
        +string LOVABLE_API_KEY
        +dispatchRequest(prompt: string) JSON
    }

    useThinkMate --> ThinkMateFunctions : createServerFn RPC
    useThinkMate --> DatabaseBridge : Auth & State Sync
    ThinkMateFunctions --> AIGateway : Cascading Fallback
```

### 4. ERP / ERD (Entity Relationship) Diagram

```mermaid
erDiagram
    users ||--o{ sessions : "authenticates via"
    users ||--o{ load_history : "tracks"
    users ||--o{ goals : "sets"
    users ||--o{ brain_sessions : "conducts"
    users ||--o{ tasks : "owns"
    users ||--o{ reflections : "submits"
    brain_sessions ||--o{ tasks : "generates"

    users {
        UUID id PK
        TEXT email UK
        TEXT password_hash
        TEXT display_name
        TIMESTAMP created_at
    }

    sessions {
        UUID id PK
        UUID user_id FK
        TEXT token UK
        TIMESTAMP created_at
        TIMESTAMP expires_at
    }

    load_history {
        UUID id PK
        UUID user_id FK
        INT score
        string risk_level
        TIMESTAMP recorded_at
    }

    goals {
        UUID id PK
        UUID user_id FK
        TEXT goal_text
        TEXT timeline
        JSONB result
        TIMESTAMP created_at
    }

    brain_sessions {
        UUID id PK
        UUID user_id FK
        TEXT brain_dump_text
        JSONB conversation_history
        JSONB analysis
        TEXT session_summary
        JSONB classification_exp
        TIMESTAMP created_at
    }

    tasks {
        UUID id PK
        UUID user_id FK
        UUID session_id FK
        TEXT title
        string priority
        string quadrant
        BOOLEAN completed
        INT estimated_minutes
        TEXT deadline
        JSONB dependencies
        TEXT rationale
        DATE carried_over_from
        TIMESTAMP created_at
    }

    reflections {
        UUID id PK
        UUID user_id FK
        JSONB completed_tasks
        JSONB incomplete_tasks
        TEXT free_text
        TEXT summary
        TEXT encouragement
        TEXT tomorrow_focus
        JSONB carried_over
        TIMESTAMP created_at
    }
```

---

## `$ cat STACK.md`

```
┌──────────────────┬──────────────────────────────────────────────────────┐
│ LAYER            │ TECHNOLOGY                                           │
├──────────────────┼──────────────────────────────────────────────────────┤
│ Framework        │ React 19                                             │
│ Router           │ TanStack Router v1 (file-based routes)              │
│ SSR / Server Fns │ TanStack Start + Nitro                              │
│ Styling          │ Tailwind CSS v4 + tw-animate-css                    │
│ UI Components    │ Radix UI (shadcn/ui patterns) + Lucide React        │
│ Forms            │ React Hook Form + Zod                               │
│ State            │ Custom useThinkMate hook (localStorage-backed)       │
│ Build Tool       │ Vite 7                                              │
├──────────────────┼──────────────────────────────────────────────────────┤
│ Server Runtime   │ Nitro (via TanStack Start)                          │
│ Server Functions │ createServerFn — type-safe RPC                      │
│ Database Client  │ pg (node-postgres)                                  │
│ Validation       │ Zod schemas (shared client/server)                  │
│ Auth             │ Custom session tokens + bcrypt (no third-party)     │
├──────────────────┼──────────────────────────────────────────────────────┤
│ AI Primary       │ OpenRouter → Gemini 2.5 Flash      (sk-or- prefix) │
│ AI Fallback 1    │ Groq → Llama 3.3 70B               (gsk_ prefix)   │
│ AI Fallback 2    │ Direct Gemini API → gemini-2.5-flash (AIzaSy prefix)│
│ AI Fallback 3    │ Lovable Gateway → Gemini 2.5 Flash  (AQ. prefix)   │
│ AI Pattern       │ 3-stage structured JSON prompt chain                │
└──────────────────┴──────────────────────────────────────────────────────┘
```

---

## `$ cat features/COI.md`

```
╔══════════════════════════════════════════════════════════════╗
║         COGNITIVE OVERLOAD INDEX  ·  COI™                   ║
║         "Not a score. A cognitive health vital sign."        ║
╚══════════════════════════════════════════════════════════════╝
```

| DIMENSION | SIGNAL DETECTED | WEIGHT |
| :--- | :--- | :---: |
| **Active task volume** | how many open loops exist | **25%** |
| **Deadline pressure** | urgency density across the dump | **30%** |
| **Dependency complexity** | how many tasks block others | **15%** |
| **Decision count** | items requiring judgment vs action | **20%** |
| **Context switching** | domain mix: work / health / finance | **10%** |

- 🟢 **0 – 39 GREEN ZONE** &nbsp;&nbsp; `Focused execution. You're clear.`
- 🟡 **40 – 70 YELLOW ZONE** &nbsp; `Protect deep work. Buffer incoming.`
- 🔴 **71 – 100 RED ZONE** &nbsp;&nbsp;&nbsp;&nbsp; `Delegate, defer, or decompress.`

---

## `$ cat features/BOTTLENECK.md`

```
╔══════════════════════════════════════════════════════════════╗
║  BOTTLENECK & HIDDEN DEPENDENCY DETECTION                    ║
║  "The feature only AI can do."                              ║
╚══════════════════════════════════════════════════════════════╝
```

```
⚠ BOTTLENECK: Manager approval  ──▶  BLOCKS 3 TASKS
  ├── Finalize project report (blocked ✗)
  ├── Submit to client        (blocked ✗)
  └── Schedule review         (blocked ✗)

→ Escalate before 2 PM · Unblocks 4.5h of stuck work
```

Hidden dependency inference — tasks listed independently, inferred by AI:  
`"Update resume"` must precede `"Apply to internship"` — connected automatically.

---

## `$ cat features/FRAMEWORK_INTELLIGENCE.md`

```
╔══════════════════════════════════════════════════════════════╗
║  MULTI-FRAMEWORK INTELLIGENCE LAYER                          ║
║  "Every book teaches one framework. We know all of them."   ║
╚══════════════════════════════════════════════════════════════╝
```

```
DUMP ANALYZED (AI reads your signals)
  ├── EISENHOWER   (urgent × important)   IF: hard deadlines + time pressure
  ├── OKR DECOMP   (goals → key results)  IF: long-term goal, no clear steps
  ├── ABCDE METHOD (A=must B=should)      IF: 8+ tasks, unclear priority
  ├── MIT METHOD   (pick only 3 tasks)    IF: COI > 70, cognitive overload
  └── MIND SWEEP   (GTD capture)          IF: anxiety, emotional weight

ONE SMART NEXT STEP
Framework: Eisenhower + MIT · Why: high urgency + overload
```

---

## `$ cat features/XAI.md`

```
╔══════════════════════════════════════════════════════════════╗
║  EXPLAINABLE AI — "We show our work. Most AI doesn't."      ║
╚══════════════════════════════════════════════════════════════╝
```

**AI chose:** `"Prioritize Critical Blockers — Project Omega"`

| FACTOR | WEIGHT |
| :--- | :---: |
| **Deadline impact (Friday)** | `[████████  ] 40%` |
| **Blocks 3 downstream tasks** | `[██████    ] 30%` |
| **Aligns with stated goal** | `[████      ] 20%` |
| **Effort: short (~25 min)** | `[██        ] 10%` |

`→ Starting this TODAY prevents a cascade failure across 3 blocked tasks.`

---

## `$ cat AUTH.md`

```
╔══════════════════════════════════════════════════════════════╗
║  AUTHENTICATION & SECURITY                                   ║
╚══════════════════════════════════════════════════════════════╝
```

- ◈ **No external auth provider** — fully self-hosted in `db.server.ts`
- ◈ **Passwords hashed with bcrypt** server-side before storage
- ◈ **Session tokens** are opaque random strings, stored in PostgreSQL `sessions` table
- ◈ **Token validated** on every server function call before any DB access
- ◈ **AuthGuard component** wraps all protected routes — redirects to `/login` if unauthenticated
- ◈ **Demo mode** bypasses DB entirely — AI calls work, zero data is persisted

| FLOW | MECHANISM |
| :--- | :--- |
| **Sign up** | `signUpUserServer()` → bcrypt hash → `INSERT users` |
| **Sign in** | `signInUserServer()` → bcrypt compare → `INSERT sessions` → return token |
| **Request auth** | read token from `localStorage` → validate against `sessions` table |
| **Sign out** | `signOutUserServer()` → `DELETE session row` → clear `localStorage` |

---

## `$ cat STATE.md`

```
╔══════════════════════════════════════════════════════════════╗
║  STATE MANAGEMENT — useThinkMate Hook                        ║
╚══════════════════════════════════════════════════════════════╝
```

Custom React hook at `src/lib/thinkmate-store.ts` — the single source of truth for all client state.

| METHOD | PURPOSE |
| :--- | :--- |
| `saveAnalysis()` | Persists AI results to `localStorage` + PostgreSQL (fire-and-forget) |
| `toggleTask()` | Marks task complete/incomplete, synced to DB |
| `moveTask()` | Reassigns task to a different Eisenhower quadrant |
| `addTask()` | Manually adds a task (used in `/goals` and `/reflect`) |
| `initializeFromDB()` | On auth, hydrates `localStorage` from server DB |
| `clearAll()` | Wipes all stored state |

`localStorage` keys (persisted under `thinkmate:state:v1`):

| KEY | CONTENTS |
| :--- | :--- |
| `thinkmate:state:v1` | Full `ThinkMateState` — tasks, COI score, next step |
| `thinkmate-tasks` | Task array mirror |
| `thinkmate-load-history` | Last 7 `{date, score, risk_level}` entries |
| `thinkmate-session-context` | Session summary + classification reasons |
| `thinkmate-reflections` | Array of evening reflection results |
| `thinkmate-goals` | Array of goal breakdown results |
| `thinkmate-session-token` | Auth session token |
| `thinkmate-user-id` | Authenticated user UUID |
| `thinkmate-display-name` | User display name |
| `thinkmate-demo-mode` | "true" when in demo — skips all DB writes |
| `thinkmate-explain-expanded`| UI state for XAI rationale panel |

---

## `$ cat DATABASE.md`

```
╔══════════════════════════════════════════════════════════════╗
║  DATABASE SCHEMA — PostgreSQL                                ║
╚══════════════════════════════════════════════════════════════╝
```

### `users`
```
id            UUID PK
email         TEXT UNIQUE
password_hash TEXT
display_name  TEXT
created_at    TIMESTAMP
```

### `sessions`
```
id         UUID PK
user_id    UUID → users
token      TEXT UNIQUE
created_at TIMESTAMP
expires_at TIMESTAMP
```

### `load_history`
```
id          UUID PK
user_id     UUID → users
score       INT (0–100)
risk_level  ENUM low|moderate|high
recorded_at TIMESTAMP
```

### `goals`
```
id         UUID PK
user_id    UUID → users
goal_text  TEXT
timeline   TEXT
result     JSONB
created_at TIMESTAMP
```

### `brain_sessions`
```
id                    UUID PK
user_id               UUID → users
brain_dump_text       TEXT
conversation_history  JSONB
analysis              JSONB
session_summary       TEXT
classification_exp    JSONB
created_at            TIMESTAMP
```

### `tasks`
```
id                UUID PK
user_id           UUID → users
session_id        UUID → brain_sessions
title             TEXT
priority          ENUM high|medium|low
quadrant          ENUM do_now|schedule|delegate|ignore
completed         BOOLEAN
estimated_minutes INT
deadline          TEXT
dependencies      JSONB
rationale         TEXT
carried_over_from DATE
created_at        TIMESTAMP
```

### `reflections`
```
id               UUID PK
user_id          UUID → users
completed_tasks  JSONB
incomplete_tasks JSONB
free_text        TEXT
summary          TEXT
encouragement    TEXT
tomorrow_focus   TEXT
carried_over     JSONB
created_at       TIMESTAMP
```

---

## `$ cat features/AI_GATEWAY.md`

```
╔══════════════════════════════════════════════════════════════╗
║  AI PROVIDER FALLBACK WATERFALL                              ║
║  "ThinkMate never goes down due to a single AI outage."     ║
╚══════════════════════════════════════════════════════════════╝
```

- ① **OpenRouter** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `key prefix: sk-or- · model: google/gemini-2.5-flash`  
  `↓ if fails`
- ② **Groq** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `key prefix: gsk_ · model: llama-3.3-70b-versatile`  
  `↓ if fails`
- ③ **Direct Gemini** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `key prefix: AIzaSy · model: gemini-2.5-flash · responseSchema JSON`  
  `↓ if fails`
- ④ **Lovable Gateway** &nbsp;&nbsp;&nbsp;&nbsp; `key prefix: AQ. · model: google/gemini-2.5-flash`  
  `↓ all fail`
- ✗ **Error thrown** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `collected error messages surfaced to caller`

Configure via `.env` — key prefix auto-detected to route to correct provider. Only one key needed.

---

## `$ cat GETTING_STARTED.md`

```
╔══════════════════════════════════════════════════════════════╗
║  GETTING STARTED                                             ║
╚══════════════════════════════════════════════════════════════╝
```

### Prerequisites
- ▶ Node.js 18+ or Bun
- ▶ API key for one of: OpenRouter · Groq · Gemini · Lovable
- ▶ PostgreSQL instance *(optional — app runs in demo mode without it)*

### Environment Setup
```bash
# .env — only ONE key needed, prefix auto-detected
GEMINI_API_KEY=AIzaSy...     # Direct Google Gemini
OPENROUTER_API_KEY=sk-or-... # OpenRouter
GROQ_API_KEY=gsk_...         # Groq
LOVABLE_API_KEY=AQ....       # Lovable Gateway

# Optional — omit to use demo mode (localStorage only)
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Run
```bash
npm run dev    # or  bun run dev

# Windows launchers
start.bat     # auto-detects package manager
run.bat       # quick launch
```
App available at `http://localhost:8080`

---

## `$ cat DECISIONS.md`

### ✅ WHAT'S INCLUDED
- ▶ Brain Dump + Akinator Wizard
- ▶ Cognitive Overload Index (COI)
- ▶ Bottleneck & Dependency Detection
- ▶ Multi-Framework Intelligence Layer
- ▶ Explainable AI Decision Card
- ▶ Eisenhower Matrix + drag-and-drop override
- ▶ Evening Reflection + Carry Forward
- ▶ ONE Smart Next Step
- ▶ Custom auth (bcrypt + session tokens)
- ▶ Multi-provider AI fallback waterfall
- ▶ Full demo mode (no DB required)

### ✗ INTENTIONALLY EXCLUDED
- ✗ **Focus Timer** — Pomodoro clocks already exist
- ✗ **Weekly PDF/email report** — async, undemoable
- ✗ **Morning push notifications** — zero novelty
- ✗ **Team Mode** — fundamentally different product
- ✗ **Cognitive Twin** — requires weeks of user data
- ✗ **Pattern Profiler** — needs 3+ sessions to surface anything

*Cutting things is the harder decision. It's also the right one.*

---

## `$ cat PHILOSOPHY.md`

```
  ╔═══════════════════════════════════════════╗
  ║                                           ║
  ║   AI recommends.  Humans decide.          ║
  ║                              Always.      ║
  ║                                           ║
  ╚═══════════════════════════════════════════╝
```

ThinkMate is not an autonomous agent. It surfaces signal from noise.  
What you do with that signal is entirely yours.

---

## Footer

- ◉ Stack: `React 19 · TanStack Start · Nitro · PostgreSQL · Vite 7`
- ★ AI: `Gemini 2.5 Flash (primary) · Llama 3.3 70B (fallback)`
- ⬡ License: `MIT`

─────────────────────────────────────────────  
**ThinkMate** · *Because the bottleneck was never your effort.*
