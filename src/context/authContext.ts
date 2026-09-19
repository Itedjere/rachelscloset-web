import { createContext } from "react";
import type { User } from "../types/api";

export interface AuthValue {
  user: User | null;
  loading: boolean;
  signIn: (identifier: string, pin: string) => Promise<void>;
  /** For a flow that already holds a token, such as claiming a profile. */
  adoptSession: (token: string, user: User) => void;
  signOut: () => Promise<void>;
  /** Replaces the cached account after an edit, so the header updates too. */
  setUser: (user: User) => void;
}

/*
 * Split from the provider so the context object and the component live in
 * separate modules -- Vite's fast refresh gives up on a file that exports both.
 */
export const AuthContext = createContext<AuthValue | null>(null);
