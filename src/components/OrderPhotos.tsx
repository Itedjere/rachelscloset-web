import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "../lib/api";
import { shrinkImage } from "../lib/image";
import type { PortfolioPhoto } from "../types/api";
import Icon from "./Icon";

/**
 * "You wearing it."
 *
 * The customer's own photographs of the finished garment, added after she
 * has collected it. They go straight into the tailor's public gallery, which
 * is the point: a photograph of a dress being worn at a party is worth more
 * to a prospective customer than any studio shot, and it costs the tailor
 * nothing to obtain.
 *
 * Her choosing to upload is the consent. Nothing here touches the private
 * step photographs from Section 10 — those are her cloth mid-construction
 * and they stay between the two of them.
 */
export default function OrderPhotos({ orderId }: { orderId: number }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<PortfolioPhoto[]>([]);
  const [canAdd, setCanAdd] = useState(false);
  const [max, setMax] = useState(5);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get<{
        data: PortfolioPhoto[];
        max_per_order: number;
        can_add: boolean;
      }>(`/orders/${orderId}/photos`);

      setPhotos(response.data);
      setMax(response.max_per_order);
      setCanAdd(response.can_add);
    } catch {
      // Not worth an error banner on an order page that is otherwise fine.
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(file: File) {
    setBusy(true);
    setProblem(null);

    try {
      const form = new FormData();
      form.append("photo", await shrinkImage(file, "document"));
      await api.post(`/orders/${orderId}/photos`, form);
      await load();
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(photo: PortfolioPhoto) {
    setBusy(true);

    try {
      await api.delete(`/portfolio/${photo.id}`);
      await load();
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (loading || (!canAdd && photos.length === 0)) return null;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 18 }}>You wearing it</h2>
      <p className="hint">
        Add up to {max} photographs of yourself in what she made. They go on her page, so
        other people can see her work.
      </p>

      {problem ? <p className="notice bad">{problem}</p> : null}

      <div className="step-photo-strip">
        {photos.map((photo) => (
          <div className="worn-photo" key={photo.id}>
            <img src={photo.url} alt={photo.caption ?? "You wearing it"} loading="lazy" />
            {/* Hers to take down; the tailor can only hide it. */}
            {canAdd || photo.uploaded_by ? (
              <button
                type="button"
                className="worn-photo__remove"
                aria-label="Remove this photograph"
                onClick={() => void remove(photo)}
                disabled={busy}
              >
                <Icon name="close" size={14} />
              </button>
            ) : null}
          </div>
        ))}

        {canAdd ? (
          <>
            <button
              type="button"
              className="step-photo-add"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <Icon name="camera" size={22} />
              <span>{busy ? "Sending…" : "Add"}</span>
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
