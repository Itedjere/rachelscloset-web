import { useEffect, useRef, useState } from "react";
import ActionProblem from "../components/ActionProblem";
import PinInput from "../components/PinInput";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api, errorMessage } from "../lib/api";
import type { User } from "../types/api";

/**
 * Choosing a new secret number.
 *
 * Reached by a link an admin sent on WhatsApp, or by typing six digits read
 * down a phone call. The person arriving here is locked out of her own
 * business and quite possibly worried about it, so the page asks for the
 * fewest things it can and says plainly what will happen.
 *
 * The spoken route is two steps, for the same reason as the claim page: the
 * six numbers she was given and the six she is choosing look identical, and
 * on one screen only their labels told them apart. The code is checked first
 * and answered with her own name; only then does she see the PIN boxes.
 */
export default function PinReset() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { adoptSession } = useAuth();

  const [name, setName] = useState<string | null>(null);
  const [checking, setChecking] = useState(Boolean(token));

  // Only needed on the spoken-code route; the link identifies the row alone.
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeChecked, setCodeChecked] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);

  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const confirmRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    void api
      .get<{ data: { name: string | null } }>(`/reset/${token}`)
      .then((response) => setName(response.data.name))
      .catch(() => setProblem("That link has expired. Ask for a new one."))
      .finally(() => setChecking(false));
  }, [token]);

  /** Step one of the spoken route: is this the right code for this number? */
  async function checkCode(event?: React.FormEvent) {
    event?.preventDefault();

    if (phone.trim() === "") {
      phoneRef.current?.focus();

      return;
    }

    setBusy(true);
    setProblem(null);

    try {
      const response = await api.post<{ data: { name: string } }>("/reset/check", { code, phone });
      setName(response.data.name);
      setCodeChecked(true);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
      // Empty boxes for the next try, rather than a wrong code to delete.
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  function startAgain() {
    setCodeChecked(false);
    setName(null);
    setCode("");
    setPin("");
    setConfirm("");
    setProblem(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setProblem(null);

    try {
      const response = await api.post<{ token: string; user: User }>("/reset", {
        ...(token ? { token } : { code, phone }),
        pin,
        pin_confirmation: confirm,
      });

      adoptSession(response.token, response.user);
      navigate("/", { replace: true });
    } catch (error: unknown) {
      setProblem(errorMessage(error));
      setBusy(false);
    }
  }

  if (checking) return <p className="empty">Checking…</p>;

  /* ---- Step one of the spoken route: the numbers she was given. --------- */

  if (!token && !codeChecked) {
    return (
      <div className="card auth-card">
        <p className="hint">Step 1 of 2</p>
        <h1>Rachel's Closet gave you six numbers</h1>
        <p className="hint">Type your phone number, then the six numbers you were given.</p>


        <form onSubmit={(event) => void checkCode(event)}>
          <label className="field">
            <span>Your phone number</span>
            <input
              ref={phoneRef}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>The six numbers you were given</span>
            <PinInput
              label="The six numbers you were given"
              autoComplete="one-time-code"
              value={code}
              onChange={setCode}
              onComplete={() => void checkCode()}
            />
          </label>

          <ActionProblem message={problem} />

          <button type="submit" className="btn" disabled={busy || code.length !== 6}>
            {busy ? "Checking…" : "Next"}
          </button>
        </form>

        {/* Somebody who landed here without a code needs the phone number,
            not a form she cannot fill in. */}
        <p style={{ marginTop: 16 }}>
          <Link to="/forgot">I have not been given six numbers</Link>
        </p>
      </div>
    );
  }

  /* ---- Choosing the new PIN: the link route, or step two. -------------- */

  return (
    <div className="card auth-card">
      {!token ? <p className="hint">Step 2 of 2</p> : null}
      <h1>{name ? `Hello, ${name}` : "Choose a new number"}</h1>

      <p className="hint">
        Now choose your own six secret numbers. You will use them to sign in from now on.
      </p>

      {/* Her own name is the check that she typed the right phone number. */}
      {!token ? (
        <button type="button" className="btn quiet" onClick={startAgain} style={{ marginBottom: 12 }}>
          That is not my name
        </button>
      ) : null}


      <form onSubmit={submit}>
        <label className="field">
          <span>Choose six numbers</span>
          {/* Six here moves to the confirmation rather than submitting:
              the second row is the whole point of asking twice. */}
          <PinInput
            label="Choose six numbers"
            autoComplete="new-password"
            value={pin}
            onChange={setPin}
            onComplete={() => confirmRef.current?.querySelector("input")?.focus()}
            autoFocus
          />
        </label>

        <label className="field">
          <span>Type them again</span>
          <div ref={confirmRef}>
            <PinInput
              label="Type them again"
              autoComplete="new-password"
              value={confirm}
              onChange={setConfirm}
            />
          </div>
        </label>

        {/* Said before she taps, because it is the surprising part: any
            phone still signed in as her will be signed out. */}
        <p className="hint">
          Anywhere else you are signed in will be signed out.
        </p>

        <ActionProblem message={problem} />

        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Saving…" : "Use this number"}
        </button>
      </form>
    </div>
  );
}
