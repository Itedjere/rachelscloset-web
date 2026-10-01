import { useState } from "react";
import ActionProblem from "./ActionProblem";
import { api, errorMessage } from "../lib/api";
import { longDate } from "../lib/format";
import { naira } from "../lib/money";
import type { Order } from "../types/api";
import Icon from "./Icon";
import MoneyInput from "./MoneyInput";

/**
 * Money handed over by hand, on a direct order.
 *
 * Nothing on a direct order passes through Rachels Closet -- the customer pays
 * her tailor in cash, by transfer or at a POS -- so the tailor says what she
 * was given and the customer is sent a receipt for it. This shows the list to
 * both of them, and to the tailor the way to add to it.
 *
 * The amount is CHOSEN before it is typed. "The deposit" and "everything she
 * still owes" are the two amounts that change hands nearly every time, and a
 * tap on one of them is a number nobody can mistype. Typing is the fallback.
 */
export default function DirectPayments({
  order,
  isTailor,
  onChanged,
}: {
  order: Order;
  isTailor: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<"deposit" | "all" | "other" | null>(null);
  const [other, setOther] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  // Where it failed: the form's button, or one entry's remove.
  const [failed, setFailed] = useState<{ at: "record" | number; message: string } | null>(null);

  const paid = Number(order.paid_total);
  const outstanding = Math.max(0, Number(order.amount) - paid);
  const depositLeft = Math.max(0, Number(order.deposit_amount) - paid);

  const finished = order.status === "completed" || order.status === "cancelled";
  const canRecord = isTailor && !finished && outstanding > 0;

  // Only offered while part of the deposit is still unpaid, and only when it
  // is not simply the whole balance (then the two buttons would say the same).
  const offerDeposit = depositLeft > 0 && depositLeft < outstanding;

  const amount =
    choice === "deposit" ? depositLeft : choice === "all" ? outstanding : Number(other || 0);

  async function record() {
    setBusy(true);
    setFailed(null);

    try {
      await api.post(`/orders/${order.id}/direct-payments`, { amount: amount.toFixed(2) });
      setOpen(false);
      setChoice(null);
      setOther("");
      onChanged();
    } catch (error: unknown) {
      setFailed({ at: "record", message: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    setFailed(null);

    try {
      await api.delete(`/orders/${order.id}/direct-payments/${id}`);
      setRemoving(null);
      onChanged();
    } catch (error: unknown) {
      setFailed({ at: id, message: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="direct-pay">
      {order.direct_payments.length > 0 ? (
        <ul className="direct-pay__list">
          {order.direct_payments.map((entry) => (
            <li key={entry.id}>
              <span className="direct-pay__amount">{naira(entry.amount)}</span>
              <span className="hint">
                {isTailor ? "You marked this paid" : "Your tailor marked this paid"} on{" "}
                {longDate(entry.paid_at)}
              </span>

              {/* Asked first: it changes what she is told she still owes. */}
              {isTailor && order.status !== "completed" ? (
                removing === entry.id ? (
                  <span className="direct-pay__confirm">
                    <button type="button" className="btn danger" onClick={() => void remove(entry.id)} disabled={busy}>
                      Yes, remove it
                    </button>
                    <button type="button" className="btn quiet" onClick={() => setRemoving(null)} disabled={busy}>
                      Keep it
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="direct-pay__remove"
                    onClick={() => setRemoving(entry.id)}
                    aria-label={`Remove ${naira(entry.amount)}, it was a mistake`}
                    title="That was a mistake"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                )
              ) : null}

              <ActionProblem message={failed?.at === entry.id ? failed.message : null} />
            </li>
          ))}
        </ul>
      ) : null}

      {/* The customer's side: nothing to press, only what to do. */}
      {!isTailor && !finished && outstanding > 0 ? (
        <p className="notice info">
          Pay your tailor directly — cash, bank transfer or POS. She will mark it here, and you
          will be told each time she does.
        </p>
      ) : null}

      {canRecord && !open ? (
        <button type="button" className="btn" onClick={() => setOpen(true)}>
          <Icon name="check" size={18} />
          She has paid me
        </button>
      ) : null}

      {canRecord && open ? (
        <div className="direct-pay__form">
          <p className="hint" style={{ margin: 0 }}>
            How much did she give you?
          </p>

          <div className="choice-list" style={{ margin: 0 }}>
            {offerDeposit ? (
              <button
                type="button"
                className={`choice${choice === "deposit" ? " choice--on" : ""}`}
                onClick={() => setChoice("deposit")}
              >
                <strong>{naira(depositLeft)}</strong>
                <span className="hint">The deposit</span>
              </button>
            ) : null}

            <button
              type="button"
              className={`choice${choice === "all" ? " choice--on" : ""}`}
              onClick={() => setChoice("all")}
            >
              <strong>{naira(outstanding)}</strong>
              <span className="hint">Everything she still owes</span>
            </button>

            <button
              type="button"
              className={`choice${choice === "other" ? " choice--on" : ""}`}
              onClick={() => setChoice("other")}
            >
              <strong>Another amount</strong>
            </button>
          </div>

          {choice === "other" ? (
            <MoneyInput value={other} onChange={setOther} max={outstanding.toFixed(2)} />
          ) : null}

          <p className="hint" style={{ margin: 0 }}>
            She will be sent a note of it, so she can check it is right.
          </p>

          <ActionProblem message={failed?.at === "record" ? failed.message : null} />

          <div className="row-actions" style={{ marginTop: 0 }}>
            <button
              type="button"
              className="btn"
              onClick={() => void record()}
              disabled={busy || choice === null || amount <= 0 || amount > outstanding}
            >
              {busy ? "Saving…" : amount > 0 ? `Mark ${naira(amount)} as paid` : "Mark as paid"}
            </button>
            <button
              type="button"
              className="btn quiet"
              onClick={() => {
                setOpen(false);
                setChoice(null);
              }}
              disabled={busy}
            >
              Not now
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
