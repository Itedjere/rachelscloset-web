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
type Step = "role" | "you" | "shop" | "pin";

/**
 * Making an account -- the door the public site had been missing.
 *
 * One question per screen. She says which she is first, with two big
 * choices; then who she is; then, for a tailor, her shop; then her six
 * secret numbers. A long form is read top to bottom before anybody starts
 * it, and reading is the thing this platform asks least of people. A short
 * screen with one boxed group on it is something you just do.
 *
 * A customer never sees the shop step. A phone number and six digits, as
 * everywhere else; no email, which most tailors have never had.
 * `?as=tailor` arrives from the public site's "Join the house" and starts
 * her on the second step.
 */
export default function Join() {
  const { user, adoptSession } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const preset = params.get("as");
  const presetRole: Role | null = preset === "tailor" || preset === "customer" ? preset : null;
  const [role, setRole] = useState<Role | null>(presetRole);
  const [step, setStep] = useState<Step>(presetRole ? "you" : "role");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [state, setState] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const confirmRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

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

  // A new step starts at its own top. On a phone the Next button is near the
  // foot of the screen, and the next question would otherwise open below it.
  useEffect(() => {
    const top = topRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) window.scrollBy({ top: top - 80 });
  }, [step]);

  // Already signed in: nothing to make.
  if (user) return <Navigate to="/" replace />;

  const steps: Step[] = role === "tailor" ? ["role", "you", "shop", "pin"] : ["role", "you", "pin"];
  const at = steps.indexOf(step);

  const ready: Record<Step, boolean> = {
    role: role !== null,
    // Ten digits is the shortest way to write a Nigerian mobile number; the
    // server is the judge of the rest.
    you: name.trim() !== "" && phone.replace(/\D/g, "").length >= 10,
    shop: businessName.trim() !== "" && location.trim() !== "" && state !== "",
    pin: pin.length === 6 && confirm === pin,
  };

  function go(to: Step) {
    setProblem(null);
    setStep(to);
  }

  function chooseRole(chosen: Role) {
    setRole(chosen);
    go("you");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!role) return;

    // Enter on an earlier step means "next", not "make my account".
    if (step !== "pin") {
      const next = steps[at + 1];
      if (ready[step] && next) go(next);

      return;
    }

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
      const errors = error instanceof ApiError ? (error.errors ?? {}) : {};
      setFieldErrors(errors);

      /*
       * The server answers about the whole form, but she is on the last
       * screen. A phone number already in use is a problem on the "about
       * you" step, so she is taken back to it, with the reason beside the
       * box -- not told something is wrong on a screen that does not show it.
       */
      const owner = (Object.keys(errors) as string[])
        .map((key) => STEP_OF_FIELD[key])
        .filter((s): s is Step => s !== undefined && steps.includes(s))
        .sort((a, b) => steps.indexOf(a) - steps.indexOf(b))[0];

      if (owner && owner !== step) setStep(owner);
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

  /* ---- Step one: which are you? ------------------------------------------- */

  if (step === "role" || !role) {
    return (
      <AuthFrame headline={headline} points={points}>
        <div ref={topRef} />
        <Steps at={0} total={steps.length} label="Who you are" />
        <h1>Join Rachels Closet</h1>
        <p className="auth-lede">Which one are you? Tap it.</p>

        <div className="role-cards">
          <button
            type="button"
            className={`role-card${role === "tailor" ? " is-chosen" : ""}`}
            onClick={() => chooseRole("tailor")}
          >
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

          <button
            type="button"
            className={`role-card${role === "customer" ? " is-chosen" : ""}`}
            onClick={() => chooseRole("customer")}
          >
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

  /* ---- Then one boxed group per screen ------------------------------------ */

  const last = step === "pin";

  return (
    <AuthFrame headline={headline} points={points}>
      <div ref={topRef} />
      <Steps at={at} total={steps.length} label={STEP_LABEL[step]} />

      {/* Which door she came through, with the way back beside it -- the
          picture repeated so she can see at a glance she chose right. */}
      <button type="button" className="role-chip" onClick={() => go("role")}>
        <Icon name={role === "tailor" ? "scissors" : "hanger"} size={16} />
        <span>{role === "tailor" ? "I sew" : "I want clothes made"}</span>
        <span className="role-chip__change">Change</span>
      </button>

      <form onSubmit={submit} noValidate>
        {step === "you" ? (
          <>
            <h1>{role === "tailor" ? "First, about you" : "Make your account"}</h1>
            <p className="auth-lede">Your name, and the phone number you will sign in with.</p>

            <fieldset className="auth-group">
              <legend>
                <Icon name="user" size={16} /> About you
              </legend>

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
                    autoFocus
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
            </fieldset>
          </>
        ) : null}

        {step === "shop" ? (
          <>
            <h1>Now, your shop</h1>
            <p className="auth-lede">What it is called, and where customers can find it.</p>

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
                    autoFocus
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
          </>
        ) : null}

        {step === "pin" ? (
          <>
            <h1>Last, your secret numbers</h1>
            <p className="auth-lede">Six numbers only you know. You will type them to sign in.</p>

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
                  autoFocus
                />
                <p className="hint">Not 123456 or 111111, and not part of your phone number.</p>
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
          </>
        ) : null}

        <ActionProblem message={problem} />

        <div className="auth-nav">
          <button type="button" className="btn ghost auth-nav__back" onClick={() => go(steps[at - 1] ?? "role")}>
            <Icon name="back" size={18} />
            Back
          </button>

          <button type="submit" className="btn btn-hero auth-nav__next" disabled={busy || !ready[step]}>
            {last ? (busy ? "Making your account…" : "Make my account") : "Next"}
            {busy ? null : <Icon name={last ? "check" : "arrow"} size={18} />}
          </button>
        </div>
      </form>

      <p className="auth-foot">
        Already have an account? <Link to="/sign-in">Sign in</Link>
      </p>
    </AuthFrame>
  );
}

/** Which screen each field the server may complain about lives on. */
const STEP_OF_FIELD: Record<string, Step> = {
  role: "role",
  name: "you",
  phone: "you",
  business_name: "shop",
  location: "shop",
  state: "shop",
  pin: "pin",
  pin_confirmation: "pin",
};

const STEP_LABEL: Record<Step, string> = {
  role: "Who you are",
  you: "About you",
  shop: "Your shop",
  pin: "Secret numbers",
};

/** A dot per screen: how far she has come and how far is left, without counting. */
function Steps({ at, total, label }: { at: number; total: number; label: string }) {
  return (
    <p className="auth-steps" aria-label={`Step ${at + 1} of ${total}: ${label}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i <= at ? "is-on" : ""} />
      ))}
      <em>
        Step {at + 1} of {total} · {label}
      </em>
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
