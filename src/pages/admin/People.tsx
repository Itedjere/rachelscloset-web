import { useCallback, useEffect, useState } from "react";
import Avatar from "../../components/Avatar";
import { api, errorMessage } from "../../lib/api";
import { longDate } from "../../lib/format";
import type { AdminUser, PinResetIssue } from "../../types/api";

/**
 * People, and the one thing an admin can do to them.
 *
 * Suspension has been enforced since Section 1 — a live session is cut rather
 * than waiting for the next sign-in, and a fixed term lapses on use rather
 * than on a schedule — but nothing could ever start one. This is that missing
 * half, and it is deliberately the only power here: no editing names, no
 * reading measurements, no changing a phone number that is also a username.
 */
export default function People() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [term, setTerm] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<AdminUser | null>(null);
  const [resetFor, setResetFor] = useState<AdminUser | null>(null);
  const [issued, setIssued] = useState<PinResetIssue | null>(null);

  const load = useCallback(async () => {
    setProblem(null);

    try {
      const query = new URLSearchParams();
      if (term) query.set("q", term);
      if (role) query.set("role", role);
      if (status) query.set("status", status);

      const response = await api.get<{ data: AdminUser[] }>(`/admin/users?${query.toString()}`);
      setUsers(response.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [term, role, status]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * A way back in for somebody who has forgotten her PIN.
   *
   * Nothing is sent from here: the admin reads the six digits down the phone
   * she is already holding, or taps through to her own WhatsApp. Every
   * channel costs nothing per use, which is what stops recovery being the
   * thing that gets switched off when money is tight.
   */
  async function issueReset(user: AdminUser) {
    setBusyId(user.id);
    setProblem(null);
    setIssued(null);

    try {
      const response = await api.post<{ data: PinResetIssue }>(`/admin/users/${user.id}/pin-reset`);
      setResetFor(user);
      setIssued(response.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  async function act(user: AdminUser, path: string, body?: unknown) {
    setBusyId(user.id);
    setProblem(null);

    try {
      await api.post(`/admin/users/${user.id}/${path}`, body);
      setConfirming(null);
      await load();
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>People</h1>
        <p>
          Everybody on the platform. Pausing an account stops it being used at once — it does
          not touch orders, money or anything already recorded.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="people-filters">
          <label className="field">
            <span>Search by name or phone number</span>
            <input
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Amaka, or 08031112233"
            />
          </label>

          <label className="field">
            <span>Who</span>
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="">Everybody</option>
              <option value="customer">Customers</option>
              <option value="tailor">Tailors</option>
              <option value="admin">Admins</option>
            </select>
          </label>

          <label className="field">
            <span>Standing</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Any</option>
              <option value="active">Active</option>
              <option value="suspended">Paused</option>
            </select>
          </label>
        </div>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      {loading ? (
        <p className="empty">Loading…</p>
      ) : users.length === 0 ? (
        <p className="empty">Nobody matches that.</p>
      ) : (
        <div className="people-list">
          {users.map((user) => (
            <div className="card person" key={user.id}>
              <Avatar name={user.name} url={user.avatar_url} size={44} />

              <div className="person__who">
                <strong>{user.business_name ?? user.name}</strong>
                <div className="hint">
                  {user.phone} · {user.role}
                  {user.claimed ? "" : " · never set up"}
                </div>
                {user.status === "suspended" ? (
                  <div className="hint">
                    Paused
                    {user.suspended_until ? ` until ${longDate(user.suspended_until)}` : ""}
                  </div>
                ) : null}
              </div>

              <div className="person__action">
                {/* Only for an account that has actually been set up: one
                    that never was needs an invitation, not a reset. */}
                {user.claimed ? (
                  <button
                    type="button"
                    className="btn quiet"
                    onClick={() => void issueReset(user)}
                    disabled={busyId === user.id}
                  >
                    Help her back in
                  </button>
                ) : null}

                {user.role === "admin" ? (
                  <span className="pill">Admin</span>
                ) : user.status === "suspended" ? (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void act(user, "reinstate")}
                    disabled={busyId === user.id}
                  >
                    Let back in
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn quiet"
                    onClick={() => setConfirming(user)}
                    disabled={busyId === user.id}
                  >
                    Pause
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {issued && resetFor ? (
        <ResetPanel
          user={resetFor}
          issued={issued}
          onClose={() => {
            setIssued(null);
            setResetFor(null);
          }}
        />
      ) : null}

      {/* Pausing somebody is not a one-tap action: it cuts her off mid-session,
          so it asks for a reason she will actually be shown. */}
      {confirming ? (
        <PauseDialog
          user={confirming}
          busy={busyId === confirming.id}
          onCancel={() => setConfirming(null)}
          onConfirm={(days, reason) => void act(confirming, "suspend", { days, reason })}
        />
      ) : null}
    </>
  );
}

function PauseDialog({
  user,
  busy,
  onCancel,
  onConfirm,
}: {
  user: AdminUser;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (days: number, reason: string | null) => void;
}) {
  const [days, setDays] = useState("14");
  const [reason, setReason] = useState("");

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Pause this account">
      <div className="lightbox-inner confirm-panel" onClick={(event) => event.stopPropagation()}>
        <h2 style={{ fontSize: 18 }}>Pause {user.business_name ?? user.name}?</h2>
        <p className="hint">
          She will be signed out straight away and cannot sign in until it ends. Her orders,
          her money and her measurements are untouched.
        </p>

        <label className="field">
          <span>For how many days</span>
          <input
            type="number"
            min={1}
            max={3650}
            value={days}
            onChange={(event) => setDays(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Why? She is shown this.</span>
          <textarea
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
          />
        </label>

        <div className="row-actions">
          <button
            type="button"
            className="btn danger"
            disabled={busy}
            onClick={() => onConfirm(Number(days) || 14, reason.trim() || null)}
          >
            {busy ? "Pausing…" : "Pause the account"}
          </button>
          <button type="button" className="btn quiet" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The three free channels, side by side.
 *
 * Nothing is sent from this panel. The admin reads the digits aloud on the
 * call she is already on, taps through to her own WhatsApp, or holds the
 * screen up if they happen to be in the same room. No SMS, no WhatsApp
 * Business API, no per-use cost at all — which is the reason this recovery
 * route can be relied on to still exist in a year.
 */
function ResetPanel({
  user,
  issued,
  onClose,
}: {
  user: AdminUser;
  issued: PinResetIssue;
  onClose: () => void;
}) {
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="A way back in">
      <div className="lightbox-inner confirm-panel" onClick={(event) => event.stopPropagation()}>
        <h2 style={{ fontSize: 18 }}>A way back in for {user.name}</h2>
        <p className="hint">
          Give her any one of these. It works once, and stops working in{" "}
          {issued.expires_in_hours} hours.
        </p>

        <div className="invite-channels">
          <div className="invite-qr">
            {/* From our own API, built from a link we generated. */}
            <div
              className="invite-qr-image"
              dangerouslySetInnerHTML={{ __html: issued.qr_svg }}
            />
            <p className="hint">If she is with you, let her scan this.</p>
          </div>

          <div className="invite-rest">
            <a className="btn" href={issued.whatsapp_url} target="_blank" rel="noreferrer noopener">
              Send it on WhatsApp
            </a>

            <div className="invite-code">
              <span className="hint">Or read her these numbers:</span>
              <strong>{issued.code}</strong>
            </div>

            <p className="hint">
              She will be asked for her phone number too, so the numbers only work for her.
            </p>
          </div>
        </div>

        <div className="row-actions">
          <button type="button" className="btn quiet" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
