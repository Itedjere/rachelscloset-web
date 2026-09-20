import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "../lib/api";
import { naira } from "../lib/money";
import type { SubscriptionState } from "../types/api";

/**
 * Her listing in the Fashion House.
 *
 * She buys days, not a rent that is collected — there is no card on file and
 * nothing here ever charges her again. Renewing is the same act as
 * subscribing, so there is one set of buttons rather than a subscribe screen
 * and a renew screen.
 *
 * The page is deliberately calm about lapsing. A lapse hides her from the
 * directory and nothing else: her orders, her money, her measurements and the
 * page a printed card points at all keep working, and dressing that up as a
 * catastrophe to sell a renewal would be a lie.
 */
export default function Subscription() {
  const [state, setState] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get<{ data: SubscriptionState }>("/subscription");
      setState(response.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function buy(plan: string) {
    setBusy(plan);
    setProblem(null);

    try {
      // Paying leaves the app: the provider hosts the page where card, bank
      // transfer and USSD are chosen. Every one of those works here, which is
      // the reason this is not a recurring card charge.
      const response = await api.post<{ data: { link: string } }>("/subscription/pay", { plan });
      window.location.href = response.data.link;
    } catch (error: unknown) {
      setProblem(errorMessage(error));
      setBusy(null);
    }
  }

  if (loading) return <p className="empty">Loading…</p>;
  if (!state) return <p className="notice bad">{problem ?? "Not available."}</p>;

  const days = state.days_remaining;

  return (
    <>
      <div className="page-head">
        <h1>Your listing</h1>
        <p>
          Being in the Fashion House is what brings you customers who have never met you.
          Everything else — your orders, your money, your card — works either way.
        </p>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      <div className={`card standing standing--${state.status}`} style={{ marginBottom: 16 }}>
        {state.listed ? (
          <>
            <strong>
              {state.in_grace
                ? "You are still listed, for now"
                : "You are in the Fashion House"}
            </strong>
            <p className="hint">
              {state.in_grace
                ? `Your days ran out, but we keep you listed for ${state.grace_days} days in case a payment is still on its way.`
                : days !== null && days <= 7
                  ? `${days} ${days === 1 ? "day" : "days"} left. Buy more and they add on to the end — you lose nothing by paying early.`
                  : days !== null
                    ? `${days} days left.`
                    : null}
            </p>
          </>
        ) : (
          <>
            <strong>You are not listed</strong>
            <p className="hint">
              People searching for a tailor will not find you. Your orders, your money and
              your card are not affected.
            </p>
          </>
        )}
      </div>

      <div className="plan-grid">
        {state.plans.map((plan) => (
          <div className="card plan" key={plan.plan}>
            <h2>{plan.plan === "yearly" ? "A year" : "A month"}</h2>
            <p className="plan__price">{naira(plan.price)}</p>
            <p className="hint">{plan.days} days in the Fashion House.</p>

            <button
              type="button"
              className={`btn${plan.plan === "yearly" ? "" : " quiet"}`}
              onClick={() => void buy(plan.plan)}
              disabled={busy !== null}
            >
              {busy === plan.plan ? "Opening…" : state.listed ? "Add these days" : "Get listed"}
            </button>
          </div>
        ))}
      </div>

      {state.terms.length > 0 ? (
        <div className="card">
          <h2 style={{ fontSize: 18 }}>What you have paid for</h2>

          <div className="term-list">
            {state.terms.map((term) => (
              <div className="term" key={term.id}>
                <div>
                  <strong>{term.days} days</strong>
                  <div className="hint">
                    {term.starts_at.slice(0, 10)} → {term.ends_at.slice(0, 10)}
                  </div>
                </div>
                <span className="hint">
                  {term.granted ? (term.note ?? "A gift from us") : naira(term.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
