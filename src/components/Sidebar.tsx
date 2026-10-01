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
    items: [
      { to: "/", label: "Dashboard", icon: "home", end: true, allow: ["tailor", "customer"] },
      /*
       * An admin's dashboard IS the overview: "/" redirects her to /admin. A
       * separate "Overview" link was a second door to the same room, and the
       * Dashboard link never lit up there because the address is /admin.
       */
      { to: "/admin", label: "Dashboard", icon: "home", end: true, allow: ["admin"] },
    ],
  },
  {
    heading: "Production",
    items: [
      /*
       * Not for admins. This list is "orders I am on", and an admin is never
       * the customer or the tailor, so for her it was always empty. Hers is
       * "All orders" under Administration.
       */
      { to: "/orders", label: "Orders", icon: "check", allow: ["tailor", "customer"] },
      { to: "/customers", label: "Your customers", icon: "user", allow: ["tailor"] },
      /*
       * Not for customers. The page is a catalogue of garment types and the
       * production stages behind them -- an admin curates it and a tailor
       * arranges her own stages within it. A customer can do neither, and the
       * stages of HER order are already on her order page, in the tracker.
       * A nav link she can only read and leave teaches her the menu is
       * scenery.
       */
      /*
       * Production, not Administration: the stages and their recordings are
       * what every garment is built from, so for an admin they sit with the
       * garments they make up -- above them, as the parts come before the whole.
       */
      { to: "/admin/steps", label: "Step library", icon: "list", allow: ["admin"] },
      { to: "/garments", label: "Garments", icon: "garment", allow: ["tailor", "admin"] },
      { to: "/portfolio", label: "Your gallery", icon: "image", allow: ["tailor"] },
      { to: "/card", label: "Your card", icon: "qr", allow: ["tailor"] },
      { to: "/subscription", label: "Your listing", icon: "star", allow: ["tailor"] },
    ],
  },
  {
    heading: "Administration",
    items: [
      { to: "/admin/orders", label: "All orders", icon: "list", allow: ["admin"] },
      { to: "/admin/people", label: "People", icon: "user", allow: ["admin"] },
      { to: "/admin/disputes", label: "Disputes", icon: "lock", allow: ["admin"] },
      { to: "/admin/reviews", label: "Reviews to check", icon: "star", allow: ["admin"] },
    ],
  },
  {
    /*
     * A section of its own, not two lines buried in Account. Her body's
     * numbers and who may read them are the most sensitive things she has
     * here, and the second link only makes sense next to the first. A
     * tailor reaches a customer's measurements through the order instead,
     * so the whole group disappears for her.
     */
    heading: "Measurements",
    items: [
      { to: "/measurements", label: "Your measurements", icon: "ruler", allow: ["customer"] },
      {
        to: "/settings/measurement-access",
        label: "Who can see them",
        icon: "lock",
        allow: ["customer"],
      },
    ],
  },
  {
    heading: "Account",
    items: [
      { to: "/notifications", label: "Notifications", icon: "bell" },
      { to: "/profile", label: "Your details", icon: "user" },
      { to: "/settings/bank", label: "Where you get paid", icon: "check", allow: ["tailor"] },
      { to: "/settings/alerts", label: "Alerts", icon: "cog" },
      // Last in Account, for an admin: the platform's numbers, kept apart
      // from the day-to-day queues above.
      { to: "/admin/settings", label: "Settings", icon: "cog", allow: ["admin"] },
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
