import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiMe, apiRefresh, apiLogout } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // We never store the HttpOnly token in JS — the browser holds it in the
  // cookie jar automatically. We only store who the user IS (name + id) so
  // the UI can personalise itself without an extra network call every render.
  const [user, setUser] = useState(() => {
    const fullName = localStorage.getItem("full_name");
    const userId   = localStorage.getItem("user_id");
    const storedRole = localStorage.getItem("is_admin");
    const isAdmin = storedRole === "true";
    return fullName || userId || storedRole !== null
      ? { fullName, userId, isAdmin }
      : null;
  });
  const initialUser = useRef(user);

  // true while we're verifying the session cookie on first mount
  const [checking, setChecking] = useState(() => !!user);
  const navigate = useNavigate();

  // On every page load, ask the backend if the cookie is still valid.
  // If the access token is expired, apiMe returns null and we try refresh.
  // If refresh also fails, we clear local state and send them to /login.
  useEffect(() => {
    let cancelled = false;

    if (!initialUser.current) return () => { cancelled = true; };

    async function verifySession() {
      try {
        // 1. Try /auth/me with the current access token cookie
        const data = await apiMe();

        if (cancelled) return;

        if (data && data.user_id) {
          // Cookie is valid — sync local state with whatever the server says
          const fresh = { fullName: data.full_name, userId: String(data.user_id), email: data.email, isAdmin: !!data.is_admin };
          setUser(fresh);
          localStorage.setItem("full_name", data.full_name);
          localStorage.setItem("user_id",   String(data.user_id));
          localStorage.setItem("is_admin", String(!!data.is_admin));
        } else {
          // access token cookie missing or invalid → try refresh
          try {
            const refreshed = await apiRefresh();
            if (cancelled) return;
            if (refreshed && refreshed.user_id) {
              const fresh = { fullName: refreshed.full_name, userId: String(refreshed.user_id), email: refreshed.email, isAdmin: !!refreshed.is_admin };
              setUser(fresh);
              localStorage.setItem("full_name", refreshed.full_name);
              localStorage.setItem("user_id",   String(refreshed.user_id));
              localStorage.setItem("is_admin", String(!!refreshed.is_admin));
            } else {
              clearLocal();
            }
          } catch {
            clearLocal();
          }
        }
      } catch {
        // Network error — keep whatever state we have so the UI doesn't
        // flicker; the next API call will surface the real error.
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    verifySession();
    return () => { cancelled = true; };
  }, []);

  function clearLocal() {
    localStorage.removeItem("full_name");
    localStorage.removeItem("user_id");
    localStorage.removeItem("is_admin");
    setUser(null);
  }

  function login(data) {
    // data = { message, user_id, full_name }  — NO access_token in the body
    // The access + refresh cookies were already set by the server on this response.
    const fresh = {
      fullName: data.full_name,
      userId: String(data.user_id),
      email: data.email,
      isAdmin: !!data.is_admin,
    };
    setUser(fresh);
    localStorage.setItem("full_name", data.full_name);
    localStorage.setItem("user_id",   String(data.user_id));
    localStorage.setItem("is_admin", String(!!data.is_admin));
    navigate(data.is_admin ? "/dashboard" : "/");
  }

  function updateProfile(data) {
    setUser(current => current ? {
      ...current,
      fullName: data.full_name,
      email: data.email,
      isAdmin: !!data.is_admin,
    } : current);
    localStorage.setItem("full_name", data.full_name);
    localStorage.setItem("is_admin", String(!!data.is_admin));
  }

  const isAdmin = !!user?.isAdmin || localStorage.getItem("is_admin") === "true";

  async function logout() {
    try { await apiLogout(); } catch { /* ignore network errors on logout */ }
    clearLocal();
    navigate("/");
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile, isAdmin, isLoggedIn: !!user, checking }}>
      {children}
    </AuthContext.Provider>
  );
}

// Context hooks are intentionally colocated with their providers.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}