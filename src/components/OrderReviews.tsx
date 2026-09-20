import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "../lib/api";
import type { OrderReview } from "../types/api";
import Avatar from "./Avatar";
import Stars from "./Stars";

/**
 * Reviews on one order, both ways.
 *
 * Appears once the garment has been collected -- not once escrow has settled.
 * She knows whether it is right the moment she has it in her hands, and the
 * waiting period can run for days afterwards; collecting reviews after that
 * means collecting them when nobody remembers the fitting.
 */
export default function OrderReviews({ orderId }: { orderId: number }) {
  const [reviews, setReviews] = useState<OrderReview[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [direction, setDirection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get<{
        data: OrderReview[];
        can_review: boolean;
        direction: string;
      }>(`/orders/${orderId}/reviews`);

      setReviews(response.data);
      setCanReview(response.can_review);
      setDirection(response.direction);
    } catch {
      // A review block that cannot load is not worth an error on an order
      // page that is otherwise fine.
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (rating < 1) return setProblem("Tap a star first.");

    setBusy(true);
    setProblem(null);

    try {
      await api.post(`/orders/${orderId}/reviews`, { rating, body: body || null });
      setRating(0);
      setBody("");
      await load();
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (loading || (!canReview && reviews.length === 0)) return null;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 18 }}>Reviews</h2>

      {reviews.map((review) => (
        <div className="review" key={review.id}>
          <Avatar name={review.author.name ?? "?"} url={review.author.avatar_url} size={36} />
          <div className="review-body">
            <div className="review-head">
              <strong>{review.author.name}</strong>
              <Stars value={review.rating} />
            </div>
            {review.body ? <p>{review.body}</p> : null}

            {/*
              Shown only to the person who wrote it -- the API does not return
              a held review to anybody else. Said plainly, because the
              alternative is somebody wondering whether it saved at all.
            */}
            {review.status === "held" ? (
              <p className="notice">
                Waiting to be checked. Only you can see this for now. Reviews of four stars
                and above are checked when an order has little photographed work on it.
              </p>
            ) : null}
          </div>
        </div>
      ))}

      {canReview ? (
        <form onSubmit={submit} className="review-form">
          <p className="hint">
            {direction === "customer_to_tailor"
              ? "How was the work?"
              : "How was this customer to work with?"}
          </p>

          <Stars value={rating} onChange={setRating} />

          <label className="field">
            <span>Anything to add? (optional)</span>
            <textarea
              rows={3}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={2000}
            />
          </label>

          {problem ? <p className="notice bad">{problem}</p> : null}

          <button type="submit" className="btn" disabled={busy}>
            {busy ? "Sending…" : "Leave review"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
