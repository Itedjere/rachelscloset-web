import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import OrderStatusPill, { ORDER_STATUS_LABELS } from "../../components/OrderStatusPill";
import { api, errorMessage } from "../../lib/api";
import { naira } from "../../lib/money";
import type { Order, OrderStatus } from "../../types/api";

const FILTERS: (OrderStatus | "all")[] = [
  "all",
  "pending_payment",
  "in_progress",
  "ready",
  "collected",
  "completed",
];

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (search) params.set("q", search);

    try {
      const response = await api.get<{ data: Order[] }>(`/admin/orders?${params}`);
      setOrders(response.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <div className="page-head">
        <h1>All orders</h1>
        <p>Every order on the platform, for settling a problem with one.</p>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      <form
        className="card"
        style={{ marginBottom: 16 }}
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(query.trim());
        }}
      >
        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="q">Find an order</label>
          <input
            id="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="RC-8FQ2M4 or 08030000003"
          />
          {/* The two things somebody ringing up can actually give you. */}
          <p className="hint">A reference, or either person&rsquo;s phone number.</p>
        </div>

        <div className="row-actions" style={{ marginTop: 0 }}>
          <button type="submit" className="btn ghost">
            Search
          </button>
          {search ? (
            <button
              type="button"
              className="btn quiet"
              onClick={() => {
                setQuery("");
                setSearch("");
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
      </form>

      <div className="filter-row" style={{ marginBottom: 16 }}>
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            className={`chip${filter === value ? " is-on" : ""}`}
            onClick={() => setFilter(value)}
          >
            {value === "all" ? "All" : ORDER_STATUS_LABELS[value]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="empty">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="empty">Nothing matches.</p>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <Link className="order-row" to={`/admin/orders/${order.id}`} key={order.id}>
              <div className="order-row__main">
                <div className="order-row__top">
                  <strong>{order.reference}</strong>
                  <OrderStatusPill status={order.status} />
                  {Number(order.payout?.refunded_amount ?? 0) > 0 ? (
                    <span className="status-pill status-cancelled">Refunded</span>
                  ) : null}
                </div>
                <div className="hint">
                  {order.customer?.name} → {order.tailor?.name} ·{" "}
                  {order.garment_type?.name ?? "—"}
                </div>
              </div>

              <div className="order-row__money">
                <strong>{naira(order.amount)}</strong>
                <span className="hint">{order.escrow ? "held" : "direct"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
