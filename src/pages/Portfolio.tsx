import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "../components/Icon";
import { api, errorMessage } from "../lib/api";
import { shrinkImage } from "../lib/image";
import type { PortfolioPhoto } from "../types/api";

/**
 * The tailor's gallery, as she manages it.
 *
 * Two kinds of photograph sit here together. Her own, which she uploads so
 * the public page is worth visiting before she has taken a single order. And
 * her customers', taken wearing the finished garment — those are the ones
 * that actually sell the work, and they cost her nothing.
 *
 * She can reorder everything and hide anything. She can delete only her own:
 * a customer's photograph of her own dress is not the tailor's to destroy,
 * but a public page somebody else can post to unconditionally is not one
 * anybody would print on a business card, so hiding is hers.
 */
export default function Portfolio() {
  const fileRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<PortfolioPhoto[]>([]);
  const [ownCount, setOwnCount] = useState(0);
  const [maxOwn, setMaxOwn] = useState(5);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get<{
        data: PortfolioPhoto[];
        own_count: number;
        max_own: number;
      }>("/portfolio");

      setItems(response.data);
      setOwnCount(response.own_count);
      setMaxOwn(response.max_own);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(file: File) {
    setBusy(true);
    setProblem(null);

    try {
      const form = new FormData();
      form.append("photo", await shrinkImage(file, "document"));
      await api.post("/portfolio", form);
      await load();
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function act(path: string, method: "post" | "delete" = "post") {
    setBusy(true);
    setProblem(null);

    try {
      await (method === "post" ? api.post(path) : api.delete(path));
      await load();
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  /** Arrows, never drag: the same rule as the step arrangement. */
  async function move(index: number, by: -1 | 1) {
    const target = index + by;

    if (target < 0 || target >= items.length) return;

    const next = [...items];
    const a = next[index];
    const b = next[target];

    // Guarded rather than destructured: with noUncheckedIndexedAccess an
    // index into an array is possibly-undefined, and the swap is only sound
    // because the bounds check above already ran.
    if (!a || !b) return;

    next[index] = b;
    next[target] = a;
    setItems(next);

    // The whole array, so a retry cannot half-apply.
    await api.put("/portfolio/reorder", { ids: next.map((item) => item.id) });
  }

  if (loading) return <p className="empty">Loading…</p>;

  const full = ownCount >= maxOwn;

  return (
    <>
      <div className="page-head">
        <h1>Your gallery</h1>
        <p>
          This is what people see when they find you. Customers can add photographs of
          themselves wearing what you made — those are the best ones you will get.
        </p>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      <div className="card" style={{ marginBottom: 16 }}>
        <p className="hint">
          You can add {maxOwn} of your own. You have {ownCount}.
        </p>

        <button
          type="button"
          className="btn"
          onClick={() => fileRef.current?.click()}
          disabled={busy || full}
        >
          <Icon name="camera" size={18} /> {full ? "That is all five" : "Add a photograph"}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </div>

      {items.length === 0 ? (
        <p className="empty">
          Nothing here yet. Add a photograph or two so your page is worth visiting.
        </p>
      ) : (
        <div className="portfolio-grid">
          {items.map((item, index) => (
            <figure className={`portfolio-item${item.hidden ? " is-hidden" : ""}`} key={item.id}>
              {/* Public URLs: no bearer token, same image the world sees. */}
              <img src={item.url} alt={item.caption ?? "Your work"} loading="lazy" />

              <figcaption>
                {item.mine ? (
                  <span className="pill">Yours</span>
                ) : (
                  <span className="pill gold">From {item.uploaded_by?.name ?? "a customer"}</span>
                )}
                {item.caption ? <span className="hint">{item.caption}</span> : null}
                {item.hidden ? <span className="hint">Hidden from your page</span> : null}
              </figcaption>

              <div className="portfolio-actions">
                <button
                  type="button"
                  className="btn quiet"
                  aria-label="Move earlier"
                  onClick={() => void move(index, -1)}
                  disabled={busy || index === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn quiet"
                  aria-label="Move later"
                  onClick={() => void move(index, 1)}
                  disabled={busy || index === items.length - 1}
                >
                  ↓
                </button>

                <button
                  type="button"
                  className="btn quiet"
                  onClick={() => void act(`/portfolio/${item.id}/${item.hidden ? "show" : "hide"}`)}
                  disabled={busy}
                >
                  {item.hidden ? "Show" : "Hide"}
                </button>

                {/* Only her own. A customer's photograph is not hers to destroy. */}
                {item.mine ? (
                  <button
                    type="button"
                    className="btn quiet"
                    onClick={() => void act(`/portfolio/${item.id}`, "delete")}
                    disabled={busy}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                ) : null}
              </div>
            </figure>
          ))}
        </div>
      )}
    </>
  );
}
