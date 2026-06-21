import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Brain, LayoutDashboard, Grid3x3, Scale, PenLine, Target, Moon, House, LogOut, User as UserIcon } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import * as db from "@/lib/db";

const nav = [
  { to: "/", label: "Home", icon: House },
  { to: "/brain-dump", label: "Brain Dump", icon: PenLine },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/matrix", label: "Matrix", icon: Grid3x3 },
  { to: "/decide", label: "Decide", icon: Scale },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/reflect", label: "Reflect", icon: Moon },
] as const;

// Mobile bar should show only 5: Brain Dump, Dashboard, Matrix, Goals, Reflect
const mobileNav = nav.filter((n) => n.to !== "/" && n.to !== "/decide");

interface AppShellProps {
  children: ReactNode;
  hideNav?: boolean;
}

export function AppShell({ children, hideNav = false }: AppShellProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { isAuthenticated, signOut, user } = useAuth();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [lastSessionTime, setLastSessionTime] = useState<string | null>(null);

  // Sync demo mode & check latest session time on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDemo(window.localStorage.getItem("thinkmate-demo-mode") === "true");
      
      const updateHandler = () => {
        setIsDemo(window.localStorage.getItem("thinkmate-demo-mode") === "true");
      };
      window.addEventListener("thinkmate:update", updateHandler);

      // Fetch latest session for relative time display
      db.getLatestSession().then((session) => {
        if (session && session.created_at) {
          const relative = getRelativeTime(new Date(session.created_at).getTime());
          setLastSessionTime(relative);
        }
      });

      return () => {
        window.removeEventListener("thinkmate:update", updateHandler);
      };
    }
  }, [isAuthenticated]);

  function getRelativeTime(timestamp: number) {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "yesterday";
    return `${days} days ago`;
  }

  const handleExitDemo = () => {
    localStorage.removeItem("thinkmate-demo-mode");
    localStorage.removeItem("thinkmate-analysis");
    localStorage.removeItem("thinkmate-tasks");
    localStorage.removeItem("thinkmate-decision");
    localStorage.removeItem("thinkmate-reflections");
    localStorage.removeItem("thinkmate-goals");
    localStorage.removeItem("thinkmate-load-history");
    localStorage.removeItem("thinkmate-session-context");
    window.location.href = "/";
  };

  const displayName = user?.display_name || user?.email?.split("@")[0] || "User";
  const avatarLetter = displayName.trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <span className="relative grid place-items-center w-9 h-9 rounded-xl bg-[var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)] transition-transform group-hover:scale-105">
                <Brain className="w-5 h-5" strokeWidth={2.4} />
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-[15px] font-semibold tracking-tight">ThinkMate</span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Second Brain</span>
              </span>
            </Link>

            {/* Demo Mode Pill */}
            {isDemo && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning border border-warning/20">
                Demo Mode
                <button
                  onClick={handleExitDemo}
                  className="hover:bg-warning/20 rounded-full w-4 h-4 grid place-items-center font-bold text-[10px]"
                >
                  ×
                </button>
              </span>
            )}
          </div>

          {!hideNav && (
            <>
              <nav className="hidden md:flex items-center gap-1">
                {nav.slice(1).map((n) => {
                  const active = pathname === n.to;
                  const Icon = n.icon;
                  return (
                    <Link
                      key={n.to}
                      to={n.to}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {n.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex items-center gap-4">
                {isAuthenticated && (
                  <div className="hidden sm:flex flex-col text-right leading-tight">
                    <span className="text-xs font-semibold text-foreground">Hi, {displayName}</span>
                    {lastSessionTime && (
                      <span className="text-[10px] text-muted-foreground">Last session: {lastSessionTime}</span>
                    )}
                  </div>
                )}

                <Link
                  to="/brain-dump"
                  onClick={() => localStorage.removeItem("thinkmate-demo-mode")}
                  className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <PenLine className="w-4 h-4" /> New dump
                </Link>

                {/* Authenticated Dropdown */}
                {isAuthenticated ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="w-9 h-9 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center hover:opacity-90 active:scale-95 transition-transform"
                    >
                      {avatarLetter}
                    </button>
                    {showDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowDropdown(false)}
                        />
                        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-card p-1.5 shadow-[var(--shadow-soft)] ring-1 ring-black/5 z-50 animate-slide-up">
                          <div className="px-3 py-2 border-b border-border/60 text-xs text-muted-foreground truncate">
                            {user?.email}
                          </div>
                          <Link
                            to="/dashboard"
                            onClick={() => setShowDropdown(false)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                          >
                            <UserIcon className="w-4 h-4" /> My Dashboard
                          </Link>
                          <button
                            onClick={() => {
                              setShowDropdown(false);
                              signOut().then(() => navigate({ to: "/" }));
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-risk hover:bg-risk/10 transition-colors text-left"
                          >
                            <LogOut className="w-4 h-4" /> Sign out
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  !isDemo && (
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent text-foreground transition-colors"
                    >
                      Sign In
                    </Link>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {!hideNav && (
        <nav className="md:hidden sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="grid grid-cols-5">
            {mobileNav.map((n) => {
              const active = pathname === n.to;
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
