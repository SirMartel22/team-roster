import { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./authContext";

export const AuthProvider = ({ children }) => {
  // token: the JWT returned from login, stored in memory (not persistent yet)
  // user: the user object returned from login (id, email, name, role, etc.)
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Ntracks whether we've finished checking localStorage for an
  // existing session yet. Prevents the app from briefly flashing the
  // login form while we're still verifying a stored token.
  const [isInitializing, setIsInitializing] = useState(true);

  // on first mount, check if a token already exists in localStorage
  // from a previous session, and if so, verify it's still valid by
  // calling auth-service's /me route.

  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem("authToken");
      const cachedUserValue = localStorage.getItem("authUser");
      let cachedUser = null;
      try { cachedUser = cachedUserValue ? JSON.parse(cachedUserValue) : null; } catch { localStorage.removeItem("authUser"); }

      if (!storedToken) {
        //No stored session at all - nothing to restore

        setIsInitializing(false);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_AUTH_SERVICE_URL}/me`,
          {
            headers: { Authorization: `Bearer ${storedToken}` },
            cache: "no-store",
          },
        );

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("authToken");
          localStorage.removeItem("authUser");
          setIsInitializing(false);
          return;
        }
        if (!response.ok) throw new Error("Session verification is temporarily unavailable");

        const data = await response.json();

        // Recall /me returns { message, user: { userId, churchId, role } }
        // (the decoded JWT payload) — restore both token and user state.

        setToken(storedToken);
        setUser(data.user);
        localStorage.setItem("authUser", JSON.stringify(data.user));
      } catch (error) {
        console.error("Failed to restore session:", error);
        if (cachedUser) {
          setToken(storedToken);
          setUser(cachedUser);
        }
      } finally {
        setIsInitializing(false);
      }
    };

    restoreSession();
  }, []);

  // Login function - calls auth-service's /login endpoint
  const login = useCallback(async (workspaceSlug, email, password) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_AUTH_SERVICE_URL}/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceSlug, email, password }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Login failed");
      }

      const data = await response.json();

      //   persist the token so it survives a page reload
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("authUser", JSON.stringify(data.user));

      // Store the token and user info in state
      setToken(data.token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // logout function - clear token and user from state
  const logout = useCallback(async () => {
    let revoked = !token;
    let message = "Signed out successfully";
    try {
      if (token) {
        const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json().catch(() => ({}));
        revoked = response.ok;
        message = data.message || (response.ok ? message : "You were signed out on this device, but server revocation could not be confirmed.");
      }
    } catch {
      revoked = false;
      message = "You were signed out on this device, but server revocation could not be confirmed.";
    } finally {
    // NEW: clear the persisted token too, not just in-memory state —
    // otherwise a reload after logout would silently restore the
    // "logged out" session right back.
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      setToken(null);
      setUser(null);
    }
    return { revoked, message };
  }, [token]);

  const value = {
    token,
    user,
    isLoading,
    isInitializing,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
