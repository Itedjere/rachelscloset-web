import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MoneyInput from "../../components/MoneyInput";
import OrderStatusPill from "../../components/OrderStatusPill";
import { api, errorMessage } from "../../lib/api";
import { naira } from "../../lib/money";
import type { Order, ResourceResponse } from "../../types/api";

export default function AdminOrderDetail() {
  const { orderId } = useParams();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get<ResourceResponse<Order>>(`/admin/orders/${orderId}`);
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

  if (loading) return <p className="empty">Loading…</p>;
  if (!order) return <p className="notice bad">{problem ?? "Not found."}</p>;

  return (
    <>
      <div className="page-head">
        <Link className="back-link" to="/admin/orders">
          ← All orders
        </Link>
        <div className="order-head">
          <h1>{order.reference}</h1>
          <OrderStatusPill status={order.status} />
        </div>
        <p>
          {order.garment_type?.name}
          {order.description ? ` · ${order.description}` : ""}
        </p>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18 }}>Who</h2>
        <dl className="facts">
          <div>
            <dt>Customer</dt>
            <dd>
              {order.customer?.name} · {order.customer?.phone}
            </dd>
          </div>
          <div>
            <dt>Tailor</dt>
            <dd>
              {order.tailor?.name} · {order.tailor?.phone}
            </dd>
          </div>
        </dl>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18 }}>Money</h2>
        <dl className="facts">
          <div>
            <dt>Price</dt>
            <dd>{naira(order.amount)}</dd>
          </div>
          <div>
            <dt>Paid</dt>
            <dd>{naira(order.paid_total)}</dd>
          </div>
          <div>
            <dt>Held by Rachels Closet</dt>
            <dd>{order.escrow ? "Yes" : "No — paid direct to the tailor"}</dd>
          </div>
          {order.payout ? (
            <>
              <div>
                <dt>Refunded so far</dt>
                <dd>{naira(order.payout.refunded_amount)}</dd>
              </div>
              <div>
                <dt>Tailor owed</dt>
                <dd>{naira(order.payout.net_amount)}</dd>
              </div>
              <div>
                <dt>Payout</dt>
                <dd>{order.payout.status === "released" ? "Already sent" : "Not sent yet"}</dd>
              </div>
            </>
          ) : null}
        </dl>
      </div>

      {order.payments && order.payments.length > 0 ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18 }}>Payments</h2>
          <dl className="facts">
            {order.payments.map((payment) => (
              <div key={payment.id}>
                <dt>
                  {payment.reference}
                  <br />
                  <span className="hint">{payment.status}</span>
                </dt>
                <dd>{naira(payment.amount)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <RefundPanel order={order} onDone={load} />
    </>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * Issuing a refund.
 *
 * Two steps, never one. This moves real money out and cannot be undone from
 * here, so the figures it will produce are shown and confirmed before
 * anything is sent — the same reasoning as resolving a bank account before
 * paying into it.
 */
function RefundPanel({ order, onDone }: { order: Order; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const paid = Number(order.paid_total);
  const alreadyRefunded = Number(order.payout?.refunded_amount ?? 0);
  const released = order.payout?.status === "released";
  const value = Number(amount);

  // Every reason the server would refuse, said here instead of after a click.
  const blocked = released
    ? "This order has already been paid out to the tailor. Taking it back from the customer now would mean paying twice — that is a conversation with the tailor, not a button."
    : paid <= 0
      ? "Nothing has been paid on this order, so there is nothing to refund."
      : null;

  const valid = value > 0 && value <= paid - alreadyRefunded;

  async function refund() {
    setBusy(true);
    setProblem(null);

    try {
      await api.post(`/admin/orders/${order.id}/refund`, {
        amount: value,
        reason: reason || null,
      });
      setDone(`Refunded ${naira(value)}. The customer has been told.`);
      setAmount("");
      setReason("");
      setConfirming(false);
      onDone();
    } catch (error: unknown) {
      setProblem(errorMessage(error));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p className="notice info">{done}</p>;
  }

  return (
    <div className="card danger-card">
      <h2 style={{ fontSize: 18 }}>Refund</h2>

      {blocked ? (
        <p className="hint">{blocked}</p>
      ) : (
        <>
          <p className="hint">
            Part of an order is the usual case — a garment that was late, or not quite right.
            The tailor is owed whatever is left.
          </p>

          {problem ? <p className="notice bad">{problem}</p> : null}

          <div className="field">
            <label htmlFor="amount">How much to send back</label>
            <MoneyInput
              id="amount"
              value={amount}
              max={String(paid - alreadyRefunded)}
              onChange={(next) => {
                setAmount(next);
                // Any edit invalidates the figures already confirmed against.
                setConfirming(false);
              }}
            />
            <p className="hint">
              Up to {naira(paid - alreadyRefunded)} is still refundable on this order.
            </p>
          </div>

          <div className="field">
            <label htmlFor="reason">Why (the customer sees this)</label>
            <input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Delivered four days late."
            />
          </div>

          {confirming ? (
            <div className="confirm-box">
              <strong>Send {naira(value)} back to {order.customer?.name}?</strong>
              <dl className="facts" style={{ marginTop: 10 }}>
                <div>
                  <dt>Customer gets back</dt>
                  <dd>{naira(value)}</dd>
                </div>
                <div>
                  <dt>Tailor will be owed</dt>
                  <dd>{naira(Number(order.payout?.net_amount ?? paid) - value)}</dd>
                </div>
              </dl>
              <p className="hint">This cannot be undone from here.</p>

              <div className="row-actions">
                <button type="button" className="btn danger" onClick={() => void refund()} disabled={busy}>
                  {busy ? "Sending…" : "Yes, refund it"}
                </button>
                <button type="button" className="btn ghost" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="row-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setConfirming(true)}
                disabled={!valid}
              >
                Review this refund
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
