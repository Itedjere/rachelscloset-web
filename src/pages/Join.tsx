import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import ActionProblem from "../components/ActionProblem";
import AuthFrame, { type AuthPoint, IconField } from "../components/AuthFrame";
import Icon from "../components/Icon";
import PinInput from "../components/PinInput";
import { useAuth } from "../hooks/useAuth";
import { ApiError, api, errorMessage } from "../lib/api";
import type { ResourceResponse, ServerConfig, User } from "../types/api";

type Role = "tailor" | "customer";

/**
 * Making an account -- the door the public site had been missing.
 *
 * The register endpoint has existed since Section 1, but nothing used it:
 * every "Join" on the public site led back to the paragraph it was in, and a
 * tailor could not put herself on the platform at all.
 *
 * She says which she is FIRST, with two big choices, and only then sees the
 * fields that choice needs -- a customer is never asked for a shop name, and
 * nobody reads a form to find out which half applies to them. A phone number
 * and six digits, as everywhere else; no email, which most tailors have never
 * had. `?as=tailor` arrives from the public site's "Join the house".
 */
export default function Join() {
  const { user, adoptSession } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const preset = params.get("as");
  const [role, setRole] = useState<Role | null>(preset === "tailor" || preset === "customer" ? preset : null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [state, setState] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const confirmRef = useRef<HTMLDivElement>(null);

  const [states, setStates] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // The one list the directory filters by, so she can be found in her state.
  useEffect(() => {
    api
      .get<ResourceResponse<ServerConfig>>("/config")
      .then((response) => setStates(response.data.states ?? []))
      .catch(() => setStates([]));
  }, []);

  // Already signed in: nothing to make.
  if (user) return <Navigate to="/" replace />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!role) return;

    setBusy(true);
    setProblem(null);
    setFieldErrors({});

    try {
      const response = await api.post<{ token: string; user: User }>("/register", {
        role,
        name: name.trim(),
        phone,
        pin,
        pin_confirmation: confirm,
        ...(role === "tailor"
          ? { business_name: businessName.trim(), location: location.trim(), state }
          : {}),
      });

      // Signed in at once: she just chose the PIN, there is nothing to prove.
      adoptSession(response.token, response.user);
      navigate("/", { replace: true });
    } catch (error: unknown) {
      if (error instanceof ApiError) setFieldErrors(error.errors ?? {});
      setProblem(errorMessage(error));
      setBusy(false);
    }
  }

  const fieldError = (key: string) =>
    fieldErrors[key] ? <p className="error">{fieldErrors[key][0]}</p> : null;

  const points = role === "tailor" ? TAILOR_POINTS : role === "customer" ? CUSTOMER_POINTS : HOUSE_POINTS;
  const headline =
    role === "tailor" ? (
      <>
        Let the work <em>speak</em> for you.
      </>
    ) : role === "customer" ? (
      <>
        Never wonder <em>again</em>.
      </>
    ) : (
      <>
        Join the Fashion <em>House</em>.
      </>
    );

  /* ---- First: which are you? ---------------------------------------------- */

  if (!role) {
    return (
      <AuthFrame headline={headline} points={points}>
        <Steps at={1} />
        <h1>Join Rachels Closet</h1>
        <p className="auth-lede">Which one are you? Tap it.</p>

        <div className="role-cards">
          <button type="button" className="role-card" onClick={() => setRole("tailor")}>
            <span className="role-card__icon">
              <Icon name="scissors" size={30} />
            </span>
            <span className="role-card__text">
              <strong>I sew</strong>
              <span>Put my shop on Rachels Closet and show customers my work.</span>
            </span>
            <span className="role-card__go">
              <Icon name="arrow" size={20} />
            </span>
          </button>

          <button type="button" className="role-card" onClick={() => setRole("customer")}>
            <span className="role-card__icon role-card__icon--gold">
              <Icon name="hanger" size={30} />
            </span>
            <span className="role-card__text">
              <strong>I want clothes made</strong>
              <span>Watch each stage of my clothes as my tailor finishes it.</span>
            </span>
            <span className="role-card__go">
              <Icon name="arrow" size={20} />
            </span>
          </button>
        </div>

        <p className="auth-foot">
          Already have an account? <Link to="/sign-in">Sign in</Link>
        </p>
      </AuthFrame>
    );
  }

  /* ---- Then: only the fields that choice needs. --------------------------- */

  return (
    <AuthFrame headline={headline} points={points}>
      <Steps at={2} />

      {/* Which door she came through, with the way back beside it -- the
          picture repeated so she can see at a glance she chose right. */}
      <button type="button" className="role-chip" onClick={() => setRole(null)}>
        <Icon name={role === "tailor" ? "scissors" : "hanger"} size={16} />
        <span>{role === "tailor" ? "I sew" : "I want clothes made"}</span>
        <span className="role-chip__change">Change</span>
      </button>

      <h1>{role === "tailor" ? "Put your shop on Rachels Closet" : "Make your account"}</h1>
      <p className="auth-lede">
        {role === "tailor"
          ? "A few things about you and your shop. It takes a minute."
          : "Your name, your number, and six secret numbers. That is all."}
      </p>

      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="join-name">Your name</label>
          <IconField icon="user">
            <input
              id="join-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={120}
              placeholder="Ngozi Okafor"
            />
          </IconField>
          {fieldError("name")}
        </div>

        <div className="field">
          <label htmlFor="join-phone">Your phone number</label>
          <IconField icon="phone">
            <input
              id="join-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0803 000 0000"
            />
          </IconField>
          <p className="hint">This is how you sign in. Nothing is sent to it.</p>
          {fieldError("phone")}
        </div>

        {role === "tailor" ? (
          <fieldset className="auth-group">
            <legend>
              <Icon name="store" size={16} /> Your shop
            </legend>

            <div className="field">
              <label htmlFor="join-shop">The name of your shop</label>
              <IconField icon="store">
                <input
                  id="join-shop"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Mama Ngozi Couture"
                  maxLength={160}
                />
              </IconField>
              {fieldError("business_name")}
            </div>

            <div className="field">
              <label htmlFor="join-where">Where is it? (area or town)</label>
              <IconField icon="pin">
                <input
                  id="join-where"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Rumuodara, Port Harcourt"
                  maxLength={160}
                />
              </IconField>
              {fieldError("location")}
            </div>

            <div className="field">
              <label htmlFor="join-state">Your state</label>
              {/* A list, not a text box: people find tailors by state, and the
                  search only matches it spelled exactly this way. */}
              <IconField icon="map">
                <select id="join-state" value={state} onChange={(e) => setState(e.target.value)}>
                  <option value="">Choose your state</option>
                  {states.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </IconField>
              <p className="hint">Customers near you find you by this.</p>
              {fieldError("state")}
            </div>
          </fieldset>
        ) : null}

        <fieldset className="auth-group">
          <legend>
            <Icon name="lock" size={16} /> Your secret numbers
          </legend>

          <div className="field">
            <span>Choose six numbers</span>
            <PinInput
              label="Choose six secret numbers"
              autoComplete="new-password"
              value={pin}
              onChange={setPin}
              onComplete={() => confirmRef.current?.querySelector("input")?.focus()}
            />
            <p className="hint">
              You will use them to sign in. Not 123456 or 111111, and not part of your phone number.
            </p>
            {fieldError("pin")}
          </div>

          <div className="field">
            <span>Type them again</span>
            <div ref={confirmRef}>
              <PinInput label="Type them again" autoComplete="new-password" value={confirm} onChange={setConfirm} />
            </div>
            {/* Said as soon as all six are in, not after a round trip. */}
            {confirm.length === 6 ? (
              confirm === pin ? (
                <p className="hint pin-match">
                  <Icon name="check" size={14} /> They match
                </p>
              ) : (
                <p className="error">These are not the same six numbers.</p>
              )
            ) : null}
          </div>
        </fieldset>

        <ActionProblem message={problem} />

        <button
          type="submit"
          className="btn block btn-hero"
          disabled={
            busy ||
            name.trim() === "" ||
            phone.trim() === "" ||
            pin.length !== 6 ||
            confirm.length !== 6 ||
            (role === "tailor" && (businessName.trim() === "" || location.trim() === "" || state === ""))
          }
        >
          {busy ? "Making your account…" : "Make my account"}
          {busy ? null : <Icon name="arrow" size={18} />}
        </button>
      </form>

      <p className="auth-foot">
        Already have an account? <Link to="/sign-in">Sign in</Link>
      </p>
    </AuthFrame>
  );
}

/** Two dots: which of the two screens she is on, without reading "step". */
function Steps({ at }: { at: 1 | 2 }) {
  return (
    <p className="auth-steps" aria-label={`Step ${at} of 2`}>
      <span className="is-on" />
      <span className={at === 2 ? "is-on" : ""} />
      <em>Step {at} of 2</em>
    </p>
  );
}

const HOUSE_POINTS: AuthPoint[] = [
  { icon: "scissors", title: "Tailors", text: "Show your work and be found by customers in your state." },
  { icon: "hanger", title: "Customers", text: "Watch your clothes being made, stage by stage." },
  { icon: "phone", title: "Just your phone", text: "A phone number and six numbers. No email needed." },
];

const TAILOR_POINTS: AuthPoint[] = [
  { icon: "image", title: "Your work, on show", text: "A page of your own in the Fashion House directory." },
  { icon: "check", title: "Tick, and she knows", text: "Each stage you finish tells your customer at once." },
  { icon: "qr", title: "A card that scans", text: "Print a business card that leads straight to your page." },
];

const CUSTOMER_POINTS: AuthPoint[] = [
  { icon: "eye", title: "See every stage", text: "Cutting, sewing, fitting: you see it as it happens." },
  { icon: "ruler", title: "Your measurements, kept", text: "Shared only with the tailors you choose." },
  { icon: "shield", title: "Money held safe", text: "Pay through us and the tailor is paid when you have it." },
];
