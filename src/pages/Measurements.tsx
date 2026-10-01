import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import AttachmentView from "../components/AttachmentView";
import ClaimInvite from "../components/ClaimInvite";
import Icon from "../components/Icon";
import { useAuth } from "../hooks/useAuth";
import { api, errorMessage } from "../lib/api";
import { longDate } from "../lib/format";
import { shrinkImage } from "../lib/image";
import type { MeasurementSet } from "../types/api";

/** The customer the list belongs to, returned alongside it. */
interface ListedCustomer {
  id: number;
  name: string;
  claimed: boolean;
}

/**
 * Somebody's measuring history.
 *
 * One page for two readers: a customer looking at her own, and a tailor
 * looking at a customer's. The difference is who may add to it, not what it
 * looks like -- the record is the same record.
 *
 * The photograph is the record. It is shown large and first; the typed
 * numbers, where a tailor bothered to enter them, sit underneath.
 */
export default function Measurements() {
  const { customerId } = useParams();
  const { user } = useAuth();

  const mine = !customerId;
  const whose = customerId ?? user?.id;

  const [sets, setSets] = useState<MeasurementSet[]>([]);
  const [customer, setCustomer] = useState<ListedCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  const load = useCallback(async () => {
    if (!whose) return;

    try {
      const response = await api.get<{ data: MeasurementSet[]; customer: ListedCustomer }>(
        `/customers/${whose}/measurements`,
      );
      setSets(response.data);
      setCustomer(response.customer);
      setProblem(null);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [whose]);

  useEffect(() => {
    void load();
  }, [load]);

  const canRecord = !mine && user?.role === "tailor";

  if (loading) return <p className="empty">Loading…</p>;

  return (
    <>
      <div className="page-head">
        <h1>{mine ? "Your measurements" : `${customer?.name ?? "Customer"}’s measurements`}</h1>
        <p>
          {mine
            ? "Every time you have been measured. Only you, and tailors you allow, can see these."
            : "The photograph is the record. Add a new one each time you measure her."}
        </p>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      {/* An unclaimed profile cannot see any of this, so offer the invite
          right where the tailor is already standing with her. */}
      {canRecord && customer && !customer.claimed ? (
        <ClaimInvite customer={customer} />
      ) : null}

      {canRecord ? (
        recording ? (
          <RecordForm
            customerId={customerId!}
            onDone={() => {
              setRecording(false);
              void load();
            }}
            onCancel={() => setRecording(false)}
          />
        ) : (
          <button
            type="button"
            className="btn"
            style={{ marginBottom: 16 }}
            onClick={() => setRecording(true)}
          >
            <Icon name="camera" size={18} /> Photograph her measurements
          </button>
        )
      ) : null}

      {sets.length === 0 ? (
        <p className="empty">
          {mine
            ? "Nothing yet. Your tailor photographs your measurements when she takes them."
            : "Nothing recorded yet."}
        </p>
      ) : (
        <div className="measurement-list">
          {sets.map((set) => (
            <MeasurementCard key={set.id} set={set} canDelete={mine} onDeleted={load} />
          ))}
        </div>
      )}
    </>
  );
}

function MeasurementCard({
  set,
  canDelete,
  onDeleted,
}: {
  set: MeasurementSet;
  canDelete: boolean;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setProblem(null);

    try {
      await api.delete(`/measurements/${set.id}`);
      onDeleted();
    } catch (error: unknown) {
      // It used to have no catch at all: a failed delete simply did nothing.
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card measurement">
      <div className="measurement-head">
        <div>
          <strong>{set.label ?? "Measurements"}</strong>
          <div className="hint">
            {longDate(set.taken_on ?? set.created_at)}
            {set.recorded_by ? ` · by ${set.recorded_by.name}` : ""}
          </div>
        </div>
      </div>

      {/* The record itself. */}
      <AttachmentView url={set.photo_url} kind="image" alt={set.label ?? "Measurements"} />

      {set.values.length > 0 ? (
        <dl className="measurement-values">
          {set.values.map((value) => (
            <div key={value.id}>
              <dt>{value.label}</dt>
              <dd>
                {value.value}
                {value.unit ? ` ${value.unit}` : ""}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {set.notes ? <p className="hint">{set.notes}</p> : null}

      {canDelete ? (
        <div className="row-actions">
          {confirming ? (
            <>
              <button type="button" className="btn danger" onClick={() => void remove()} disabled={busy}>
                {busy ? "Deleting…" : "Yes, delete it"}
              </button>
              <button type="button" className="btn quiet" onClick={() => setConfirming(false)}>
                Keep it
              </button>
            </>
          ) : (
            <button type="button" className="btn quiet" onClick={() => setConfirming(true)}>
              Delete
            </button>
          )}
        </div>
      ) : null}

      {problem ? <p className="notice bad">{problem}</p> : null}
    </div>
  );
}

/**
 * Recording a measuring.
 *
 * The photograph is required and everything else is not, which is the whole
 * design: a tailor who reads poorly photographs the page of her book and is
 * finished. The number rows are there for the one who wants them searchable,
 * and they are added one at a time rather than presented as a form of twelve
 * empty boxes -- an empty form reads as work you have failed to do.
 */
function RecordForm({
  customerId,
  onDone,
  onCancel,
}: {
  customerId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [values, setValues] = useState<{ label: string; value: string; unit: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return setPreview(null);

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function save() {
    if (!file) return setProblem("A photograph of the measurements is needed.");

    setBusy(true);
    setProblem(null);

    try {
      const form = new FormData();
      // "document": this is handwriting, and 512px would destroy it.
      form.append("photo", await shrinkImage(file, "document"));
      if (label) form.append("label", label);
      if (notes) form.append("notes", notes);

      values
        .filter((row) => row.label.trim() && row.value.trim())
        .forEach((row, index) => {
          form.append(`values[${index}][label]`, row.label);
          form.append(`values[${index}][value]`, row.value);
          if (row.unit) form.append(`values[${index}][unit]`, row.unit);
        });

      await api.post(`/customers/${customerId}/measurements`, form);
      onDone();
    } catch (error: unknown) {
      setProblem(errorMessage(error));
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 18 }}>New measurements</h2>

      <button
        type="button"
        className="measurement-shot"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
      >
        {preview ? (
          <img src={preview} alt="The measurements you just photographed" />
        ) : (
          <>
            <Icon name="camera" size={28} />
            <span>Photograph the page of your book</span>
          </>
        )}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        hidden
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />

      <label className="field">
        <span>What is it for? (optional)</span>
        <input
          type="text"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Wedding"
          maxLength={120}
        />
      </label>

      <label className="field">
        <span>Anything to remember? (optional)</span>
        <textarea
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Wants it loose at the waist"
          maxLength={2000}
        />
      </label>

      {values.map((row, index) => (
        <div className="measurement-row" key={index}>
          <input
            type="text"
            value={row.label}
            placeholder="Bust"
            aria-label="What was measured"
            onChange={(event) =>
              setValues((rows) =>
                rows.map((r, i) => (i === index ? { ...r, label: event.target.value } : r)),
              )
            }
          />
          <input
            type="text"
            value={row.value}
            placeholder="38"
            aria-label="The number"
            onChange={(event) =>
              setValues((rows) =>
                rows.map((r, i) => (i === index ? { ...r, value: event.target.value } : r)),
              )
            }
          />
          <button
            type="button"
            className="btn quiet"
            aria-label="Remove this line"
            onClick={() => setValues((rows) => rows.filter((_, i) => i !== index))}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}

      <button
        type="button"
        className="btn quiet"
        onClick={() => setValues((rows) => [...rows, { label: "", value: "", unit: "" }])}
      >
        Add a number
      </button>

      {/* Just above Save: the form is long, and on a phone the top of it is a
          scroll away from the button that failed. */}
      {problem ? <p className="notice bad" style={{ marginTop: 16 }}>{problem}</p> : null}

      <div className="row-actions" style={{ marginTop: 16 }}>
        <button type="button" className="btn" onClick={() => void save()} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn quiet" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}
