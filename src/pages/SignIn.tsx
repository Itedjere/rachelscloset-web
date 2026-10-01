import { useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import ActionProblem from "../components/ActionProblem";
import AuthFrame, { type AuthPoint, IconField } from "../components/AuthFrame";
import Icon from "../components/Icon";
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
    <AuthFrame headline={<>Welcome back to the <em>house</em>.</>} points={POINTS}>
      <p className="auth-eyebrow">
        <Icon name="key" size={16} /> Sign in
      </p>
      <h1>Good to see you again</h1>
      <p className="auth-lede">Your phone number, then your six secret numbers.</p>

      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="identifier">Phone number</label>
          <IconField icon="phone">
            <input
              id="identifier"
              name="identifier"
              ref={phoneRef}
              /* `tel`, so the phone opens its numeric keypad rather than a full
                 keyboard. The same reason the PIN is six digits at all. */
              type="tel"
              inputMode="tel"
              autoComplete="username"
              placeholder="0803 000 0000"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </IconField>
        </div>

        <div className="field">
          <span className="label-with-icon">
            <Icon name="lock" size={16} /> Your 6-digit PIN
          </span>
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

        <ActionProblem message={problem} />

        <button type="submit" className="btn block btn-hero" disabled={busy || pin.length < 6}>
          {busy ? "Signing in…" : "Sign in"}
          {busy ? null : <Icon name="arrow" size={18} />}
        </button>
      </form>

      {/* Nothing here sends a reset by SMS or email, so this leads to the
          phone number to ring rather than to a form. */}
      <p className="auth-forgot">
        <Link to="/forgot">Forgot your PIN?</Link>
      </p>

      <div className="auth-divider">
        <span>Other ways in</span>
      </div>

      <div className="auth-doors">
        {/*
          The door for a spoken claim code. Before this, nothing anywhere linked
          to /claim, so somebody holding six digits from her tailor had nowhere
          to type them. Sign-in is where she lands when she does not know where
          else to go, and a whole tile rather than a line of small print,
          because it is a whole way in, not a footnote.
        */}
        <Link className="auth-door" to="/claim">
          <span className="auth-door__icon">
            <Icon name="chat" size={20} />
          </span>
          <span>
            <strong>My tailor read me six numbers</strong>
            <span>Set up the account she made for you.</span>
          </span>
        </Link>

        {/* The other way in. Before the sign-up page existed, a tailor had no
            way to put herself on the platform at all. */}
        <Link className="auth-door" to="/join">
          <span className="auth-door__icon">
            <Icon name="spark" size={20} />
          </span>
          <span>
            <strong>New here? Make an account</strong>
            <span>For tailors, and for anybody having clothes made.</span>
          </span>
        </Link>
      </div>
    </AuthFrame>
  );
}

/* What the place is for, said in pictures to somebody who may only have
   scanned a code on a card. */
const POINTS: AuthPoint[] = [
  { icon: "eye", title: "Watch it being made", text: "See each stage of your clothes the moment it is done." },
  { icon: "bell", title: "Your phone tells you", text: "No more walking to the shop to find nothing has started." },
  { icon: "shield", title: "Your money is safe", text: "We can hold it until the clothes are in your hands." },
];
