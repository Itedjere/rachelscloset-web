import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Avatar from "../components/Avatar";
import ClaimInvite from "../components/ClaimInvite";
import Icon from "../components/Icon";
import OrderStatusPill from "../components/OrderStatusPill";
import OrderPhotos from "../components/OrderPhotos";
import OrderDispute from "../components/OrderDispute";
import OrderReviews from "../components/OrderReviews";
import OrderTracker from "../components/OrderTracker";
import { useAuth } from "../hooks/useAuth";
import { api, errorMessage } from "../lib/api";
import { longDate } from "../lib/format";
import { naira } from "../lib/money";
import type { Order, ResourceResponse } from "../types/api";

export default function OrderDetail() {
  const { orderId } = useParams();
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [disputed, setDisputed] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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

  async function act(path: string, body?: unknown) {
    setBusy(true);
    setProblem(null);

    try {
      const response = await api.post<ResourceResponse<Order>>(`/orders/${orderId}/${path}`, body);
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

      {/*
        A customer added from the shop floor cannot sign in, so she cannot pay
        and the tracker she is meant to be watching reaches nobody. The invite
        lives here, not only on the new-order screen, so leaving that screen
        before she scanned does not lose it.
      */}
      {isTailor && order.customer && !order.customer.claimed ? (
        <ClaimInvite
          customer={order.customer}
          why="Until she does, she cannot pay for this order or see the work as you tick it off."
        />
      ) : null}

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
            {/*
              "Held by us" made a tailor ask who "us" is. The platform is
              named, and the sentence says what will happen to her money
              rather than naming the arrangement it is under -- nobody on
              either side of this has ever used the word escrow.
            */}
            <dt>Where the money is</dt>
            <dd>
              {order.escrow
                ? isTailor
                  ? "Rachel's Closet is keeping it until she has the clothes"
                  : "Rachel's Closet is keeping it until you have your clothes"
                : isTailor
                  ? "Paid straight to you"
                  : "Paid straight to your tailor"}
            </dd>
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
                <dd>{longDate(order.due_date)}</dd>
              </div>
            ) : null}
            {order.collection_deadline ? (
              <div>
                <dt>Collect by</dt>
                <dd>{longDate(order.collection_deadline)}</dd>
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

        </div>
      ) : null}

      {/*
        SHE SAYS WHICH, because the two are not the same event and the escrow
        clock depends on the difference. A customer standing in the shop has
        the garment the moment this is tapped; a customer four hundred
        kilometres away has a tracking number and a week to wait. Two buttons
        rather than a checkbox: a choice you make by reading a label and
        ticking a box is the shape this platform avoids everywhere else.
      */}
      {isTailor && order.status === "ready" ? (
        <div className="card">
          <h2 style={{ fontSize: 18 }}>Has it gone?</h2>
          <p className="hint">
            If you posted it, your money waits until she says it reached her.
          </p>
          <div className="row-actions">
            <button
              type="button"
              className="btn"
              onClick={() => void act("collected", { posted: false })}
              disabled={busy}
            >
              She collected it from me
            </button>
            <button
              type="button"
              className="btn quiet"
              onClick={() => void act("collected", { posted: true })}
              disabled={busy}
            >
              I sent it to her
            </button>
          </div>
        </div>
      ) : null}

      {/*
        The other half of that: a parcel in the post has not arrived until she
        says so, and nothing else on the platform can know when it did.
      */}
      {!isTailor && order.status === "collected" && !order.received_at ? (
        <div className="card">
          <h2 style={{ fontSize: 18 }}>Has it reached you?</h2>
          <p className="hint">
            Your tailor posted this one to you. Tap here when it reaches you, and Rachel's
            Closet starts counting the few days before she is paid.
          </p>
          <button type="button" className="btn" onClick={() => void act("received")} disabled={busy}>
            It arrived
          </button>
        </div>
      ) : null}

      {/*
        The customer saying she is happy is the fast path out of escrow -- once
        the person who paid says the garment is right there is nothing left to
        wait for.
      */}
      {!isTailor && order.status === "collected" && order.escrow && order.received_at && !disputed ? (
        <div className="card">
          <h2 style={{ fontSize: 18 }}>Is everything right?</h2>
          <p className="hint">
            Saying yes sends your tailor her money straight away. If you say nothing, Rachel's
            Closet sends it to her after a few days anyway.
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
          <p className="hint">The waiting time is over. Send it to your bank account.</p>
          <button type="button" className="btn" onClick={() => void act("release")} disabled={busy}>
            Send me my money
          </button>
        </div>
      ) : null}

      {order.payout ? (
        <div className="card">
          <h2 style={{ fontSize: 18 }}>
            {isTailor ? "Your money for this job" : "Your tailor's money"}
          </h2>
          <dl className="facts">
            <div>
              <dt>{isTailor ? "You will get" : "She will get"}</dt>
              <dd>{naira(order.payout.net_amount)}</dd>
            </div>
            {Number(order.payout.refunded_amount) > 0 ? (
              <div>
                <dt>{isTailor ? "Sent back to your customer" : "Sent back to you"}</dt>
                <dd>{naira(order.payout.refunded_amount)}</dd>
              </div>
            ) : null}
            <div>
              {/* "Status: Waiting" told nobody what it was waiting for. */}
              <dt>Sent to the bank?</dt>
              <dd>
                {order.payout.status === "released"
                  ? isTailor
                    ? "Yes, it is on its way to you"
                    : "Yes, she has been paid"
                  : isTailor
                    ? "Not yet"
                    : "Not yet — after you have the clothes"}
              </dd>
            </div>
          </dl>
          {isTailor && order.payout.failure_reason ? (
            <p className="notice bad">{order.payout.failure_reason}</p>
          ) : null}
        </div>
      ) : null}

      {/* Her photographs of the finished garment, which become the tailor's
          gallery. Shown before the reviews: it is the nicer thing to do
          first, and it is the one that helps the tailor most. */}
      {/* Both sides see this once it exists; only the customer can start it,
          and only once the garment is in her hands. */}
      <OrderDispute
        orderId={order.id}
        isTailor={isTailor}
        onChanged={() => void load()}
        onOpenChange={setDisputed}
      />

      <OrderPhotos orderId={order.id} isTailor={isTailor} />

      {/* Once she has the garment in her hands, both sides can say so. */}
      <OrderReviews orderId={order.id} />

      {/* Asked about first. It cannot be undone, and on a five-inch screen it
          is one thumb's slip from whatever was scrolled past last. */}
      {order.status === "pending_payment" ? (
        <div className="row-actions">
          <button type="button" className="btn quiet" onClick={() => setCancelling(true)} disabled={busy}>
            Cancel this order
          </button>
        </div>
      ) : null}

      {cancelling && order.status === "pending_payment" ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Cancel this order">
          <div className="lightbox-inner confirm-panel">
            <h2 style={{ fontSize: 18 }}>Cancel this order?</h2>
            <p className="hint">
              {/* Nobody is told by the platform, so she is reminded to say it herself. */}
              {isTailor
                ? `It cannot be undone. To make it after all, you would open a new order. Nothing has been paid, so no money moves. Rachel's Closet does not tell ${other?.name ?? "your customer"} — let her know yourself.`
                : `It cannot be undone. Nothing has been paid, so no money moves. Rachel's Closet does not tell ${other?.name ?? "your tailor"} — let her know yourself.`}
            </p>

            <div className="row-actions">
              <button
                type="button"
                className="btn danger"
                disabled={busy}
                onClick={() => void act("cancel").then(() => setCancelling(false))}
              >
                {busy ? "Cancelling…" : "Yes, cancel it"}
              </button>
              <button type="button" className="btn quiet" disabled={busy} onClick={() => setCancelling(false)}>
                Keep the order
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
