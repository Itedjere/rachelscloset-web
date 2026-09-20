import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
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

  return (
    <div className="card auth-card">
      <h1>{name ? `Hello, ${name}` : "Choose a new number"}</h1>

      <p className="hint">
        Pick six numbers you will remember. You will use them to sign in from now on.
      </p>

      {problem ? <p className="notice bad">{problem}</p> : null}

      <form onSubmit={submit}>
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
              <span>The six numbers you were given</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                required
              />
            </label>
          </>
        ) : null}

        <label className="field">
          <span>Choose six numbers</span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            pattern="\d{6}"
            maxLength={6}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
            required
          />
        </label>

        <label className="field">
          <span>Type them again</span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            pattern="\d{6}"
            maxLength={6}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value.replace(/\D/g, ""))}
            required
          />
        </label>

        {/* Said before she taps, because it is the surprising part: any
            phone still signed in as her will be signed out. */}
        <p className="hint">
          Anywhere else you are signed in will be signed out.
        </p>

        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Saving…" : "Use this number"}
        </button>
      </form>
    </div>
  );
}
