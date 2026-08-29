import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Navigate, useLocation } from "react-router";
import { ApiError, api, getToken, setToken } from "./api";
import type { Role, User } from "../domain/types";

/**
 * Session state for the client.
 *
 * The role held here decides only what to *render*. Authorization is enforced
 * by the API on every request (10-AUTH-RBAC.md), so tampering with this state
 * — or with localStorage — grants nothing.
 */

type SessionUser = { id: string; name: string; email: string; role: Role };

type AuthValue = {
  user: User | null;
  /** True until the stored token has been checked against the API. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SessionUser>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

function toUser(u: SessionUser): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatarInitials: u.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Re-hydrate a stored token on boot; the API decides whether it is still valid.
  useEffect(() => {
    let cancelled = false;
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<SessionUser>("/auth/me")
      .then((u) => {
        if (!cancelled) setUser(toUser(u));
      })
      .catch(() => {
        // Expired, revoked, or the API is down — drop the token either way.
        setToken(null);
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: SessionUser }>("/auth/login", {
      email,
      password,
    });
    setToken(res.token);
    setUser(toUser(res.user));
    return res.user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      // A dead session is already logged out as far as the user is concerned.
      if (!(e instanceof ApiError)) throw e;
    }
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signOut }), [user, loading, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}

export const isAdminRole = (r: Role) => r === "academic_admin" || r === "super_admin";

/** Where each role lands after signing in. */
export function homeFor(role: Role): string {
  return isAdminRole(role) || role === "instructor" ? "/admin/dashboard" : "/belajar/dashboard";
}

function Memuat() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--color-muted)",
        fontSize: 16,
      }}
    >
      Memuat sesi…
    </div>
  );
}

export function RequireRole({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Never redirect before the stored token has been checked, otherwise a
  // refresh on a portal page bounces the user to /login for no reason.
  if (loading) return <Memuat />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!allow.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}
