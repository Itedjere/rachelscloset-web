import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "../lib/api";
import { naira } from "../lib/money";
import type { OrderDispute as Dispute } from "../types/api";

/**
 * Saying something is wrong, and seeing what came of it.
 *
 * Deliberately one button and one sentence. The next thing that happens is a
 * person telephoning her, so a form asking her to categorise the problem,
 * grade its severity and attach evidence would only be asking her to do badly
 * in writing what she is about to do well out loud.
 *
 * Both sides see this block once a dispute exists — the tailor finding out
 * from the platform is kinder than being ambushed by the phone call.
 */
export default function OrderDispute({
  orderId,
  isTailor,
  onChanged,
  onOpenChange,
}: {
  orderId: number;
  isTailor: boolean;
  onChanged?: () => void;
  /** So the page can stop offering buttons the server would now refuse. */
  onOpenChange?: (open: boolean) => void;
}) {
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [canRaise, setCanRaise] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  /*
   * Through a ref, because the parent passes an inline arrow: in the
   * dependency list it would reload on every render of the page, and out of
   * it the callback would be the one from the first render for ever.
   */
  const report = useRef(onOpenChange);
  report.current = onOpenChange;

  const load = useCallback(async () => {
    try {
      const response = await api.get<{ data: Dispute | null; can_raise: boolean }>(
        `/orders/${orderId}/dispute`,
      );
      setDispute(response.data);
      setCanRaise(response.can_raise);
      report.current?.(response.data?.status === "open");
    } catch {
      // A dispute block that cannot load is not worth an error on a page
      // about somebody's clothes. The rest of the order still reads.
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function raise() {
    setBusy(true);
    setProblem(null);

    try {
      const response = await api.post<{ data: Dispute }>(`/orders/${orderId}/dispute`, {
        reason: reason.trim(),
      });
      setDispute(response.data);
      setCanRaise(false);
      setOpen(false);
      report.current?.(true);
      setReason("");
      onChanged?.();
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  if (dispute) {
    return (
      <div className={`card dispute dispute--${dispute.status}`}>
        <h2 style={{ fontSize: 18 }}>
          {dispute.status === "open" ? "We are looking into this" : "This was settled"}
        </h2>

        <p className="dispute__reason">“{dispute.reason}”</p>
        <p className="hint">
          {dispute.opened_by_staff
            ? "Taken down over the phone by us."
            : `Raised by ${dispute.raised_by?.name ?? "the customer"}.`}
        </p>

        {dispute.status === "open" ? (
          <p className="notice">
            {isTailor
              ? "The money for this order is held until we have spoken to both of you. We will call."
              : "Your money is held here until we have spoken to you both. We will call you."}
          </p>
        ) : (
          <Outcome dispute={dispute} isTailor={isTailor} />
        )}
      </div>
    );
  }

  // Nothing has gone wrong, and she is not in a position to say it has.
  if (!canRaise) return null;

  return (
    <div className="card">
      <h2 style={{ fontSize: 18 }}>Is something wrong with this order?</h2>
      <p className="hint">
        Tell us and we will hold the money here while we call you and your tailor.
      </p>

      {problem ? <p className="notice bad">{problem}</p> : null}

      {open ? (
        <>
          <label className="field">
            <span>What is wrong? A sentence is enough — we will ring you.</span>
            <textarea
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={2000}
              placeholder="The gown does not fit and the colour is not what I chose."
            />
          </label>

          <div className="row-actions">
            <button
              type="button"
              className="btn danger"
              disabled={busy || reason.trim().length < 4}
              onClick={() => void raise()}
            >
              {busy ? "Sending…" : "Tell us about it"}
            </button>
            <button type="button" className="btn quiet" onClick={() => setOpen(false)} disabled={busy}>
              Never mind
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="btn quiet" onClick={() => setOpen(true)}>
          Something is wrong
        </button>
      )}
    </div>
  );
}

/** What was decided, said the same way to both people. */
function Outcome({ dispute, isTailor }: { dispute: Dispute; isTailor: boolean }) {
  const refunded = dispute.refunded_amount;

  return (
    <>
      <p className="notice">
        {dispute.outcome === "withdrawn"
          ? "Nothing needed to change, so the order carried on as normal."
          : dispute.outcome === "released"
            ? isTailor
              ? "We agreed the work was right. You were paid in full."
              : "We agreed the work was right, so your tailor was paid."
            : isTailor
              ? `${naira(refunded ?? "0")} went back to your customer. Anything left over was paid to you.`
              : `${naira(refunded ?? "0")} went back to you.`}
      </p>

      {dispute.resolution_note ? <p className="hint">{dispute.resolution_note}</p> : null}
    </>
  );
}
