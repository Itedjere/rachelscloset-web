import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, errorMessage } from "../lib/api";

/**
 * Back from the payment provider.
 *
 * The same shape as the order return page, for the same reason: the browser
 * coming back is not proof of anything, so this asks the server to confirm
 * and the server asks the provider. The webhook usually gets there first —
 * whichever arrives first applies the payment, and the second is a no-op
 * because subscription_terms.payment_id is unique.
 */
export default function SubscriptionPaid() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState("Checking your payment…");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reference = params.get("tx_ref") ?? params.get("reference");

    if (!reference) {
      setMessage("We could not tell which payment that was. Check your listing below.");
      setDone(true);

      return;
    }

    void api
      .post("/payments/confirm", { reference })
      .then(() => setMessage("Thank you. Your days have been added."))
      .catch((error: unknown) => setMessage(errorMessage(error)))
      .finally(() => setDone(true));
  }, [params]);

  return (
    <div className="card auth-card">
      <h1>{done ? "All done" : "One moment"}</h1>
      <p className="hint">{message}</p>
      <Link className="btn" to="/subscription">
        See your listing
      </Link>
    </div>
  );
}
