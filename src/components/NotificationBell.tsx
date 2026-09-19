import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Icon from "./Icon";

interface CountResponse {
  data: { unread_count: number };
}

/*
 * Polled rather than pushed down a socket, because a socket needs a process the
 * shared host cannot run (CLAUDE.md section 5). Thirty seconds against a
 * single-integer endpoint is cheap even on a metered connection -- which is why
 * the count has its own route rather than being read off the paginated list.
 */
const POLL_MS = 30_000;

export default function NotificationBell() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const response = await api.get<CountResponse>("/notifications/unread-count");
      setCount(response.data.unread_count);
    } catch {
      // A badge that fails to refresh should show the last number it knew,
      // not an error. Nothing here is the record.
    }
  }, []);

  useEffect(() => {
    void refresh();

    const timer = window.setInterval(() => {
      // Nothing to poll for while the tab is in the background, and a phone in
      // a pocket should not be spending data on it.
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);

    // Catch up the moment the tab comes back, rather than up to 30s later.
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refresh]);

  return (
    <Link
      to="/notifications"
      className="icon-btn"
      aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
    >
      <Icon name="bell" />
      {count > 0 ? <span className="badge">{count > 99 ? "99+" : count}</span> : null}
    </Link>
  );
}
