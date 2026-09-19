import { useAuth } from "../hooks/useAuth";

/*
 * A placeholder, and honest about it. The dashboard belongs to the sections
 * that build orders and the step tracker; putting something invented here now
 * would only have to be torn out.
 */
export default function Home() {
  const { user } = useAuth();

  return (
    <>
      <div className="page-head">
        <h1>Hello, {user?.name}</h1>
        <p>You are signed in as a {user?.role}.</p>
      </div>

      <div className="card">
        <p style={{ margin: 0 }}>
          Orders and the production tracker are not built yet. What works today is
          notifications: the bell above, and the alert settings beside it.
        </p>
      </div>
    </>
  );
}
