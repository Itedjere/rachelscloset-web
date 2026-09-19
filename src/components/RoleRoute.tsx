import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { Role } from "../types/api";

/**
 * A route only certain roles may reach.
 *
 * The server enforces this too -- every admin endpoint sits behind the `role`
 * middleware -- so this is about not showing somebody a page that will only
 * refuse them, not about security.
 */
export default function RoleRoute({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/sign-in" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
