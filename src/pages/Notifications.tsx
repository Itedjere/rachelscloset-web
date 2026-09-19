import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, errorMessage } from "../lib/api";
import type { AppNotification } from "../types/api";

interface ListResponse {
  data: AppNotification[];
  unread_count: number;
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
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const response = await api.get<ListResponse>("/notifications");
      setItems(response.data);
      setUnread(response.unread_count);
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

      {unread > 0 ? (
        <div className="row-actions" style={{ marginTop: 0, marginBottom: 16 }}>
          <button type="button" className="btn ghost" onClick={() => void markAll()}>
            Mark all as read
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
            <button
              key={item.id}
              type="button"
              className={`notification${item.read_at ? "" : " unread"}`}
              onClick={() => void open(item)}
            >
              <div className="title">{item.title}</div>
              <div>{item.message}</div>
              <div className="when">{when(item.created_at)}</div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
