import { Pool } from "pg";
import crypto from "crypto";

let pool: Pool | null = null;
let dbInitializationPromise: Promise<void> | null = null;

export function getPool() {
  if (!pool) {
    const password = process.env.POSTGRES_PASSWORD || "Ks@kbd23777";
    pool = new Pool({
      host: "localhost",
      port: 5432,
      user: "postgres",
      password: password,
      database: "postgres",
    });
  }
  return pool;
}

export function ensureDatabaseInitialized(): Promise<void> {
  if (!dbInitializationPromise) {
    dbInitializationPromise = initializeDatabase();
  }
  return dbInitializationPromise;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === verifyHash;
}

export async function initializeDatabase() {
  const p = getPool();
  let client;
  try {
    client = await p.connect();
    
    // Create base tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        brain_dump_text TEXT NOT NULL,
        conversation_history JSONB DEFAULT '[]',
        analysis JSONB,
        session_summary TEXT,
        classification_explanations JSONB DEFAULT '[]'
      );
      
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        title TEXT NOT NULL,
        priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
        quadrant TEXT CHECK (quadrant IN ('do_now', 'schedule', 'delegate', 'ignore')),
        completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMPTZ,
        carried_over_from DATE
      );
      
      CREATE TABLE IF NOT EXISTS load_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recorded_at TIMESTAMPTZ DEFAULT NOW(),
        score INTEGER CHECK (score BETWEEN 0 AND 100),
        risk_level TEXT CHECK (risk_level IN ('low', 'moderate', 'high'))
      );
      
      CREATE TABLE IF NOT EXISTS reflections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reflection_date DATE DEFAULT CURRENT_DATE,
        completed_tasks TEXT[] DEFAULT '{}',
        incomplete_tasks TEXT[] DEFAULT '{}',
        free_text TEXT,
        summary TEXT,
        carried_over TEXT[] DEFAULT '{}',
        tomorrow_focus TEXT,
        encouragement TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        goal_text TEXT NOT NULL,
        timeline TEXT,
        result JSONB
      );
      
      CREATE TABLE IF NOT EXISTS decisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        decision_prompt TEXT NOT NULL,
        result JSONB
      );
    `);
    console.log("Database initialized successfully with local authentication tables.");
  } catch (err) {
    console.error("Error initializing database tables:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
}

// Session Validation Helper
export async function getUserIdFromToken(token: string): Promise<string | null> {
  if (!token) return null;
  await ensureDatabaseInitialized();
  const p = getPool();
  try {
    const query = `
      SELECT user_id FROM user_sessions
      WHERE id = $1 AND expires_at > NOW()
    `;
    const res = await p.query(query, [token]);
    return res.rows[0]?.user_id || null;
  } catch (err) {
    console.error("Failed to validate token:", err);
    return null;
  }
}

// Authentication Handlers
export async function signUpUserServer(email: string, password_plain: string, displayName: string) {
  await ensureDatabaseInitialized();
  const p = getPool();
  const normalizedEmail = email.toLowerCase().trim();

  // Check if exists
  const checkQuery = `SELECT id FROM users WHERE email = $1`;
  const checkRes = await p.query(checkQuery, [normalizedEmail]);
  if (checkRes.rows.length > 0) {
    throw new Error("An account with this email address already exists.");
  }

  const hash = hashPassword(password_plain);

  const insertQuery = `
    INSERT INTO users (email, password_hash, display_name)
    VALUES ($1, $2, $3)
    RETURNING id, email, display_name
  `;
  const userRes = await p.query(insertQuery, [normalizedEmail, hash, displayName.trim()]);
  const user = userRes.rows[0];

  // Create session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  const sessionQuery = `
    INSERT INTO user_sessions (user_id, expires_at)
    VALUES ($1, $2)
    RETURNING id
  `;
  const sessionRes = await p.query(sessionQuery, [user.id, expiresAt]);
  
  return {
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
    },
    sessionToken: sessionRes.rows[0].id,
  };
}

export async function signInUserServer(email: string, password_plain: string) {
  await ensureDatabaseInitialized();
  const p = getPool();
  const normalizedEmail = email.toLowerCase().trim();

  const query = `SELECT * FROM users WHERE email = $1`;
  const res = await p.query(query, [normalizedEmail]);
  const user = res.rows[0];

  if (!user || !verifyPassword(password_plain, user.password_hash)) {
    throw new Error("Invalid email or password.");
  }

  // Create session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const sessionQuery = `
    INSERT INTO user_sessions (user_id, expires_at)
    VALUES ($1, $2)
    RETURNING id
  `;
  const sessionRes = await p.query(sessionQuery, [user.id, expiresAt]);

  return {
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
    },
    sessionToken: sessionRes.rows[0].id,
  };
}

export async function signOutUserServer(token: string) {
  await ensureDatabaseInitialized();
  const p = getPool();
  await p.query(`DELETE FROM user_sessions WHERE id = $1`, [token]);
}

export async function getUserFromServer(token: string) {
  await ensureDatabaseInitialized();
  const p = getPool();
  const query = `
    SELECT u.id, u.email, u.display_name, s.created_at as session_created
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = $1 AND s.expires_at > NOW()
  `;
  const res = await p.query(query, [token]);
  return res.rows[0] || null;
}

// Sessions SQL Operations
export async function saveSessionServer(token: string, data: any): Promise<string> {
  const userId = await getUserIdFromToken(token);
  if (!userId) throw new Error("Unauthorized");

  const p = getPool();
  const query = `
    INSERT INTO sessions (user_id, brain_dump_text, conversation_history, analysis, session_summary, classification_explanations)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `;
  const values = [
    userId,
    data.brain_dump_text,
    JSON.stringify(data.conversation_history || []),
    JSON.stringify(data.analysis || {}),
    data.session_summary || "",
    JSON.stringify(data.classification_explanations || []),
  ];
  const res = await p.query(query, values);
  return res.rows[0].id;
}

export async function getLatestSessionServer(token: string): Promise<any | null> {
  const userId = await getUserIdFromToken(token);
  if (!userId) return null;

  const p = getPool();
  const query = `
    SELECT * FROM sessions
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const res = await p.query(query, [userId]);
  return res.rows[0] || null;
}

// Tasks SQL Operations
export async function saveTasksServer(token: string, tasks: any[]): Promise<void> {
  const userId = await getUserIdFromToken(token);
  if (!userId) throw new Error("Unauthorized");

  const p = getPool();
  for (const t of tasks) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.id);
    const query = `
      INSERT INTO tasks (id, user_id, session_id, title, priority, quadrant, completed, completed_at, carried_over_from)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        priority = EXCLUDED.priority,
        quadrant = EXCLUDED.quadrant,
        completed = EXCLUDED.completed,
        completed_at = EXCLUDED.completed_at,
        carried_over_from = EXCLUDED.carried_over_from
    `;
    const values = [
      isUUID ? t.id : undefined,
      userId,
      t.session_id || null,
      t.title,
      t.priority || "medium",
      t.quadrant || null,
      t.completed || false,
      t.completed_at || null,
      t.carried_over_from || null,
    ];

    if (!isUUID) {
      const insertWithoutIdQuery = `
        INSERT INTO tasks (user_id, session_id, title, priority, quadrant, completed, completed_at, carried_over_from)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      await p.query(insertWithoutIdQuery, values.slice(1));
    } else {
      await p.query(query, values);
    }
  }
}

export async function updateTaskServer(token: string, id: string, patch: any): Promise<void> {
  const userId = await getUserIdFromToken(token);
  if (!userId) throw new Error("Unauthorized");

  const p = getPool();
  const sets: string[] = [];
  const values: any[] = [id, userId];

  let index = 3;
  if (patch.completed !== undefined) {
    sets.push(`completed = $${index++}`);
    values.push(patch.completed);
    
    sets.push(`completed_at = $${index++}`);
    values.push(patch.completed ? new Date().toISOString() : null);
  }
  if (patch.quadrant !== undefined) {
    sets.push(`quadrant = $${index++}`);
    values.push(patch.quadrant);
  }
  if (patch.priority !== undefined) {
    sets.push(`priority = $${index++}`);
    values.push(patch.priority);
  }
  if (patch.title !== undefined) {
    sets.push(`title = $${index++}`);
    values.push(patch.title);
  }

  if (sets.length === 0) return;

  const query = `
    UPDATE tasks
    SET ${sets.join(", ")}
    WHERE id = $1 AND user_id = $2
  `;
  await p.query(query, values);
}

export async function getUserTasksServer(token: string, options?: { activeOnly?: boolean }): Promise<any[]> {
  const userId = await getUserIdFromToken(token);
  if (!userId) return [];

  const p = getPool();
  let query = `SELECT * FROM tasks WHERE user_id = $1`;
  const values: any[] = [userId];

  if (options?.activeOnly) {
    query += ` AND completed = false`;
  }
  query += ` ORDER BY created_at DESC`;

  const res = await p.query(query, values);
  return res.rows;
}

// Load History SQL Operations
export async function appendLoadHistoryServer(token: string, entry: any): Promise<void> {
  const userId = await getUserIdFromToken(token);
  if (!userId) throw new Error("Unauthorized");

  const p = getPool();
  await p.query(
    `INSERT INTO load_history (user_id, score, risk_level) VALUES ($1, $2, $3)`,
    [userId, entry.score, entry.risk_level]
  );
}

export async function getLoadHistoryServer(token: string, limit: number): Promise<any[]> {
  const userId = await getUserIdFromToken(token);
  if (!userId) return [];

  const p = getPool();
  const res = await p.query(
    `SELECT * FROM load_history WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT $2`,
    [userId, limit]
  );
  return res.rows;
}

// Reflections SQL Operations
export async function saveReflectionServer(token: string, r: any): Promise<void> {
  const userId = await getUserIdFromToken(token);
  if (!userId) throw new Error("Unauthorized");

  const p = getPool();
  const query = `
    INSERT INTO reflections (user_id, completed_tasks, incomplete_tasks, free_text, summary, carried_over, tomorrow_focus, encouragement)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `;
  await p.query(query, [
    userId,
    r.completed_tasks,
    r.incomplete_tasks,
    r.free_text,
    r.summary,
    r.carried_over,
    r.tomorrow_focus,
    r.encouragement,
  ]);
}

export async function getReflectionsServer(token: string, limit: number): Promise<any[]> {
  const userId = await getUserIdFromToken(token);
  if (!userId) return [];

  const p = getPool();
  const res = await p.query(
    `SELECT * FROM reflections WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return res.rows;
}

// Goals SQL Operations
export async function saveGoalServer(token: string, g: any): Promise<void> {
  const userId = await getUserIdFromToken(token);
  if (!userId) throw new Error("Unauthorized");

  const p = getPool();
  const query = `
    INSERT INTO goals (user_id, goal_text, timeline, result)
    VALUES ($1, $2, $3, $4)
  `;
  await p.query(query, [
    userId,
    g.goal_text,
    g.timeline || null,
    JSON.stringify(g.result),
  ]);
}

export async function getGoalsServer(token: string): Promise<any[]> {
  const userId = await getUserIdFromToken(token);
  if (!userId) return [];

  const p = getPool();
  const res = await p.query(
    `SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return res.rows;
}

// Decisions SQL Operations
export async function saveDecisionServer(token: string, d: any): Promise<void> {
  const userId = await getUserIdFromToken(token);
  if (!userId) throw new Error("Unauthorized");

  const p = getPool();
  const query = `
    INSERT INTO decisions (user_id, decision_prompt, result)
    VALUES ($1, $2, $3)
  `;
  await p.query(query, [
    userId,
    d.decision_prompt,
    JSON.stringify(d.result),
  ]);
}

export async function getDecisionsServer(token: string): Promise<any[]> {
  const userId = await getUserIdFromToken(token);
  if (!userId) return [];

  const p = getPool();
  const res = await p.query(
    `SELECT * FROM decisions WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return res.rows;
}
