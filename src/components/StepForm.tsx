import { useState } from "react";
import { useUploadLimit } from "../hooks/useUploadLimit";
import { api, errorMessage } from "../lib/api";
import type { LibraryStep, ResourceResponse } from "../types/api";
import ActionProblem from "./ActionProblem";
import VoiceNoteRecorder from "./VoiceNoteRecorder";

/**
 * Writing a stage of the library: its name, notes, and -- the part that
 * matters -- a recording of somebody saying what it means.
 *
 * Shared by the step library and a garment's stage page, so an admin looking
 * at "the stages of an agbada" can record the voice note right there instead
 * of hunting for the stage in a separate screen. Either way it is the SAME
 * library stage: "Cutting" means the same thing on every garment, so a
 * recording made from one garment's page plays on all of them -- and the form
 * says so, because that is the thing an admin would not otherwise guess.
 */
export default function StepForm({
  step,
  onDone,
  onCancel,
  title,
}: {
  step: LibraryStep;
  /** Given the saved stage, so a new one can be added straight to a garment. */
  onDone: (saved: LibraryStep) => void;
  onCancel: () => void;
  /** Overrides the heading, e.g. "New stage for Agbada". */
  title?: string;
}) {
  const limit = useUploadLimit();
  const [label, setLabel] = useState(step.label);
  const [instructions, setInstructions] = useState(step.instructions ?? "");
  const [note, setNote] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const isNew = step.id === 0;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setProblem(null);

    try {
      const body = { label, instructions };

      const saved = isNew
        ? await api.post<ResourceResponse<LibraryStep>>("/admin/steps", body)
        : await api.put<ResourceResponse<LibraryStep>>(`/admin/steps/${step.id}`, body);

      if (note) {
        const form = new FormData();
        form.append("voice_note", note);
        await api.post(`/admin/steps/${saved.data.id}/voice-note`, form);
      }

      onDone(saved.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={save} style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 18 }}>{title ?? (isNew ? "New stage" : `Edit ${step.label}`)}</h2>

      <div className="field">
        <label htmlFor="label">What is this stage called?</label>
        <input id="label" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="instructions">Notes for the tailor</label>
        <input
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
        <p className="hint">Written notes are a convenience. The recording below is what most people will use.</p>
      </div>

      <div className="field">
        <label>Say what this stage means</label>
        <VoiceNoteRecorder value={note} onChange={setNote} limit={limit} />
        <p className="hint">This recording plays for this stage on every garment that uses it.</p>
        {!isNew && step.voice_note_url ? (
          <p className="hint">
            This stage already has a recording. Adding a new one replaces it going forward — orders
            already in progress keep the one they were given.
          </p>
        ) : null}
      </div>

      {/* Just above Save: the recorder and the instructions sit between the
          top of this form and its button. */}
      <ActionProblem message={problem} />

      <div className="row-actions">
        <button type="submit" className="btn" disabled={busy || label.trim() === ""}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
