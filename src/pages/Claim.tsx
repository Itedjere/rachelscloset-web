import { useEffect, useRef, useState } from "react";
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
 * borrowed phone in a shop -- so it asks for exactly two things: a PIN, and
 * confirmation of it.
 */
export default function Claim() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { adoptSession } = useAuth();

  const [preview, setPreview] = useState<ClaimPreview | null>(null);
  const [checking, setChecking] = useState(Boolean(token));

  // Only needed on the spoken-code route; the link identifies the row alone.
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

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

  return (
    <div className="card auth-card">
      <h1>{preview ? `Hello, ${preview.name}` : "Set up your account"}</h1>

      <p className="hint">
        {preview?.invited_by
          ? `${preview.invited_by_business ?? preview.invited_by} started an account for you.
             Choose a secret number and it is yours.`
          : "Choose a secret number and the account is yours."}
      </p>

      {problem ? <p className="notice bad">{problem}</p> : null}

      <form onSubmit={submit}>
        {/* The spoken-code route. Six digits are not unique on their own, so
            they only mean anything next to the number they were issued for. */}
        {!token ? (
          <>
            <label className="field">
              <span>Your phone number</span>
              <input
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
              <PinInput
                label="The six numbers you were read"
                autoComplete="one-time-code"
                value={code}
                onChange={setCode}
              />
            </label>
          </>
        ) : null}

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
          to be reversible.
        */}
        {preview?.invited_by ? (
          <p className="hint">
            This lets {preview.invited_by_business ?? preview.invited_by} keep seeing your
            measurements. You can stop that at any time from “Who can see my measurements”.
          </p>
        ) : null}

        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Setting up…" : "This is my account"}
        </button>
      </form>
    </div>
  );
}
