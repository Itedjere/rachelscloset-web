import { useState } from "react";
import { useAttachment } from "../hooks/useAttachment";
import { api, errorMessage } from "../lib/api";
import type { OrderStep } from "../types/api";
import AudioPlayer from "./AudioPlayer";
import StepPhotos from "./StepPhotos";

interface OrderTrackerProps {
  orderId: number;
  steps: OrderStep[];
  /** Only the tailor may tick, and photograph. The customer reads the list. */
  canTick: boolean;
  /** Ticking the last stage can change the order's status, so the page reloads. */
  onChanged: () => void;
}

/**
 * The production checklist. CLAUDE.md calls this the product, and it is.
 *
 * Everything else on this page is money and dates. This is the part that
 * answers the question the platform exists for -- "has she started?" -- and
 * it answers it without either side typing anything.
 */
export default function OrderTracker({ orderId, steps, canTick, onChanged }: OrderTrackerProps) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  // Held locally so a tick lands instantly under her thumb. The reload that
  // follows is what makes it true; this is only what she sees meanwhile.
  const [local, setLocal] = useState<Record<number, boolean>>({});

  const view = steps.map((step) => ({ ...step, complete: local[step.id] ?? step.complete }));
  const done = view.filter((step) => step.complete).length;

  async function toggle(step: OrderStep, next: boolean) {
    setBusyId(step.id);
    setProblem(null);
    setLocal((current) => ({ ...current, [step.id]: next }));

    try {
      await api.put(`/orders/${orderId}/steps/${step.id}`, { complete: next });
      onChanged();
    } catch (error: unknown) {
      // Put it back. A tick that did not save must not keep looking saved.
      setLocal((current) => ({ ...current, [step.id]: !next }));
      setProblem(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  if (steps.length === 0) return null;

  return (
    <div className="card tracker" style={{ marginBottom: 16 }}>
      <div className="tracker-head">
        <h2>Progress</h2>
        <strong>
          {done} of {steps.length}
        </strong>
      </div>

      <div
        className="tracker-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={done}
        aria-label={`${done} of ${steps.length} stages done`}
      >
        <span style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      <ol className="tracker-steps">
        {view.map((step) => (
          <TrackerRow
            key={step.id}
            orderId={orderId}
            step={step}
            canTick={canTick}
            busy={busyId === step.id}
            onToggle={(next) => void toggle(step, next)}
            onChanged={onChanged}
          />
        ))}
      </ol>

      {canTick ? (
        <p className="hint">
          Tap a circle as you finish that stage — she is told each time, and you can tap it
          again if you tapped the wrong one. Add a photo to show her the work.
        </p>
      ) : null}
    </div>
  );
}

interface TrackerRowProps {
  orderId: number;
  step: OrderStep;
  canTick: boolean;
  busy: boolean;
  onToggle: (next: boolean) => void;
  onChanged: () => void;
}

function TrackerRow({ orderId, step, canTick, busy, onToggle, onChanged }: TrackerRowProps) {
  const { objectUrl } = useAttachment(step.voice_note_url);

  /*
   * The circle is the whole control and it is 48px, because on a five-inch
   * screen in a workshop a small checkbox beside a line of text is a rule
   * written for people who can already read comfortably.
   */
  const mark = (
    <span className={`tracker-mark${step.complete ? " done" : ""}`} aria-hidden="true">
      {step.complete ? "✓" : step.position}
    </span>
  );

  return (
    <li className={`tracker-step${step.complete ? " done" : ""}`}>
      {canTick ? (
        <button
          type="button"
          className="tracker-tick"
          onClick={() => onToggle(!step.complete)}
          disabled={busy}
          aria-pressed={step.complete}
          aria-label={step.complete ? `Undo ${step.label}` : `Mark ${step.label} done`}
        >
          {mark}
        </button>
      ) : (
        mark
      )}

      <div className="tracker-body">
        <strong>{step.label}</strong>

        {step.instructions ? <p className="hint">{step.instructions}</p> : null}

        {/* Listening is how a tailor who reads poorly knows what this stage
            means, so the player sits on the row rather than behind a tap. */}
        {step.voice_note_url ? <AudioPlayer src={objectUrl} loading={!objectUrl} compact /> : null}

        {/* Proof. Showing the work is what makes the tick above checkable. */}
        <StepPhotos
          orderId={orderId}
          stepId={step.id}
          label={step.label}
          photos={step.photos ?? []}
          canEdit={canTick}
          onChanged={onChanged}
        />
      </div>
    </li>
  );
}
