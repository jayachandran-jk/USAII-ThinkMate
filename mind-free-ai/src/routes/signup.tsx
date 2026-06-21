import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const signupSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/signup")({
  validateSearch: (search) => signupSearchSchema.parse(search),
  component: SignupPage,
});

function SignupPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom password strength logic (rule-based)
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "bg-muted" };
    
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    
    if (hasLetters && hasNumbers) score += 1;
    if (hasSpecial) score += 1;

    if (score <= 1) {
      return { score: 1, label: "Weak", color: "bg-risk" };
    } else if (score <= 3) {
      return { score: 2, label: "Fair", color: "bg-warning" };
    } else {
      return { score: 3, label: "Strong", color: "bg-success" };
    }
  }, [password]);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || !confirmPassword || !displayName) return;
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const { error } = await signUp(email, password, displayName);

      if (error) {
        setError(error.message || "Failed to create account.");
      } else {
        navigate({ to: redirect || "/dashboard" });
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell hideNav>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-5 py-12">
        <div className="w-full max-w-[400px] rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)] ring-1 ring-black/5">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Create account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Start mapping your second brain.
            </p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                required
                disabled={loading}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-background pl-4 pr-11 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex justify-between items-center text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                    <span>Password Strength:</span>
                    <span className={passwordStrength.score === 1 ? "text-risk" : passwordStrength.score === 2 ? "text-warning" : "text-success"}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.score / 3) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                disabled={loading}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-risk/30 bg-risk/5 px-4 py-3 text-xs text-risk leading-relaxed">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 rounded-xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 shadow-[var(--shadow-glow)] hover:scale-[1.01] active:scale-[0.99] transition-transform"
              style={{ background: "var(--gradient-primary)" }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Create account
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground font-medium">
            Already have an account?{" "}
            <Link to="/login" search={{ redirect }} className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
