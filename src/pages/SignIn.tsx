import { useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import PinInput from "../components/PinInput";
import { useAuth } from "../hooks/useAuth";
import { ApiError, errorMessage } from "../lib/api";

export default function SignIn() {
  const { user, signIn } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);

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

  /**
   * The sixth digit signs her in.
   *
   * Unless there is no phone number yet -- somebody who taps the PIN first
   * would otherwise get "these details do not match" for a field she has not
   * filled in. Sending her back to it says the true thing.
   */
  async function complete() {
    if (identifier.trim() === "") {
      phoneRef.current?.focus();

      return;
    }

    await submit(new Event("submit") as unknown as React.FormEvent);
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
            ref={phoneRef}
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
          <span>Your 6-digit PIN</span>
          {/*
            The sixth digit signs her in. Nobody who has just tapped a keypad
            six times should then have to find a button, and the form's own
            validation still runs -- requestSubmit refuses if the phone
            number above is empty and points at it instead.
          */}
          <PinInput
            label="Your 6-digit PIN"
            autoComplete="current-password"
            value={pin}
            onChange={setPin}
            onComplete={() => void complete()}
          />
        </div>

        <button type="submit" className="btn block" disabled={busy || pin.length < 6}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {/*
        The door for a spoken claim code. Before this, nothing anywhere linked
        to /claim, so somebody holding six digits from her tailor had nowhere
        to type them. Sign-in is where she lands when she does not know where
        else to go, and a button rather than a line of small print, because it
        is a whole way in, not a footnote.
      */}
      <Link className="btn quiet block" to="/claim" style={{ marginTop: 12 }}>
        My tailor read me six numbers
      </Link>
    </div>
  );
}
