import { useCallback, useEffect, useState } from "react";
import ActionProblem from "../../components/ActionProblem";
import AudioPlayer from "../../components/AudioPlayer";
import StepForm from "../../components/StepForm";
import { useAttachment } from "../../hooks/useAttachment";
import { api, errorMessage } from "../../lib/api";
import type { LibraryStep, ResourceResponse } from "../../types/api";

/**
 * The step library.
 *
 * An admin writes a label and records somebody saying what it means. The
 * recording is the part that matters: many tailors read poorly, so a step with
 * no voice note is a step half the platform cannot use. That is why the list
 * leads with whether each one has been recorded yet.
 */
export default function StepLibrary() {
  const [steps, setSteps] = useState<LibraryStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [editing, setEditing] = useState<LibraryStep | null>(null);
  const [showRetired, setShowRetired] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await api.get<ResourceResponse<LibraryStep[]>>(
        `/admin/steps${showRetired ? "?include_retired=1" : ""}`,
      );
      setSteps(response.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [showRetired]);

  useEffect(() => {
    void load();
  }, [load]);

  const silent = steps.filter((s) => !s.has_voice_note && !s.retired).length;

  return (
    <>
      <div className="page-head">
        <h1>Step library</h1>
        <p>Every stage a garment can pass through, and what each one sounds like.</p>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      {silent > 0 ? (
        <p className="notice info">
          {silent} {silent === 1 ? "step has" : "steps have"} no recording yet. A tailor who does not
          read well cannot use those.
        </p>
      ) : null}

      <div className="row-actions" style={{ marginTop: 0, marginBottom: 16 }}>
        <button type="button" className="btn" onClick={() => setEditing({ id: 0, label: "", instructions: "", voice_note_url: null })}>
          Add a step
        </button>
        <label className="switch-inline">
          <input type="checkbox" checked={showRetired} onChange={(e) => setShowRetired(e.target.checked)} />
          Show retired
        </label>
      </div>

      {editing ? (
        <StepForm
          step={editing}
          onDone={() => {
            setEditing(null);
            void load();
          }}
          onCancel={() => setEditing(null)}
        />
      ) : null}

      {loading ? (
        <p className="empty">Loading…</p>
      ) : steps.length === 0 ? (
        <p className="empty">No steps yet.</p>
      ) : (
        <div className="step-list">
          {steps.map((step) => (
            <StepRow key={step.id} step={step} onChanged={load} onEdit={() => setEditing(step)} />
          ))}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------------ */

function StepRow({
  step,
  onChanged,
  onEdit,
}: {
  step: LibraryStep;
  onChanged: () => void;
  onEdit: () => void;
}) {
  const { objectUrl } = useAttachment(step.voice_note_url);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function retire(retired: boolean) {
    setBusy(true);
    setProblem(null);

    try {
      await api.post(`/admin/steps/${step.id}/retire`, { retired });
      onChanged();
    } catch (error: unknown) {
      // It had no catch at all: a failed retire simply did nothing.
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`step-row${step.retired ? " retired" : ""}`}>
      <div className="step-row__main">
        <h3>{step.label}</h3>
        {step.instructions ? <p className="hint">{step.instructions}</p> : null}
      </div>

      <div className="step-row__voice">
        {step.voice_note_url ? (
          <AudioPlayer src={objectUrl} loading={!objectUrl} compact />
        ) : (
          <span className="silent">No recording</span>
        )}
      </div>

      <div className="step-row__actions">
        <button type="button" className="btn ghost" onClick={onEdit}>
          Edit
        </button>
        <button type="button" className="btn quiet" disabled={busy} onClick={() => void retire(!step.retired)}>
          {step.retired ? "Bring back" : "Retire"}
        </button>
      </div>

      <ActionProblem message={problem} />
    </article>
  );
}
