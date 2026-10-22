import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiMe, apiRefresh, apiLogout } from "../services/api.js";

const AuthContext = createContext(null);
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const LAST_ACTIVITY_KEY = "last_activity_at";
const LOGIN_MODE_KEY = "login_mode";

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
  const [loginMode, setLoginMode] = useState(() => {
    const savedMode = localStorage.getItem(LOGIN_MODE_KEY);
    if (savedMode === "admin" || savedMode === "user") return savedMode;
    return "user";
  });
  const initialUser = useRef(user);
  const logoutStarted = useRef(false);

  // true while we're verifying the session cookie on first mount
  const [checking, setChecking] = useState(() => !!user);
  const navigate = useNavigate();

  const clearLocal = useCallback(() => {
    logoutStarted.current = true;
    localStorage.removeItem("full_name");
    localStorage.removeItem("user_id");
    localStorage.removeItem("is_admin");
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem(LOGIN_MODE_KEY);
    setLoginMode("user");
    setUser(null);
  }, []);

  // On every page load, ask the backend if the cookie is still valid.
  // If the access token is expired, apiMe returns null and we try refresh.
  // If refresh also fails, we clear local state and send them to /login.
  useEffect(() => {
    let cancelled = false;

    if (!initialUser.current) return () => { cancelled = true; };

    async function verifySession() {
      try {
        const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
        if (lastActivity && Date.now() - lastActivity >= IDLE_TIMEOUT_MS) {
          logoutStarted.current = true;
          await apiLogout();
          if (!cancelled) {
            clearLocal();
            navigate("/");
          }
          return;
        }
        if (!lastActivity) {
          localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
        }

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
  }, [clearLocal, navigate]);

  function login(data, adminMode) {
    // data = { message, user_id, full_name }  — NO access_token in the body
    // The access + refresh cookies were already set by the server on this response.
    const fresh = {
      fullName: data.full_name,
      userId: String(data.user_id),
      email: data.email,
      isAdmin: !!data.is_admin,
    };
    logoutStarted.current = false;
    setUser(fresh);
    localStorage.setItem("full_name", data.full_name);
    localStorage.setItem("user_id",   String(data.user_id));
    localStorage.setItem("is_admin", String(!!data.is_admin));
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    const mode = adminMode ? "admin" : "user";
    setLoginMode(mode);
    localStorage.setItem(LOGIN_MODE_KEY, mode);
    navigate(adminMode ? "/dashboard" : "/");
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

  useEffect(() => {
    if (!user) return undefined;

    let lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || Date.now();
    let lastPersistedActivity = lastActivity;
    let expiryTimer;

    const expireIfIdle = () => {
      if (logoutStarted.current) return;
      const remaining = IDLE_TIMEOUT_MS - (Date.now() - lastActivity);
      if (remaining > 0) {
        expiryTimer = setTimeout(expireIfIdle, remaining);
        return;
      }

      logoutStarted.current = true;
      void apiLogout();
      clearLocal();
      navigate("/");
    };

    const recordActivity = () => {
      const now = Date.now();
      if (now - lastActivity < 1000) return;
      lastActivity = now;
      if (now - lastPersistedActivity >= 5000) {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
        lastPersistedActivity = now;
      }
    };

    const syncActivity = (event) => {
      if (event.key === "full_name" && event.newValue === null) {
        clearTimeout(expiryTimer);
        clearLocal();
        navigate("/");
        return;
      }
      if (event.key === LOGIN_MODE_KEY && event.newValue) {
        setLoginMode(event.newValue === "admin" ? "admin" : "user");
      }
      if (event.key !== LAST_ACTIVITY_KEY || !event.newValue) return;

      const timestamp = Number(event.newValue);
      if (Number.isFinite(timestamp) && timestamp > lastActivity) {
        lastActivity = timestamp;
        lastPersistedActivity = timestamp;
        clearTimeout(expiryTimer);
        expireIfIdle();
      }
    };

    const checkOnVisibility = () => {
      if (document.visibilityState !== "visible") return;
      clearTimeout(expiryTimer);
      expireIfIdle();
    };

    const activityEvents = ["pointerdown", "pointermove", "keydown", "touchstart", "wheel", "scroll"];
    activityEvents.forEach(eventName => window.addEventListener(eventName, recordActivity, { passive: true }));
    window.addEventListener("storage", syncActivity);
    document.addEventListener("visibilitychange", checkOnVisibility);
    expiryTimer = setTimeout(expireIfIdle, Math.max(0, IDLE_TIMEOUT_MS - (Date.now() - lastActivity)));

    return () => {
      clearTimeout(expiryTimer);
      activityEvents.forEach(eventName => window.removeEventListener(eventName, recordActivity));
      window.removeEventListener("storage", syncActivity);
      document.removeEventListener("visibilitychange", checkOnVisibility);
    };
  }, [user, clearLocal, navigate]);

  async function logout() {
    logoutStarted.current = true;
    try { await apiLogout(); } catch { /* ignore network errors on logout */ }
    clearLocal();
    navigate("/");
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile, isAdmin, loginMode, isLoggedIn: !!user, checking }}>
      {children}
    </AuthContext.Provider>
  );
}

// Context hooks are intentionally colocated with their providers.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}