import { useEffect, useState } from "react";
import AvatarUpload from "../components/AvatarUpload";
import { useAuth } from "../hooks/useAuth";
import { ApiError, api, errorMessage } from "../lib/api";
import type { ResourceResponse, User } from "../types/api";

export default function Profile() {
  const { user, setUser } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email ?? "");
  }, [user]);

  if (!user) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setSaved(false);
    setProblem(null);
    setFieldErrors({});

    try {
      const response = await api.put<ResourceResponse<User>>("/profile", { name, email });
      setUser(response.data);
      setSaved(true);
    } catch (error: unknown) {
      if (error instanceof ApiError) setFieldErrors(error.errors);
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Your details</h1>
        <p>Your photo and the name other people see.</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <AvatarUpload user={user} onChange={setUser} />
      </div>

      <div className="card">
        <form onSubmit={submit} noValidate>
          {problem ? <p className="notice bad">{problem}</p> : null}
          {saved ? <p className="notice info">Saved.</p> : null}

          <div className="field">
            <label htmlFor="name">Your name</label>
            <input
              id="name"
              value={name}
              aria-invalid={Boolean(fieldErrors.name)}
              onChange={(event) => setName(event.target.value)}
            />
            {fieldErrors.name ? <p className="error">{fieldErrors.name[0]}</p> : null}
          </div>

          <div className="field">
            <label htmlFor="phone">Phone number</label>
            {/* Shown but not editable. It is the username, and moving it needs
                the claim flow from Section 11 to prove the new number is hers --
                for somebody with no email address, a typo here would be the end
                of their access to the account. */}
            <input id="phone" value={user.phone} readOnly disabled />
            <p className="hint">This is how you sign in, so it cannot be changed here.</p>
          </div>

          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              inputMode="email"
              value={email}
              aria-invalid={Boolean(fieldErrors.email)}
              onChange={(event) => setEmail(event.target.value)}
            />
            <p className="hint">Optional. Most people here do not have one, and nothing needs it.</p>
            {fieldErrors.email ? <p className="error">{fieldErrors.email[0]}</p> : null}
          </div>

          <button type="submit" className="btn" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </form>
      </div>
    </>
  );
}
