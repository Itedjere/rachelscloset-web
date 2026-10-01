import { useState } from "react";
import { useAttachment } from "../hooks/useAttachment";
import { api, errorMessage } from "../lib/api";
import { longDate } from "../lib/format";
import type { OrderStatus, OrderStep } from "../types/api";
import AudioPlayer from "./AudioPlayer";
import Icon from "./Icon";
import StepPhotos from "./StepPhotos";

interface OrderTrackerProps {
  orderId: number;
  steps: OrderStep[];
  /** The order's state, so the summary can say "once it is paid for". */
  status: OrderStatus;
  /** Only the tailor may tick, and photograph. The customer reads the list. */
  canTick: boolean;
  /** Whose screen this is, so every sentence is said to the right person. */
  isTailor: boolean;
  /** Ticking the last stage can change the order's status, so the page reloads. */
  onChanged: () => void;
}

type StageState = "done" | "current" | "upcoming";

/**
 * The production checklist. CLAUDE.md calls this the product, and it is.
 *
 * Everything else on the order page is money and dates. This answers the
 * question the platform exists for -- "has she started?" -- without either
 * side typing anything, so it is laid out to be read in one glance:
 *
 *   - a summary on top: how far, what is happening NOW, and when anything
 *     last happened. That last date is the honest answer to "has she
 *     started", and a tracker that has been quiet for a week says so;
 *   - one card per stage on a line, so the garment's journey is a shape
 *     before it is a list of words. Finished stages carry their date and
 *     photographs as proof; the stage under way is the one lit up; stages
 *     to come are quiet but keep their voice note, because listening is
 *     how somebody who reads poorly knows what a stage means.
 */
export default function OrderTracker({
  orderId,
  steps,
  status,
  canTick,
  isTailor,
  onChanged,
}: OrderTrackerProps) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  // Held locally so a tick lands instantly under her thumb. The reload that
  // follows is what makes it true; this is only what she sees meanwhile.
  const [local, setLocal] = useState<Record<number, boolean>>({});

  const view = steps.map((step) => ({ ...step, complete: local[step.id] ?? step.complete }));
  const done = view.filter((step) => step.complete).length;
  const total = view.length;
  const allDone = total > 0 && done === total;
  const unpaid = status === "pending_payment";

  /*
   * "Now" is the first stage not yet ticked. Stages can be ticked out of
   * order -- the beading is sometimes done before the hem -- but the first
   * gap is still the honest answer to "what is she on".
   */
  const currentId = unpaid ? null : (view.find((step) => !step.complete)?.id ?? null);
  const current = view.find((step) => step.id === currentId) ?? null;

  const lastFinished = view
    .filter((step) => step.complete && step.completed_at)
    .map((step) => step.completed_at as string)
    .sort()
    .at(-1);

  async function toggle(step: OrderStep, next: boolean) {
    setBusyId(step.id);
    setProblem(null);
    setLocal((existing) => ({ ...existing, [step.id]: next }));

    try {
      await api.put(`/orders/${orderId}/steps/${step.id}`, { complete: next });
      onChanged();
    } catch (error: unknown) {
      // Put it back. A tick that did not save must not keep looking saved.
      setLocal((existing) => ({ ...existing, [step.id]: !next }));
      setProblem(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  if (total === 0) return null;

  return (
    <section className="card tracker" aria-labelledby="tracker-title" style={{ marginBottom: 16 }}>
      <header className="tracker-summary">
        <ProgressRing done={done} total={total} complete={allDone} />

        <div className="tracker-summary__text">
          <p className="tracker-eyebrow" id="tracker-title">
            How it is going
          </p>
          <h2 className="tracker-headline">
            {headline({ unpaid, allDone, done, current, isTailor })}
          </h2>
          <p className="tracker-sub">
            {subline({ unpaid, allDone, done, lastFinished, isTailor })}
          </p>
        </div>
      </header>

      {problem ? <p className="notice bad">{problem}</p> : null}

      <ol className="stages">
        {view.map((step) => {
          const state: StageState = step.complete
            ? "done"
            : step.id === currentId
              ? "current"
              : "upcoming";

          return (
            <Stage
              key={step.id}
              orderId={orderId}
              step={step}
              state={state}
              canTick={canTick}
              isTailor={isTailor}
              busy={busyId === step.id}
              onToggle={(next) => void toggle(step, next)}
              onChanged={onChanged}
            />
          );
        })}
      </ol>

      {canTick ? (
        <p className="hint tracker-foot">
          Tap a circle as you finish that stage — she is told each time. Tapped the wrong one?
          Tap it again. Add a photo to show her the work.
        </p>
      ) : null}
    </section>
  );
}

/* ---- The summary --------------------------------------------------------- */

function headline({
  unpaid,
  allDone,
  done,
  current,
  isTailor,
}: {
  unpaid: boolean;
  allDone: boolean;
  done: number;
  current: OrderStep | null;
  isTailor: boolean;
}): string {
  if (unpaid) return isTailor ? "Waiting for her to pay" : "Starts once you pay";
  if (allDone) return "Every stage is finished";
  if (done === 0) return isTailor ? `Start with ${current?.label ?? "the first stage"}` : "Not started yet";

  return `Now: ${current?.label ?? "the next stage"}`;
}

function subline({
  unpaid,
  allDone,
  done,
  lastFinished,
  isTailor,
}: {
  unpaid: boolean;
  allDone: boolean;
  done: number;
  lastFinished: string | undefined;
  isTailor: boolean;
}): string {
  if (unpaid) {
    return isTailor
      ? "These are the stages she will see you tick off."
      : "These are the stages your clothes will go through. You will see each one as it is finished.";
  }

  if (done === 0) {
    return isTailor
      ? "She is told each time you finish a stage."
      : "You will be told as soon as your tailor finishes the first stage.";
  }

  const when = lastFinished ? longDate(lastFinished) : null;

  if (allDone) return when ? `The last stage was finished on ${when}.` : "Nothing is left to do.";

  return when ? `Last stage finished on ${when}.` : `${done} finished so far.`;
}

/**
 * How far along, as a shape. A ring rather than a bar because it can hold
 * the count in its middle, which is the one number anybody wants.
 */
function ProgressRing({ done, total, complete }: { done: number; total: number; complete: boolean }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const filled = total === 0 ? 0 : (done / total) * circumference;

  return (
    <div
      className={`ring${complete ? " is-complete" : ""}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-label={`${done} of ${total} stages done`}
    >
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle className="ring__track" cx="40" cy="40" r={radius} />
        {/* Not drawn at zero: a round line cap on an empty arc is a dot,
            which reads as "a little done" on an order nobody has touched. */}
        {done > 0 ? (
          <circle
            className="ring__fill"
            cx="40"
            cy="40"
            r={radius}
            strokeDasharray={`${filled} ${circumference}`}
          />
        ) : null}
      </svg>
      <span className="ring__count" aria-hidden="true">
        <strong>{done}</strong>
        <span>of {total}</span>
      </span>
    </div>
  );
}

/* ---- One stage ----------------------------------------------------------- */

interface StageProps {
  orderId: number;
  step: OrderStep;
  state: StageState;
  canTick: boolean;
  isTailor: boolean;
  busy: boolean;
  onToggle: (next: boolean) => void;
  onChanged: () => void;
}

function Stage({ orderId, step, state, canTick, isTailor, busy, onToggle, onChanged }: StageProps) {
  const { objectUrl } = useAttachment(step.voice_note_url);
  const photos = step.photos ?? [];

  /*
   * The circle is the control, and it is 48px, because on a five-inch
   * screen in a workshop a small checkbox beside a line of text is a rule
   * written for people who can already read comfortably.
   */
  const mark = (
    <span className="stage__mark" aria-hidden="true">
      {state === "done" ? <Icon name="check" size={22} /> : step.position}
    </span>
  );

  return (
    <li className={`stage is-${state}`} aria-current={state === "current" ? "step" : undefined}>
      {canTick ? (
        <button
          type="button"
          className="stage__tick"
          onClick={() => onToggle(state !== "done")}
          disabled={busy}
          aria-pressed={state === "done"}
          aria-label={state === "done" ? `Undo ${step.label}` : `Mark ${step.label} done`}
        >
          {mark}
        </button>
      ) : (
        <span className="stage__tick">{mark}</span>
      )}

      <div className="stage__card">
        <div className="stage__top">
          <h3 className="stage__label">{step.label}</h3>

          {state === "current" ? (
            <span className="stage__badge">{isTailor ? "Next" : "Now"}</span>
          ) : null}
          {state === "done" && step.completed_at ? (
            <span className="stage__when">{longDate(step.completed_at)}</span>
          ) : null}
        </div>

        {/* Instructions are for the stage being worked on. On a finished or
            future one they are a paragraph nobody needs yet. */}
        {state === "current" && step.instructions ? (
          <p className="stage__instructions">{step.instructions}</p>
        ) : null}

        {/* On every stage, finished or not: listening is how a tailor who
            reads poorly knows what a stage means. */}
        {step.voice_note_url ? <AudioPlayer src={objectUrl} loading={!objectUrl} compact /> : null}

        {/* Proof. A future stage has none, and an empty camera slot on it
            would invite a photograph of work not started. */}
        {state !== "upcoming" || photos.length > 0 ? (
          <StepPhotos
            orderId={orderId}
            stepId={step.id}
            label={step.label}
            photos={photos}
            canEdit={canTick}
            onChanged={onChanged}
          />
        ) : null}

        {/* The one place her thumb should go. The circle does the same, but
            a labelled button on the stage being worked on is what somebody
            new to this screen will find first. */}
        {canTick && state === "current" ? (
          <button
            type="button"
            className="btn stage__finish"
            onClick={() => onToggle(true)}
            disabled={busy}
          >
            <Icon name="check" size={18} />
            {/* Three words, never wrapping: "I have finished this" broke onto
                three lines inside the card on a phone. */}
            {busy ? "Saving…" : "Mark as done"}
          </button>
        ) : null}
      </div>
    </li>
  );
}
