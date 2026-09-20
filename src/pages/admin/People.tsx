import { useCallback, useEffect, useState } from "react";
import Avatar from "../../components/Avatar";
import { api, errorMessage } from "../../lib/api";
import type { AdminUser } from "../../types/api";

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
                    {user.suspended_until ? ` until ${user.suspended_until.slice(0, 10)}` : ""}
                  </div>
                ) : null}
              </div>

              <div className="person__action">
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
