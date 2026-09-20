import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import OrderStatusPill from "../components/OrderStatusPill";
import OrderReviews from "../components/OrderReviews";
import OrderTracker from "../components/OrderTracker";
import { useAuth } from "../hooks/useAuth";
import { api, errorMessage } from "../lib/api";
import { naira } from "../lib/money";
import type { Order, ResourceResponse } from "../types/api";

export default function OrderDetail() {
  const { orderId } = useParams();
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get<ResourceResponse<Order>>(`/orders/${orderId}`);
      setOrder(response.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(path: string) {
    setBusy(true);
    setProblem(null);

    try {
      const response = await api.post<ResourceResponse<Order>>(`/orders/${orderId}/${path}`);
      setOrder(response.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  /*
   * Paying leaves the app entirely: the provider hosts the page where card,
   * bank transfer and USSD are chosen. We hand over and the return URL brings
   * her back to /orders/:id/paid, which confirms it.
   */
  async function pay() {
    setBusy(true);
    setProblem(null);

    try {
      const response = await api.post<{ data: { link: string } }>(`/orders/${orderId}/pay`);
      window.location.href = response.data.link;
    } catch (error: unknown) {
      setProblem(errorMessage(error));
      setBusy(false);
    }
  }

  if (loading) return <p className="empty">Loading…</p>;
  if (!order) return <p className="notice bad">{problem ?? "Not found."}</p>;

  const isTailor = user?.id === order.tailor?.id;
  const other = isTailor ? order.customer : order.tailor;
  const outstanding = Number(order.amount) - Number(order.paid_total);

  return (
    <>
      <div className="page-head">
        <div className="order-head">
          <h1>{order.garment_type?.name ?? "Order"}</h1>
          <OrderStatusPill status={order.status} />
        </div>
        <p>
          {order.reference}
          {order.description ? ` · ${order.description}` : ""}
        </p>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="order-parties">
          <Avatar name={other?.name ?? "?"} url={other?.avatar_url ?? null} size={44} />
          <div>
            <strong>{other?.name}</strong>
            <div className="hint">
              {isTailor ? "Customer" : "Tailor"} · {other?.phone}
            </div>
          </div>
        </div>

        {/*
          A live order is itself the permission -- see MeasurementAccess -- so
          the link belongs here, where she is already looking at the garment
          she needs the numbers for, rather than in a menu.
        */}
        {isTailor && other?.id ? (
          <Link className="btn quiet" to={`/customers/${other.id}/measurements`}>
            <Icon name="ruler" size={16} /> Her measurements
          </Link>
        ) : null}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18 }}>Money</h2>

        <dl className="facts">
          <div>
            <dt>Price</dt>
            <dd>{naira(order.amount)}</dd>
          </div>
          {Number(order.deposit_amount) > 0 ? (
            <div>
              <dt>Deposit</dt>
              <dd>{naira(order.deposit_amount)}</dd>
            </div>
          ) : null}
          <div>
            <dt>Paid so far</dt>
            <dd>{naira(order.paid_total)}</dd>
          </div>
          {outstanding > 0 ? (
            <div>
              <dt>Still owing</dt>
              <dd>{naira(outstanding)}</dd>
            </div>
          ) : null}
          <div>
            <dt>Held by us</dt>
            <dd>{order.escrow ? "Yes, until collection" : "No, paid to the tailor"}</dd>
          </div>
        </dl>

        {/* Only the customer pays, and only while something is outstanding. */}
        {!isTailor && order.status === "pending_payment" ? (
          <button type="button" className="btn" onClick={() => void pay()} disabled={busy}>
            {busy ? "Opening…" : `Pay ${naira(order.amount_due_up_front)}`}
          </button>
        ) : null}
      </div>

      {order.due_date || order.collection_deadline ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18 }}>Dates</h2>
          <dl className="facts">
            {order.due_date ? (
              <div>
                <dt>Promised for</dt>
                <dd>{order.due_date}</dd>
              </div>
            ) : null}
            {order.collection_deadline ? (
              <div>
                <dt>Collect by</dt>
                <dd>{order.collection_deadline}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      {/*
        The checklist. Shown before payment too, read-only: seeing what stages
        her garment will pass through is most of what she is deciding on, and
        making her pay first to find out is the opacity this platform exists
        to remove. Both sides see the same rows; only the tailor gets the tick.
      */}
      {order.steps && order.steps.length > 0 ? (
        <OrderTracker
          orderId={order.id}
          steps={order.steps}
          canTick={isTailor && (order.status === "in_progress" || order.status === "ready")}
          onChanged={() => void load()}
        />
      ) : null}

      {isTailor ? (
        <div className="row-actions">
          {/*
            Ticking the last stage is what makes an order ready, so this button
            exists only for an order with no checklist -- a garment type whose
            arrangement was empty when the order was opened. Showing it
            alongside a checklist would be asking her to say the same thing
            twice, and let her declare a garment ready with stages untouched.
          */}
          {order.status === "in_progress" && (order.steps?.length ?? 0) === 0 ? (
            <button type="button" className="btn" onClick={() => void act("ready")} disabled={busy}>
              Mark ready to collect
            </button>
          ) : null}

          {order.status === "ready" ? (
            <button type="button" className="btn" onClick={() => void act("collected")} disabled={busy}>
              She has collected it
            </button>
          ) : null}
        </div>
      ) : null}

      {/*
        The customer saying she is happy is the fast path out of escrow -- once
        the person who paid says the garment is right there is nothing left to
        wait for.
      */}
      {!isTailor && order.status === "collected" && order.escrow ? (
        <div className="card">
          <h2 style={{ fontSize: 18 }}>Is everything right?</h2>
          <p className="hint">
            Saying yes sends your tailor her money straight away. If you say nothing we send
            it after a few days anyway.
          </p>
          <button type="button" className="btn" onClick={() => void act("confirm")} disabled={busy}>
            Yes, I am happy with it
          </button>
        </div>
      ) : null}

      {/* And the slow path: hers to take, so a stopped sweep costs a tap
          rather than her wages. */}
      {isTailor && order.escrow && order.can_release ? (
        <div className="card">
          <h2 style={{ fontSize: 18 }}>Your money is ready</h2>
          <p className="hint">The waiting period is over. Send it to your account.</p>
          <button type="button" className="btn" onClick={() => void act("release")} disabled={busy}>
            Send me my money
          </button>
        </div>
      ) : null}

      {order.payout ? (
        <div className="card">
          <h2 style={{ fontSize: 18 }}>{isTailor ? "Your payout" : "Held by us"}</h2>
          <dl className="facts">
            <div>
              <dt>Amount</dt>
              <dd>{naira(order.payout.net_amount)}</dd>
            </div>
            {Number(order.payout.refunded_amount) > 0 ? (
              <div>
                <dt>Refunded</dt>
                <dd>{naira(order.payout.refunded_amount)}</dd>
              </div>
            ) : null}
            <div>
              <dt>Status</dt>
              <dd>{order.payout.status === "released" ? "Sent" : "Waiting"}</dd>
            </div>
          </dl>
          {isTailor && order.payout.failure_reason ? (
            <p className="notice bad">{order.payout.failure_reason}</p>
          ) : null}
        </div>
      ) : null}

      {/* Once she has the garment in her hands, both sides can say so. */}
      <OrderReviews orderId={order.id} />

      {order.status === "pending_payment" ? (
        <div className="row-actions">
          <button type="button" className="btn quiet" onClick={() => void act("cancel")} disabled={busy}>
            Cancel this order
          </button>
        </div>
      ) : null}
    </>
  );
}
