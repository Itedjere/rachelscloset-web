import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ActionProblem from "../components/ActionProblem";
import { useAuth } from "../hooks/useAuth";
import { useReorder } from "../hooks/useReorder";
import { api, errorMessage } from "../lib/api";
import type { GarmentType, ResourceResponse } from "../types/api";

/**
 * The kinds of thing a tailor makes.
 *
 * An admin curates the list and its order; everybody else reads it and picks
 * one to see or adjust its stages.
 */
export default function Garments() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [types, setTypes] = useState<GarmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  // Loading only; adding and reordering each show theirs beside the action.
  const [problem, setProblem] = useState<string | null>(null);
  const [addProblem, setAddProblem] = useState<string | null>(null);
  const [orderProblem, setOrderProblem] = useState<string | null>(null);
  const [name, setName] = useState("");
  // Admin only.
  const [showRetired, setShowRetired] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [rowProblem, setRowProblem] = useState<{ id: number; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get<ResourceResponse<GarmentType[]>>(
        `/garment-types${showRetired ? "?include_retired=1" : ""}`,
      );
      setTypes(response.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [showRetired]);

  useEffect(() => {
    void load();
  }, [load]);

  /*
   * The whole ordered array, PUT -- the same shape as the stages within a
   * garment, and the same reason: a move is one idempotent request with no
   * gap arithmetic, so a retry on a bad connection cannot corrupt the order.
   * The grip and the arrows both end up here.
   */
  async function commit(next: GarmentType[]) {
    setTypes(next);
    setBusy(true);
    setOrderProblem(null);

    try {
      const response = await api.put<ResourceResponse<GarmentType[]>>("/admin/garment-types/reorder", {
        ids: next.map((t) => t.id),
      });
      setTypes(response.data);
    } catch (error: unknown) {
      setOrderProblem(errorMessage(error));
      void load();
    } finally {
      setBusy(false);
    }
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setAddProblem(null);

    try {
      await api.post("/admin/garment-types", { name });
      setName("");
      void load();
    } catch (error: unknown) {
      setAddProblem(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  /*
   * Retire, never delete -- the rule the step library already follows, for
   * the same reason. Orders already made name this garment, and a tailor's
   * own stage arrangement hangs off it; deleting would orphan both. Retired,
   * it simply stops being offered for new orders, and "Bring back" undoes it.
   */
  async function retire(type: GarmentType) {
    setBusy(true);
    setRowProblem(null);

    try {
      await api.post(`/admin/garment-types/${type.id}/retire`, { retired: !type.retired });
      await load();
    } catch (error: unknown) {
      setRowProblem({ id: type.id, message: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  /*
   * Dragging, for admins only -- nobody else may reorder this list, so a
   * grip on a tailor's screen would be a control that silently does
   * nothing. The arrows stay for everyone who has them.
   */
  const { order, draggingId, listRef, gripProps, rowStyle } = useReorder({
    items: types,
    onCommit: (next) => void commit(next),
    disabled: busy || !isAdmin,
  });

  function move(index: number, by: -1 | 1) {
    const next = [...types];
    const target = index + by;

    if (target < 0 || target >= next.length) return;

    const a = next[index];
    const b = next[target];

    if (!a || !b) return;

    next[index] = b;
    next[target] = a;

    void commit(next);
  }

  return (
    <>
      <div className="page-head">
        <h1>Garments</h1>
        <p>
          {isAdmin
            ? "What customers can order, and the order this list is shown in."
            : "Pick a garment to see the stages it goes through."}
        </p>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      {isAdmin ? (
        <form className="card" onSubmit={add} style={{ marginBottom: 16 }}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="name">Add a garment</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Kaftan" />
          </div>
          <button type="submit" className="btn" disabled={busy || name.trim() === ""}>
            Add
          </button>
          <ActionProblem message={addProblem} />
        </form>
      ) : null}

      {isAdmin ? (
        <label className="switch-row" style={{ borderBottom: 0, marginBottom: 8 }}>
          <div className="text">
            <div className="label">Show retired garments</div>
            <div className="hint">They are kept for the orders that already use them.</div>
          </div>
          <input type="checkbox" checked={showRetired} onChange={(e) => setShowRetired(e.target.checked)} />
        </label>
      ) : null}

      {loading ? (
        <p className="empty">Loading…</p>
      ) : (
        <ol
          className={`arrangement${draggingId !== null ? " is-reordering" : ""}`}
          ref={listRef as React.RefObject<HTMLOListElement>}
        >
          {order.map((type, index) => (
            <li
              className={`arrangement__step${draggingId === type.id ? " is-dragging" : ""}${type.retired ? " is-retired" : ""}`}
              key={type.id}
              style={rowStyle(type.id)}
            >
              {/* The one element that starts a drag, and the only one that
                  takes the touch away from the page. */}
              {isAdmin ? (
                <span className="arrangement__grip" aria-hidden="true" {...gripProps(type.id)}>
                  ⠿
                </span>
              ) : null}

              <span className="arrangement__number" aria-hidden="true">
                {index + 1}
              </span>

              <div className="arrangement__body">
                {isAdmin && editingId === type.id ? (
                  <GarmentEditor
                    garment={type}
                    onSaved={() => {
                      setEditingId(null);
                      void load();
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <h3>{type.name}</h3>
                    {type.description ? <p className="hint">{type.description}</p> : null}
                    {type.retired ? <span className="silent">Retired — not offered on new orders</span> : null}
                  </>
                )}
                <ActionProblem message={rowProblem?.id === type.id ? rowProblem.message : null} />
              </div>

              <div className="arrangement__arrows">
                <Link className="btn ghost" to={`/garments/${type.id}/steps`}>
                  Stages
                </Link>

                {isAdmin ? (
                  <>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => void move(index, -1)}
                      disabled={busy || index === 0}
                      aria-label={`Move ${type.name} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => void move(index, 1)}
                      disabled={busy || index === order.length - 1}
                      aria-label={`Move ${type.name} down`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn quiet"
                      onClick={() => setEditingId(editingId === type.id ? null : type.id)}
                      disabled={busy}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="btn quiet"
                      onClick={() => void retire(type)}
                      disabled={busy}
                    >
                      {type.retired ? "Bring back" : "Retire"}
                    </button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* Under the list she was reordering, brought into view if it is off-screen. */}
      <ActionProblem message={orderProblem} />
    </>
  );
}

/**
 * Renaming a garment, in place on its row.
 *
 * Unlike its stages, a garment's NAME is not copied onto an order: orders
 * look it up. So a rename shows on every order already made with it too --
 * right for fixing a spelling, wrong for turning "Kaftan" into something
 * else. The form says so before she saves; to offer a different garment,
 * add a new one and retire this.
 */
function GarmentEditor({
  garment,
  onSaved,
  onCancel,
}: {
  garment: GarmentType;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(garment.name);
  const [description, setDescription] = useState(garment.description ?? "");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setProblem(null);

    try {
      await api.put(`/admin/garment-types/${garment.id}`, {
        name: name.trim(),
        description: description.trim() || null,
      });
      onSaved();
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="garment-editor" onSubmit={save}>
      <label className="field">
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={120} />
      </label>
      <label className="field">
        <span>A short description (optional)</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={255} />
      </label>

      <p className="hint" style={{ margin: 0 }}>
        The new name also shows on orders already made with this garment. To offer something
        different, add a new garment and retire this one instead.
      </p>

      <ActionProblem message={problem} />

      <div className="row-actions" style={{ marginTop: 0 }}>
        <button type="submit" className="btn" disabled={busy || name.trim() === ""}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn quiet" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
