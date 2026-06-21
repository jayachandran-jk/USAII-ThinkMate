import { useEffect, useState, createContext, useContext } from "react";
import { localSignIn, localSignUp, localSignOut, localGetCurrentUser } from "./db";

export type UserProfile = {
  id: string;
  email: string;
  display_name: string;
};

// Expose a globally listened update event for token changes
const AUTH_EVENT = "thinkmate:auth_update";

function triggerAuthUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT));
  }
}

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const syncState = async () => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem("thinkmate-session-token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const activeUser = await localGetCurrentUser();
      if (activeUser) {
        setUser({
          id: activeUser.id,
          email: activeUser.email,
          display_name: activeUser.display_name,
        });
        window.localStorage.setItem("thinkmate-user-id", activeUser.id);
        window.localStorage.setItem("thinkmate-display-name", activeUser.display_name);
      } else {
        // Clear expired session
        setUser(null);
        window.localStorage.removeItem("thinkmate-session-token");
        window.localStorage.removeItem("thinkmate-user-id");
        window.localStorage.removeItem("thinkmate-display-name");
      }
    } catch (err) {
      console.error("Auth sync error:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncState();
    
    if (typeof window !== "undefined") {
      window.addEventListener(AUTH_EVENT, syncState);
      return () => {
        window.removeEventListener(AUTH_EVENT, syncState);
      };
    }
  }, []);

  const signIn = async (email: string, password_plain: string) => {
    setLoading(true);
    try {
      const res = await localSignIn(email, password_plain);
      if (res && res.sessionToken) {
        window.localStorage.setItem("thinkmate-session-token", res.sessionToken);
        window.localStorage.setItem("thinkmate-user-id", res.user.id);
        window.localStorage.setItem("thinkmate-display-name", res.user.display_name || "");
        setUser({
          id: res.user.id,
          email: res.user.email,
          display_name: res.user.display_name || "",
        });
        triggerAuthUpdate();
        window.dispatchEvent(new CustomEvent("thinkmate:update"));
        return { error: null };
      }
      return { error: new Error("Authentication failed") };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password_plain: string, displayName: string) => {
    setLoading(true);
    try {
      const res = await localSignUp(email, password_plain, displayName);
      if (res && res.sessionToken) {
        window.localStorage.setItem("thinkmate-session-token", res.sessionToken);
        window.localStorage.setItem("thinkmate-user-id", res.user.id);
        window.localStorage.setItem("thinkmate-display-name", res.user.display_name || "");
        setUser({
          id: res.user.id,
          email: res.user.email,
          display_name: res.user.display_name || "",
        });
        triggerAuthUpdate();
        window.dispatchEvent(new CustomEvent("thinkmate:update"));
        return { error: null };
      }
      return { error: new Error("Sign up failed") };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await localSignOut();
    } catch (e) {
      console.error("Server sign out failed:", e);
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("thinkmate-session-token");
      window.localStorage.removeItem("thinkmate-analysis");
      window.localStorage.removeItem("thinkmate-tasks");
      window.localStorage.removeItem("thinkmate-decision");
      window.localStorage.removeItem("thinkmate-reflections");
      window.localStorage.removeItem("thinkmate-goals");
      window.localStorage.removeItem("thinkmate-load-history");
      window.localStorage.removeItem("thinkmate-session-context");
      window.localStorage.removeItem("thinkmate-demo-mode");
      window.localStorage.removeItem("thinkmate-user-id");
      window.localStorage.removeItem("thinkmate-display-name");
    }

    setUser(null);
    triggerAuthUpdate();
    window.dispatchEvent(new CustomEvent("thinkmate:update"));
    setLoading(false);
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
  };
}
