import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import api, { setAuthToken } from "../api/client";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    let ok = false;
    try {
      const { data } = await api.get("/user/me");
      setUser(data);
      ok = true;
    } catch {
      setUser(null);
      setAuthToken(null);
    } finally {
      setLoading(false);
    }
    return ok;
  }

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      setLoading(false);
      return;
    }
    refreshMe();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(token) {
        setAuthToken(token);
        const ok = await refreshMe();
        if (!ok) {
          throw new Error(
            "Login succeeded but profile could not load. Check API (npm run dev in api) and /user/me."
          );
        }
      },
      logout() {
        setAuthToken(null);
        setUser(null);
      },
      refreshMe,
    }),
    [user, loading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error("AuthProvider missing");
  return v;
}
