import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
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

  // Same whole-array reorder as the steps within an arrangement.
  async function move(index: number, by: -1 | 1) {
    const next = [...types];
    const target = index + by;
    if (target < 0 || target >= next.length) return;

    const a = next[index];
    const b = next[target];
    if (!a || !b) return;

    next[index] = b;
    next[target] = a;
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
        <ol className="arrangement">
          {types.map((type, index) => (
            <li className="arrangement__step" key={type.id}>
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
                      disabled={busy || index === types.length - 1}
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
