import { useEffect, useRef, useState } from "react";
import ActionProblem from "../components/ActionProblem";
import PinInput from "../components/PinInput";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api, errorMessage } from "../lib/api";
import type { ClaimPreview, User } from "../types/api";

/**
 * Setting up an account a tailor created for you.
 *
 * Reached by scanning a QR off the tailor's screen, by a WhatsApp link, or by
 * typing six digits she read down the phone. The person arriving here has no
 * account, may never have had one, and is quite likely doing this on a
 * borrowed phone in a shop -- so it asks for as little as it can.
 *
 * The link identifies the account on its own, so that route goes straight to
 * choosing a PIN. The spoken code does not, and it is ALSO six digits -- so
 * that route is two steps: the numbers she was read, checked and answered
 * with her own name, and only then the numbers she chooses. Two rows of six
 * boxes on one screen, told apart only by their labels, is exactly the
 * mistake this platform's users are most likely to make.
 */
export default function Claim() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { adoptSession } = useAuth();

  // Set by the link on arrival, or by a checked code at the end of step one.
  const [preview, setPreview] = useState<ClaimPreview | null>(null);
  const [checking, setChecking] = useState(Boolean(token));

  // Only needed on the spoken-code route; the link identifies the row alone.
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const phoneRef = useRef<HTMLInputElement>(null);

  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const confirmRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    void api
      .get<{ data: ClaimPreview }>(`/claim/${token}`)
      .then((response) => setPreview(response.data))
      .catch(() => setProblem("That link has expired. Ask your tailor for a new one."))
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
      const response = await api.post<{ data: ClaimPreview }>("/claim/check", { code, phone });
      setPreview(response.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
      // Cleared, so the six boxes are empty for the next try rather than
      // holding a wrong code she has to delete digit by digit.
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  /** Back to step one, for "that is not my name". */
  function startAgain() {
    setPreview(null);
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
      const response = await api.post<{ token: string; user: User }>("/claim", {
        ...(token ? { token } : { code, phone }),
        pin,
        pin_confirmation: confirm,
      });

      // Claiming signs her in; there is no reason to make her type the PIN
      // she chose four seconds ago.
      adoptSession(response.token, response.user);
      navigate("/", { replace: true });
    } catch (error: unknown) {
      setProblem(errorMessage(error));
      setBusy(false);
    }
  }

  if (checking) return <p className="empty">Checking…</p>;

  /* ---- Step one of the spoken route: the numbers she was read. ---------- */

  if (!token && !preview) {
    return (
      <div className="card auth-card">
        <p className="hint">Step 1 of 2</p>
        <h1>Your tailor read you six numbers</h1>
        <p className="hint">Type your phone number, then the six numbers she gave you.</p>


        <form onSubmit={(event) => void checkCode(event)}>
          {/* Six digits are not unique on their own, so they only mean
              anything next to the number they were issued for. */}
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
            <span>The six numbers your tailor read to you</span>
            {/* The sixth digit checks it, the same way the sixth digit of a
                PIN signs somebody in -- no button to find afterwards. */}
            <PinInput
              label="The six numbers your tailor read to you"
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
      </div>
    );
  }

  /* ---- Choosing her PIN: the link route, or step two of the spoken one. -- */

  return (
    <div className="card auth-card">
      {!token ? <p className="hint">Step 2 of 2</p> : null}
      <h1>{preview ? `Hello, ${preview.name}` : "Set up your account"}</h1>

      <p className="hint">
        {preview?.invited_by
          ? `${preview.invited_by_business ?? preview.invited_by} started an account for you.
             Now choose your own six secret numbers. You will use them to sign in.`
          : "Now choose your own six secret numbers. You will use them to sign in."}
      </p>

      {/* Her own name is the check that she typed the right phone number. */}
      {!token ? (
        <button type="button" className="btn quiet" onClick={startAgain} style={{ marginBottom: 12 }}>
          That is not my name
        </button>
      ) : null}


      <form onSubmit={submit}>
        {/*
          inputMode numeric, so a phone shows the big keypad rather than a
          full keyboard. The whole reason the secret is six digits is that a
          keypad asks nothing of somebody who reads poorly.
        */}
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

        {/*
          Said before she taps, not after. Claiming through her tailor's
          invitation lets that tailor keep seeing the measurements -- which
          is the point, but it is consent, so it has to be legible and it has
          to be reversible. The spoken route used to skip this sentence
          entirely, because it had no preview to name the tailor from.
        */}
        {preview?.invited_by ? (
          <p className="hint">
            This lets {preview.invited_by_business ?? preview.invited_by} keep seeing your
            measurements. You can stop that at any time from “Who can see my measurements”.
          </p>
        ) : null}

        <ActionProblem message={problem} />

        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Setting up…" : "This is my account"}
        </button>
      </form>
    </div>
  );
}
