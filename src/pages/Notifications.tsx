import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { api, errorMessage } from "../lib/api";
import type { AppNotification } from "../types/api";

interface ListResponse {
  data: AppNotification[];
  unread_count: number;
  /** Laravel's pagination block. `total` is every row, not just this page. */
  meta?: { total: number };
}

/** "3 hours ago", without pulling in a date library for one string. */
function when(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);

  if (seconds < 60) return "Just now";

  const units: [number, string][] = [
    [60, "minute"],
    [3600, "hour"],
    [86400, "day"],
  ];

  for (let i = units.length - 1; i >= 0; i -= 1) {
    const unit = units[i];
    if (!unit) continue;

    const [size, name] = unit;
    const value = Math.floor(seconds / size);

    if (value >= 1) return `${value} ${name}${value === 1 ? "" : "s"} ago`;
  }

  return "Just now";
}

export default function Notifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  /*
   * EVERY row, not the twenty on screen.
   *
   * The confirmation names a number, and the list is paginated -- so
   * counting what was loaded promised to clear 18 while the request would
   * have taken 22. A confirmation that understates what it is about to do
   * is worse than one that names nothing.
   */
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [rowProblem, setRowProblem] = useState<{ id: number; message: string } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const response = await api.get<ListResponse>("/notifications");
      setItems(response.data);
      setUnread(response.unread_count);
      setTotal(response.meta?.total ?? response.data.length);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function open(notification: AppNotification) {
    /*
     * Marked read optimistically, then navigated. Waiting for the round trip
     * before moving would feel broken on a slow connection, and the worst case
     * is a badge that is one out until the next poll.
     */
    if (!notification.read_at) {
      setItems((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item,
        ),
      );
      setUnread((count) => Math.max(0, count - 1));

      void api.post(`/notifications/${notification.id}/read`).catch(() => {});
    }

    if (notification.url) navigate(notification.url);
  }

  /*
   * Deleting the message, not the thing it was about.
   *
   * §2 calls the in-app record "the record of what happened to somebody's
   * cloth and money" -- and it stays true, because that rule is about no
   * preference being able to stop one arriving. The order, the payment and
   * the payout are all untouched by this; `notifications:prune` has been
   * deleting these by age since Section 2 anyway. This only lets her tidy
   * her own list sooner than the cron would.
   */
  async function remove(notification: AppNotification) {
    const previous = items;
    setRowProblem(null);

    // Optimistic: the row goes at once. A list that waits for a round trip
    // before a delete lands invites a second tap on the same row.
    setItems((current) => current.filter((item) => item.id !== notification.id));
    setTotal((count) => Math.max(0, count - 1));
    if (!notification.read_at) setUnread((count) => Math.max(0, count - 1));

    try {
      await api.delete(`/notifications/${notification.id}`);
    } catch (error: unknown) {
      // On the row that came back, not at the top of a long list.
      setRowProblem({ id: notification.id, message: errorMessage(error) });
      setItems(previous);
      void load();
    }
  }

  async function clearAll() {
    setBusy(true);
    setProblem(null);

    try {
      await api.delete("/notifications/all");
      setItems([]);
      setUnread(0);
      setTotal(0);
      setClearing(false);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
      void load();
    } finally {
      setBusy(false);
    }
  }

  async function markAll() {
    setItems((current) =>
      current.map((item) => item.read_at ? item : { ...item, read_at: new Date().toISOString() }),
    );
    setUnread(0);

    try {
      await api.post("/notifications/read-all");
    } catch (error: unknown) {
      setProblem(errorMessage(error));
      void load();
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Notifications</h1>
        <p>{unread > 0 ? `${unread} you have not read yet.` : "Nothing new."}</p>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      {items.length > 0 ? (
        <div className="row-actions" style={{ marginTop: 0, marginBottom: 16 }}>
          {unread > 0 ? (
            <button type="button" className="btn ghost" onClick={() => void markAll()}>
              Mark all as read
            </button>
          ) : null}
          {/* Asked about first: it cannot be undone, and it is next to a
              button that is merely tidy. */}
          <button type="button" className="btn ghost" onClick={() => setClearing(true)}>
            Clear them all
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="empty">Loading…</p>
      ) : items.length === 0 ? (
        <p className="empty">
          Nothing here yet. When a tailor finishes a stage of your clothes, it will show up here.
        </p>
      ) : (
        <div className="notification-list">
          {items.map((item) => (
            /*
              A row, not a button. The delete has to be a button of its own
              and one cannot be nested inside another, so the message is the
              button and the cross sits beside it.
            */
            <div className="notification-row" key={item.id}>
              <button
                type="button"
                className={`notification${item.read_at ? "" : " unread"}`}
                onClick={() => void open(item)}
              >
                <div className="title">{item.title}</div>
                <div>{item.message}</div>
                <div className="when">{when(item.created_at)}</div>
              </button>

              <button
                type="button"
                className="notification__remove"
                onClick={() => void remove(item)}
                aria-label={`Delete: ${item.title}`}
                title="Delete this one"
              >
                {/* The same bin as the photo and portfolio deletes. A cross
                    means "dismiss" everywhere else in this app; this does
                    not dismiss, it destroys. */}
                <Icon name="trash" size={16} />
              </button>
              {rowProblem?.id === item.id ? (
                <p className="notice bad" style={{ gridColumn: "1 / -1", margin: "8px 0 0" }}>
                  {rowProblem.message}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {clearing ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Clear all notifications">
          <div className="lightbox-inner confirm-panel">
            <h2 style={{ fontSize: 18 }}>Clear everything on this list?</h2>
            <p className="hint">
              All {total} of these messages go, and they cannot be brought back. Your
              orders, your money and your measurements are not touched — only the messages
              about them.
            </p>

            {/* Inside the box: it stays open when this fails, and would hide
                the line at the top of the page behind it. */}
            {problem ? <p className="notice bad">{problem}</p> : null}

            <div className="row-actions">
              <button type="button" className="btn danger" disabled={busy} onClick={() => void clearAll()}>
                {busy ? "Clearing…" : "Yes, clear them all"}
              </button>
              <button type="button" className="btn quiet" disabled={busy} onClick={() => setClearing(false)}>
                Keep them
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
