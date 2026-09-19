import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // Nothing is rendered while the stored token is being checked. Redirecting
  // first would bounce a signed-in person to the sign-in page on every reload.
  if (loading) return null;

  if (!user) return <Navigate to="/sign-in" replace />;

  return <>{children}</>;
}
