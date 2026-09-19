import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ApiError, errorMessage } from "../lib/api";

export default function SignIn() {
  const { user, signIn } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setProblem(null);

    try {
      await signIn(identifier, pin);
    } catch (error: unknown) {
      setProblem(
        error instanceof ApiError && error.status === 429
          ? `Too many tries. Wait ${error.retryAfter ?? 60} seconds.`
          : errorMessage(error),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card form-card">
      <h1>Sign in</h1>

      <form onSubmit={submit} noValidate>
        {problem ? <p className="notice bad">{problem}</p> : null}

        <div className="field">
          <label htmlFor="identifier">Phone number</label>
          <input
            id="identifier"
            name="identifier"
            /* `tel`, so the phone opens its numeric keypad rather than a full
               keyboard. The same reason the PIN is six digits at all. */
            type="tel"
            inputMode="tel"
            autoComplete="username"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="pin">Your 6-digit PIN</label>
          <input
            id="pin"
            name="pin"
            type="password"
            className="pin"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={6}
            value={pin}
            /* Digits only. A stray letter from a predictive keyboard would
               otherwise fail at the server with nothing visible to explain it. */
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
          />
        </div>

        <button type="submit" className="btn block" disabled={busy || pin.length < 6}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
