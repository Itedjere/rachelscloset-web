import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, errorMessage } from "../../lib/api";
import { naira } from "../../lib/money";
import type { AdminDispute } from "../../types/api";

/**
 * The disputes queue.
 *
 * THE PLATFORM DOES NOT ADJUDICATE. Raising a dispute froze the money; this
 * screen puts both phone numbers in front of a person so the calls can be
 * made, and then carries out whatever was agreed on them. That is how the
 * business already resolves these, and a structured evidence exchange would be
 * inventing a process nobody asked for and few of these users could work.
 *
 * So the loudest thing on each card is not the complaint. It is the two
 * numbers and the amount being argued over.
 */
export default function Disputes() {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [settling, setSettling] = useState<AdminDispute | null>(null);

  const load = useCallback(async () => {
    setProblem(null);

    try {
      const response = await api.get<{ data: AdminDispute[] }>("/admin/disputes");
      setDisputes(response.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <div className="page-head">
        <h1>Disputes</h1>
        <p>
          Money held while somebody is unhappy. Ring them both, agree what should happen, then
          record it here — recording it is what actually moves the money.
        </p>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      {loading ? (
        <p className="empty">Loading…</p>
      ) : disputes.length === 0 ? (
        <p className="empty">Nothing is disputed. Good.</p>
      ) : (
        <div className="dispute-list">
          {disputes.map((dispute) => (
            <div className="card dispute-row" key={dispute.id}>
              <div className="dispute-row__head">
                <div>
                  <strong>{dispute.order?.garment ?? "Order"}</strong>
                  <div className="hint">
                    {dispute.order?.reference ?? "—"} ·{" "}
                    {new Date(dispute.created_at).toLocaleDateString()}
                    {dispute.opened_by_staff ? " · taken by phone" : ""}
                  </div>
                </div>
                <div className="dispute-row__held">
                  <span className="hint">Held</span>
                  <strong>{naira(dispute.order?.held ?? "0")}</strong>
                </div>
              </div>

              <p className="dispute__reason">{dispute.reason}</p>

              {/* The two calls. This is the screen. */}
              <div className="dispute-row__calls">
                <Party label="Customer" party={dispute.customer} />
                <Party label="Tailor" party={dispute.tailor} />
              </div>

              <div className="row-actions">
                <button type="button" className="btn" onClick={() => setSettling(dispute)}>
                  Record what was agreed
                </button>
                {dispute.order ? (
                  <Link className="btn quiet" to={`/admin/orders/${dispute.order.id}`}>
                    See the order
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {settling ? (
        <SettlePanel
          dispute={settling}
          onClose={() => setSettling(null)}
          onDone={() => {
            setSettling(null);
            void load();
          }}
        />
      ) : null}
    </>
  );
}

function Party({ label, party }: { label: string; party: AdminDispute["customer"] }) {
  if (!party) return null;

  return (
    <div className="dispute-party">
      <span className="hint">{label}</span>
      <strong>{party.name}</strong>
      {/* Tapping the number dials it — most of this work is done from a phone. */}
      <a className="dispute-party__phone" href={`tel:${party.phone}`}>
        {party.phone}
      </a>
      <a className="btn quiet" href={party.whatsapp} target="_blank" rel="noreferrer noopener">
        WhatsApp
      </a>
    </div>
  );
}

/**
 * Recording the decision.
 *
 * Three outcomes, because they are the three things that can happen to the
 * money: it goes back, it goes on, or nothing moves. A partial refund is the
 * first with an amount — and the balance goes to the tailor in the same act,
 * which is the split most of these negotiations actually end in. The figures
 * are shown before anything is sent, for the same reason the refund screen
 * shows them: this cannot be undone from here.
 */
function SettlePanel({
  dispute,
  onClose,
  onDone,
}: {
  dispute: AdminDispute;
  onClose: () => void;
  onDone: () => void;
}) {
  const paid = dispute.order?.paid ?? "0";
  const held = dispute.order?.held ?? "0";

  const [outcome, setOutcome] = useState<"refunded" | "released" | "withdrawn">("refunded");
  const [whole, setWhole] = useState(true);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const refunding = outcome !== "refunded" ? "0" : whole ? paid : amount === "" ? "0" : amount;

  const toTailor =
    outcome === "withdrawn"
      ? "0"
      : Math.max(0, Number(held) - Number(refunding)).toFixed(2);

  async function settle() {
    setBusy(true);
    setProblem(null);

    try {
      await api.post(`/admin/disputes/${dispute.id}/resolve`, {
        outcome,
        amount: outcome === "refunded" && !whole ? amount : undefined,
        note: note.trim() || undefined,
      });
      onDone();
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Record what was agreed">
      <div className="lightbox-inner confirm-panel" onClick={(event) => event.stopPropagation()}>
        <h2 style={{ fontSize: 18 }}>What did you agree?</h2>
        <p className="hint">
          {dispute.customer?.name} paid {naira(paid)}. We are holding {naira(held)} for{" "}
          {dispute.tailor?.name}.
        </p>

        {problem ? <p className="notice bad">{problem}</p> : null}

        <div className="choice-list">
          <Choice
            checked={outcome === "refunded"}
            onPick={() => setOutcome("refunded")}
            title="Money goes back to the customer"
            detail="All of it, or part of it with the rest paid to the tailor."
          />
          <Choice
            checked={outcome === "released"}
            onPick={() => setOutcome("released")}
            title="The tailor gets paid"
            detail="We agreed the work was right after all."
          />
          <Choice
            checked={outcome === "withdrawn"}
            onPick={() => setOutcome("withdrawn")}
            title="Nothing needs to move"
            detail="She rang to say it is sorted. The order carries on as normal."
          />
        </div>

        {outcome === "refunded" ? (
          <>
            <div className="choice-list">
              <Choice
                checked={whole}
                onPick={() => setWhole(true)}
                title={`All of it — ${naira(paid)}`}
                detail="The tailor is paid nothing for this order."
              />
              <Choice
                checked={!whole}
                onPick={() => setWhole(false)}
                title="Part of it"
                detail="The rest goes to the tailor."
              />
            </div>

            {!whole ? (
              <label className="field">
                <span>How much goes back to her</span>
                <input
                  type="number"
                  min="1"
                  max={paid}
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </label>
            ) : null}
          </>
        ) : null}

        <label className="field">
          <span>What was agreed, in a line. Both of them are shown this.</span>
          <textarea
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={2000}
            placeholder="Spoke to both on 20 Sept. Agreed half back, tailor keeps the rest for the fabric."
          />
        </label>

        {/* Said before it is sent, not after. This cannot be undone here. */}
        <dl className="facts">
          <div>
            <dt>Back to {dispute.customer?.name ?? "the customer"}</dt>
            <dd>{naira(refunding)}</dd>
          </div>
          <div>
            <dt>To {dispute.tailor?.name ?? "the tailor"}</dt>
            <dd>{naira(toTailor)}</dd>
          </div>
        </dl>

        <div className="row-actions">
          <button type="button" className="btn danger" disabled={busy} onClick={() => void settle()}>
            {busy ? "Sending…" : "Do it"}
          </button>
          <button type="button" className="btn quiet" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Choice({
  checked,
  onPick,
  title,
  detail,
}: {
  checked: boolean;
  onPick: () => void;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      className={`choice${checked ? " choice--on" : ""}`}
      onClick={onPick}
      aria-pressed={checked}
    >
      <strong>{title}</strong>
      <span className="hint">{detail}</span>
    </button>
  );
}
