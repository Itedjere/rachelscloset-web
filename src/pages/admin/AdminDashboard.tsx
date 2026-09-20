import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { api, errorMessage } from "../../lib/api";
import { naira } from "../../lib/money";
import type { AdminDashboardData } from "../../types/api";

/**
 * What an admin sees on signing in.
 *
 * Two questions, in this order: is anything waiting for me, and is anything
 * quietly broken. The numbers come third, because a figure nobody acts on is
 * decoration.
 *
 * The health panel is the point. Nothing on this platform is load-bearing on
 * cron — escrow release is computed, expiry is computed, pruning is
 * housekeeping — which is deliberate, and is exactly what would let a stopped
 * schedule go unnoticed until somebody's money was late.
 */
export default function AdminDashboard() {
  const { user } = useAuth();

  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<{ data: AdminDashboardData }>("/admin/dashboard")
      .then((response) => setData(response.data))
      .catch((error: unknown) => setProblem(errorMessage(error)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="empty">Loading…</p>;
  if (!data) return <p className="notice bad">{problem ?? "Not available."}</p>;

  const n = data.numbers;

  return (
    <>
      <div className="page-head">
        <h1>Hello, {user?.name}</h1>
        <p>What is waiting, and whether anything has stopped running.</p>
      </div>

      {/* Nothing waiting shows nothing: a list of zeroes trains somebody to
          stop reading the list. */}
      {data.attention.length > 0 ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18 }}>Needs you</h2>

          <ul className="attention">
            {data.attention.map((item) => (
              <li key={item.key} className={item.tone === "bad" ? "is-bad" : undefined}>
                <span className="attention__count">{item.count}</span>
                <span>{item.label}</span>
                {item.href ? <Link to={item.href}>Open</Link> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="notice" style={{ marginBottom: 16 }}>
          Nothing is waiting for you.
        </p>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18 }}>Still running?</h2>
        <p className="hint">
          None of these is essential — the platform works correctly without them. That is
          exactly why a stopped one would otherwise go unnoticed.
        </p>

        <ul className="health">
          {data.health.map((row) => (
            <li key={row.key} className={`health--${row.state}`}>
              <div>
                <strong>{row.label}</strong>
                <div className="hint">{row.note}</div>
              </div>
              <span className="health__when">
                {row.state === "never"
                  ? "Never run"
                  : row.state === "stale"
                    ? `Last ran ${row.last_run_at?.slice(0, 10)}`
                    : `Ran ${row.last_run_at?.slice(0, 10)}`}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="stat-grid">
        <Stat label="Being made now" value={String(n.orders_in_progress)} />
        <Stat label="Orders this month" value={String(n.orders_this_month)} />
        <Stat label="Tailors listed" value={`${n.tailors_listed} of ${n.tailors}`} />
        <Stat label="Customers" value={String(n.customers)} />
        {/* The platform's only revenue: no commission is taken on orders. */}
        <Stat label="Listings this month" value={naira(n.subscription_income_this_month)} />
        <Stat label="Held in escrow" value={naira(n.held_in_escrow)} />
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card stat-card">
      <span className="stat-card__value">{value}</span>
      <span className="hint">{label}</span>
    </div>
  );
}
