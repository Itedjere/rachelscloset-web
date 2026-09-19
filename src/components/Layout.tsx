import { useEffect } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Icon from "./Icon";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  /*
   * A notification tapped on the lock screen. The service worker focuses the
   * open tab and posts where it should go, so the app navigates rather than
   * reloading the whole bundle over a phone connection.
   */
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string; url?: string } | null;

      if (data?.type === "notification-click" && data.url) navigate(data.url);
    }

    navigator.serviceWorker?.addEventListener("message", onMessage);

    return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, [navigate]);

  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <Link to="/" className="brand">
            Rachel&rsquo;s Closet
          </Link>

          {user ? (
            <>
              <NotificationBell />
              <Link to="/settings/alerts" className="icon-btn" aria-label="Alert settings">
                <Icon name="cog" />
              </Link>
              <ThemeToggle />
              <button
                type="button"
                className="icon-btn"
                onClick={() => void signOut()}
                aria-label="Sign out"
              >
                <Icon name="out" />
              </button>
            </>
          ) : (
            <ThemeToggle />
          )}
        </div>
      </header>

      <main className="page">
        <div className="wrap">
          <Outlet />
        </div>
      </main>
    </>
  );
}
