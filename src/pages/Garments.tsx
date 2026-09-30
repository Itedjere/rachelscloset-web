import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  const [problem, setProblem] = useState<string | null>(null);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await api.get<ResourceResponse<GarmentType[]>>("/garment-types");
      setTypes(response.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

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

    try {
      const response = await api.put<ResourceResponse<GarmentType[]>>("/admin/garment-types/reorder", {
        ids: next.map((t) => t.id),
      });
      setTypes(response.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
      void load();
    } finally {
      setBusy(false);
    }
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setProblem(null);

    try {
      await api.post("/admin/garment-types", { name });
      setName("");
      void load();
    } catch (error: unknown) {
      setProblem(errorMessage(error));
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
        </form>
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
              className={`arrangement__step${draggingId === type.id ? " is-dragging" : ""}`}
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
                <h3>{type.name}</h3>
                {type.description ? <p className="hint">{type.description}</p> : null}
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
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
