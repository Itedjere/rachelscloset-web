import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AudioPlayer from "../components/AudioPlayer";
import { useAttachment } from "../hooks/useAttachment";
import { useAuth } from "../hooks/useAuth";
import { api, errorMessage } from "../lib/api";
import type { Arrangement, ArrangedStep, GarmentType, LibraryStep, ResourceResponse } from "../types/api";

/**
 * The order the stages of a garment happen in.
 *
 * An admin edits the default everyone inherits; a tailor edits her own.
 * Same screen, because it is the same operation — the server decides whose
 * arrangement a request may write, so there is nothing here to get wrong.
 *
 * NO DRAG AND DROP. Up and down arrows, deliberately:
 *
 *   - Touch DnD fights page scroll. Nine steps do not fit on a 5-inch screen,
 *     so reordering means dragging *while* scrolling, which is the most
 *     fragile part of every DnD library on cheap Android with an old Chrome.
 *   - "Press and hold, then move" has no affordance a non-reader can decode.
 *     Arrows beside a numbered list are a picture of what will happen.
 *   - The arrows have to exist anyway for keyboard use, so DnD would mean two
 *     code paths mutating the same order.
 *
 * The interaction that actually matters is the play button on every row, so a
 * tailor can arrange the list by listening rather than reading.
 */
export default function ArrangementPage() {
  const { garmentTypeId } = useParams();
  const { user } = useAuth();

  const [garment, setGarment] = useState<GarmentType | null>(null);
  const [arrangement, setArrangement] = useState<Arrangement | null>(null);
  const [library, setLibrary] = useState<LibraryStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  const load = useCallback(async () => {
    try {
      const [types, current, steps] = await Promise.all([
        api.get<ResourceResponse<GarmentType[]>>("/garment-types"),
        api.get<ResourceResponse<Arrangement>>(`/garment-types/${garmentTypeId}/steps`),
        api.get<ResourceResponse<LibraryStep[]>>("/steps"),
      ]);

      setGarment(types.data.find((t) => String(t.id) === garmentTypeId) ?? null);
      setArrangement(current.data);
      setLibrary(steps.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [garmentTypeId]);

  useEffect(() => {
    void load();
  }, [load]);

  /*
   * Every change PUTs the whole ordered array. A move, an add and a removal
   * are the same request, it is idempotent, and there is no gap arithmetic to
   * get wrong — the server renumbers from one.
   */
  async function commit(steps: ArrangedStep[]) {
    setArrangement((current) => (current ? { ...current, steps } : current));
    setSaving(true);
    setProblem(null);

    try {
      const response = await api.put<ResourceResponse<Arrangement>>(
        `/garment-types/${garmentTypeId}/steps`,
        { steps: steps.map((s) => s.id) },
      );
      setArrangement(response.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
      void load();
    } finally {
      setSaving(false);
    }
  }

  function move(index: number, by: -1 | 1) {
    if (!arrangement) return;

    const next = [...arrangement.steps];
    const target = index + by;
    if (target < 0 || target >= next.length) return;

    const a = next[index];
    const b = next[target];
    if (!a || !b) return;

    next[index] = b;
    next[target] = a;

    void commit(next);
  }

  function remove(id: number) {
    if (!arrangement) return;
    void commit(arrangement.steps.filter((s) => s.id !== id));
  }

  function add(step: LibraryStep) {
    if (!arrangement) return;
    void commit([...arrangement.steps, { ...step, position: arrangement.steps.length + 1 }]);
  }

  async function resetToDefault() {
    setSaving(true);
    try {
      const response = await api.delete<ResourceResponse<Arrangement>>(
        `/garment-types/${garmentTypeId}/steps`,
      );
      setArrangement(response.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="empty">Loading…</p>;
  if (!arrangement) return <p className="notice bad">{problem ?? "Not found."}</p>;

  const used = new Set(arrangement.steps.map((s) => s.id));
  const unused = library.filter((s) => !used.has(s.id));

  return (
    <>
      <div className="page-head">
        <h1>{garment?.name ?? "Steps"}</h1>
        <p>
          {isAdmin
            ? "The standard order every tailor starts from."
            : arrangement.is_own
              ? "Your own order. Only you use this."
              : "The standard order. Change anything and it becomes your own."}
        </p>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      {arrangement.steps.length === 0 ? (
        <p className="empty">No steps yet. Add some from the list below.</p>
      ) : (
        <ol className="arrangement">
          {arrangement.steps.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              index={index}
              count={arrangement.steps.length}
              busy={saving}
              onUp={() => move(index, -1)}
              onDown={() => move(index, 1)}
              onRemove={() => remove(step.id)}
            />
          ))}
        </ol>
      )}

      {!isAdmin && arrangement.is_own ? (
        <div className="row-actions">
          <button type="button" className="btn ghost" onClick={() => void resetToDefault()} disabled={saving}>
            Go back to the standard order
          </button>
        </div>
      ) : null}

      {unused.length > 0 ? (
        <div className="card" style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18 }}>Add a stage</h2>
          <div className="chip-row">
            {unused.map((step) => (
              <button key={step.id} type="button" className="chip" disabled={saving} onClick={() => add(step)}>
                + {step.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------------ */

function StepCard({
  step,
  index,
  count,
  busy,
  onUp,
  onDown,
  onRemove,
}: {
  step: ArrangedStep;
  index: number;
  count: number;
  busy: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  const { objectUrl } = useAttachment(step.voice_note_url);

  return (
    <li className="arrangement__step">
      <span className="arrangement__number" aria-hidden="true">
        {index + 1}
      </span>

      <div className="arrangement__body">
        <h3>{step.label}</h3>
        {/* The play button is the point: a tailor arranges the list by
            listening to each stage, not by reading the labels. */}
        {step.voice_note_url ? (
          <AudioPlayer src={objectUrl} loading={!objectUrl} compact />
        ) : (
          <span className="silent">No recording yet</span>
        )}
      </div>

      <div className="arrangement__arrows">
        <button
          type="button"
          className="icon-btn"
          onClick={onUp}
          disabled={busy || index === 0}
          aria-label={`Move ${step.label} earlier`}
        >
          ↑
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={onDown}
          disabled={busy || index === count - 1}
          aria-label={`Move ${step.label} later`}
        >
          ↓
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={onRemove}
          disabled={busy}
          aria-label={`Remove ${step.label}`}
        >
          ✕
        </button>
      </div>
    </li>
  );
}
