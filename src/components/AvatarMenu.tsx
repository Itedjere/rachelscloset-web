import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Avatar from "./Avatar";
import Icon from "./Icon";

/** What sits under the avatar. Only routes that exist. */
const LINKS = [
  { to: "/profile", label: "Your details", icon: "user" },
  { to: "/settings/alerts", label: "Alerts", icon: "cog" },
  { to: "/notifications", label: "Notifications", icon: "bell" },
];

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  tailor: "Tailor",
  customer: "Customer",
};

export default function AvatarMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  /*
   * Close on a click anywhere else, and on Escape.
   *
   * `pointerdown` rather than `click`: a click fires after the mouse is
   * released, which on a link outside the menu means the menu is still open
   * while the page is already navigating.
   */
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      setOpen(false);
      // Focus goes back to what opened it, or it lands nowhere.
      buttonRef.current?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div className="avatar-menu" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="avatar-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
      >
        <Avatar name={user.name} url={user.avatar_url} size={34} />
        <span className="avatar-menu__chevron" data-open={open}>
          <Icon name="chevron" size={16} />
        </span>
        <span className="sr-only">Your account</span>
      </button>

      {open ? (
        <div className="avatar-menu__panel" role="menu">
          <div className="avatar-menu__who">
            <Avatar name={user.name} url={user.avatar_url} size={40} />
            <div>
              <div className="name">{user.name}</div>
              {/* The phone number, because that is what she signs in with and
                  it is how she knows which account this is. */}
              <div className="meta">{user.phone}</div>
              <div className="meta">{ROLE_LABEL[user.role] ?? user.role}</div>
            </div>
          </div>

          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              role="menuitem"
              className="avatar-menu__item"
              onClick={() => setOpen(false)}
            >
              <Icon name={link.icon} />
              <span>{link.label}</span>
            </Link>
          ))}

          <button
            type="button"
            role="menuitem"
            className="avatar-menu__item danger"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
          >
            <Icon name="out" />
            <span>Sign out</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
