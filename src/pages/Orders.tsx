import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "../components/Avatar";
import OrderStatusPill, { ORDER_STATUS_LABELS } from "../components/OrderStatusPill";
import { useAuth } from "../hooks/useAuth";
import { api, errorMessage } from "../lib/api";
import { naira } from "../lib/money";
import type { Order, OrderStatus } from "../types/api";

interface ListResponse {
  data: Order[];
}

/** The filters worth offering. Not every state — nobody browses by "disputed". */
const FILTERS: (OrderStatus | "all")[] = ["all", "pending_payment", "in_progress", "ready"];

export default function Orders() {
  const { user } = useAuth();
  const isTailor = user?.role === "tailor";

  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<ListResponse>(
        `/orders${filter === "all" ? "" : `?status=${filter}`}`,
      );
      setOrders(response.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <div className="page-head">
        <h1>Orders</h1>
        <p>{isTailor ? "Work you have taken on." : "Clothes being made for you."}</p>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      <div className="row-actions" style={{ marginTop: 0, marginBottom: 16 }}>
        {isTailor ? (
          <Link className="btn" to="/orders/new">
            Open an order
          </Link>
        ) : null}

        <div className="filter-row">
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
      </div>

      {loading ? (
        <p className="empty">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="empty">
          {/* A filter finding nothing is not the same as having nothing, and
              telling a tailor with twenty orders that she has none reads as a
              bug. */}
          {filter !== "all"
            ? `Nothing ${ORDER_STATUS_LABELS[filter].toLowerCase()} right now.`
            : isTailor
              ? "No orders yet. Open one when a customer brings you cloth."
              : "Nothing being made for you yet."}
        </p>
      ) : (
        <div className="order-list">
          {orders.map((order) => {
            const other = isTailor ? order.customer : order.tailor;

            return (
              <Link className="order-row" to={`/orders/${order.id}`} key={order.id}>
                <Avatar name={other?.name ?? "?"} url={other?.avatar_url ?? null} size={40} />

                <div className="order-row__main">
                  <div className="order-row__top">
                    <strong>{order.garment_type?.name ?? "Order"}</strong>
                    <OrderStatusPill status={order.status} />
                  </div>
                  <div className="hint">
                    {other?.name} · {order.reference}
                  </div>
                </div>

                <div className="order-row__money">
                  <strong>{naira(order.amount)}</strong>
                  {order.escrow ? <span className="hint">held</span> : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
