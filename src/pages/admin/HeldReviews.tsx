import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ActionProblem from "../../components/ActionProblem";
import Stars from "../../components/Stars";
import { api, errorMessage } from "../../lib/api";
import type { HeldReview } from "../../types/api";

/**
 * Reviews the proof gate is holding.
 *
 * Without this screen the gate would be a place reviews disappear into, which
 * is worse than having no gate: somebody took the trouble to praise her
 * tailor and deserves either publication or a human decision.
 *
 * There is no reject button, on purpose. An admin releases a review or leaves
 * it held, and that is the whole vocabulary — the gate is for invented orders
 * rather than for inconvenient praise, and a button that permanently destroys
 * somebody's opinion of a business is not one this platform needs.
 */
export default function HeldReviews() {
  const [reviews, setReviews] = useState<HeldReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  // Loading only; a failed release shows on that review's card.
  const [problem, setProblem] = useState<string | null>(null);
  const [failed, setFailed] = useState<{ id: number; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get<{ data: HeldReview[] }>("/admin/reviews");
      setReviews(response.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function release(review: HeldReview) {
    setBusyId(review.id);
    setFailed(null);

    try {
      await api.post(`/admin/reviews/${review.id}/release`);
      await load();
    } catch (error: unknown) {
      setFailed({ id: review.id, message: errorMessage(error) });
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="empty">Loading…</p>;

  return (
    <>
      <div className="page-head">
        <h1>Reviews to check</h1>
        <p>
          Four and five star reviews on orders that showed little photographed work. Complaints
          are never held.
        </p>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      {reviews.length === 0 ? (
        <p className="empty">Nothing waiting.</p>
      ) : (
        <div className="held-list">
          {reviews.map((review) => (
            <div className="card held" key={review.id}>
              <div className="held-head">
                <Stars value={review.rating} />
                <span className="hint">
                  {review.author?.name} on {review.subject?.name}
                </span>
              </div>

              {review.body ? <p>{review.body}</p> : <p className="hint">No comment written.</p>}

              {/* The numbers the gate actually looked at, so the decision can
                  be reviewed rather than merely taken. */}
              <dl className="facts">
                <div>
                  <dt>Order</dt>
                  <dd>
                    <Link to={`/admin/orders/${review.order.id}`}>{review.order.reference}</Link>
                    {review.order.garment ? ` · ${review.order.garment}` : ""}
                  </dd>
                </div>
                <div>
                  <dt>Stages finished</dt>
                  <dd>{review.order.steps_completed}</dd>
                </div>
                <div>
                  <dt>Stages photographed</dt>
                  <dd>{review.order.steps_with_photo}</dd>
                </div>
                <div>
                  <dt>Proof</dt>
                  <dd>{review.proof_ratio}%</dd>
                </div>
              </dl>

              <button
                type="button"
                className="btn"
                onClick={() => void release(review)}
                disabled={busyId === review.id}
              >
                {busyId === review.id ? "Publishing…" : "Publish it"}
              </button>

              <ActionProblem message={failed?.id === review.id ? failed.message : null} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
