import { useCallback, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken } from "../lib/api";
import type { User } from "../types/api";
import { AuthContext } from "./authContext";

interface MeResponse {
  user: User;
}

interface LoginResponse {
  token: string;
  user: User;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    api
      .get<MeResponse>("/me")
      .then((response) => {
        if (!cancelled) setUser(response.user);
      })
      .catch(() => {
        // A token the API no longer honours -- expired, revoked, or a suspended
        // account. Drop it rather than retrying into the same 401 forever.
        setToken(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (identifier: string, pin: string) => {
    const response = await api.post<LoginResponse>("/login", { identifier, pin });
    setToken(response.token);
    setUser(response.user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post("/logout");
    } catch {
      // Already gone as far as this browser is concerned; the token is dropped
      // either way rather than leaving somebody apparently signed in.
    }

    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut }),
    [user, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
