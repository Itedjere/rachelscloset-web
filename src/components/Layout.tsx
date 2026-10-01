import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { SITE_URL } from "../lib/site";
import AvatarMenu from "./AvatarMenu";
import Icon from "./Icon";
import NotificationBell from "./NotificationBell";
import Sidebar from "./Sidebar";
import ThemeToggle from "./ThemeToggle";

/**
 * The signed-in shell: a header, a sidebar of grouped sections, and the page.
 *
 * The header carries only what is true on every screen -- who you are, what is
 * new, and how it looks. Everything you can navigate to lives in the sidebar,
 * grouped, so the header does not slowly fill with links as the remaining
 * sections land.
 *
 * Below 900px the sidebar becomes a drawer over the page and a menu button
 * appears in the header to open it. That button is the one addition to the
 * header on a small screen: a permanent sidebar on a 5-inch phone would leave
 * nothing for the page itself.
 */
export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  // Changing page closes the drawer, including via the browser's back button.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // The drawer covers the screen; the page behind it must not scroll.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  /* Signed out: no shell, just the page -- which is the sign-in card. */
  if (!user) {
    return (
      <>
        <header className="app-header">
          {/* Out to the public site, not to "/": signed out, "/" only bounces
              back to sign-in, so the logo went nowhere. Somebody who tapped
              "Sign in" on the directory by mistake needs a way back to it. */}
          <a href={SITE_URL} className="brand" title="Back to Rachels Closet">
            <img src="/brand/mark.svg" width="32" height="32" alt="" aria-hidden="true" />
            <span>Rachels Closet</span>
          </a>

          <div className="app-header__actions">
            <a href={SITE_URL} className="app-header__site">
              <Icon name="back" size={16} />
              <span>Back to the site</span>
            </a>
            <ThemeToggle />
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

  return (
    <div className="shell">
      <header className="app-header">
        <button
          type="button"
          className="icon-btn app-header__menu"
          aria-label={drawerOpen ? "Close menu" : "Open menu"}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((was) => !was)}
        >
          <Icon name={drawerOpen ? "close" : "menu"} size={22} />
        </button>

        <Link to="/" className="brand">
          <img src="/brand/mark.svg" width="32" height="32" alt="" aria-hidden="true" />
          <span>Rachels Closet</span>
        </Link>

        <div className="app-header__actions">
          <ThemeToggle />
          <NotificationBell />
          <AvatarMenu />
        </div>
      </header>

      <div className="shell__body">
        {/* One sidebar shown two ways: docked on a wide screen, a drawer on a
            narrow one. Rendering it twice would mean two copies of the active
            state to keep in step. */}
        <aside className={`sidebar${drawerOpen ? " is-open" : ""}`}>
          <Sidebar onNavigate={() => setDrawerOpen(false)} />

          <button type="button" className="sidebar__signout" onClick={() => void signOut()}>
            <Icon name="out" />
            <span>Sign out</span>
          </button>
        </aside>

        {drawerOpen ? (
          <button
            type="button"
            className="sidebar__scrim"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
          />
        ) : null}

        <main className="app-main">
          <div className="app-main__inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
