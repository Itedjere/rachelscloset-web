import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import type { SubscriptionState } from "../types/api";

/**
 * The backstop for a dead cron.
 *
 * Reminders go out by scheduled command, and that command is a courtesy: if
 * it stops, tailors still lapse and renew correctly and only the reminder
 * goes quiet. This is what makes that survivable — anybody who signs in is
 * told where she stands, whether or not anything ran overnight.
 *
 * Silent when there is nothing to say. A banner that is always there is a
 * banner nobody reads.
 */
export default function ListingBanner() {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState | null>(null);

  useEffect(() => {
    if (user?.role !== "tailor") return;

    void api
      .get<{ data: SubscriptionState }>("/subscription")
      .then((response) => setState(response.data))
      .catch(() => setState(null));
  }, [user?.role]);

  if (!state) return null;

  const days = state.days_remaining;
  const ending = state.listed && !state.in_grace && days !== null && days <= 7;

  if (state.listed && !state.in_grace && !ending) return null;

  return (
    <div className={`listing-banner${state.listed ? "" : " is-out"}`}>
      <div>
        <strong>
          {!state.listed
            ? "You are not in the Fashion House"
            : state.in_grace
              ? "Your listing has run out"
              : days === 1
                ? "Your listing ends tomorrow"
                : `Your listing ends in ${days} days`}
        </strong>
        <p className="hint">
          {state.listed
            ? "Buy more days and they add on to the end. Your orders are not affected."
            : "People searching for a tailor cannot find you. Your orders and your money are not affected."}
        </p>
      </div>

      <Link className="btn" to="/subscription">
        {state.listed ? "Add days" : "Get listed"}
      </Link>
    </div>
  );
}
