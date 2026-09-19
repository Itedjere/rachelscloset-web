import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Icon from "./Icon";
import type { Role } from "../types/api";

interface Item {
  to: string;
  label: string;
  icon: string;
  /** Roles that see this link. Absent means everybody. */
  allow?: Role[];
  /** Match only the exact path, for links that would otherwise always look active. */
  end?: boolean;
}

interface Group {
  /** Absent for the first group, which needs no heading above it. */
  heading?: string;
  items: Item[];
}

/*
 * Only routes that exist. It is tempting to sketch the rest of the plan in
 * here -- Orders, Measurements, Reviews -- but a navigation full of links that
 * go nowhere teaches people to distrust it, and an empty page is worse than an
 * absent one. Each section adds its own entry as it lands.
 */
const GROUPS: Group[] = [
  {
    items: [{ to: "/", label: "Dashboard", icon: "home", end: true }],
  },
  {
    heading: "Production",
    items: [{ to: "/garments", label: "Garments", icon: "garment" }],
  },
  {
    heading: "Administration",
    items: [{ to: "/admin/steps", label: "Step library", icon: "list", allow: ["admin"] }],
  },
  {
    heading: "Account",
    items: [
      { to: "/notifications", label: "Notifications", icon: "bell" },
      { to: "/profile", label: "Your details", icon: "user" },
      { to: "/settings/alerts", label: "Alerts", icon: "cog" },
    ],
  },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();

  if (!user) return null;

  const visible = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.allow || item.allow.includes(user.role)),
  })).filter((group) => group.items.length > 0);

  return (
    <nav className="sidebar__nav" aria-label="Sections">
      {visible.map((group) => (
        <div className="sidebar__group" key={group.heading ?? "top"}>
          {group.heading ? <h2 className="sidebar__heading">{group.heading}</h2> : null}

          <ul>
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `sidebar__link${isActive ? " is-active" : ""}`}
                  /* On a phone the sidebar is a drawer over the page, so
                     following a link has to close it. */
                  onClick={onNavigate}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
