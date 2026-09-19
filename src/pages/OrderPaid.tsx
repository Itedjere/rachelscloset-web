import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, errorMessage } from "../lib/api";

type Outcome = "checking" | "paid" | "not-paid" | "problem";

/**
 * Where the provider sends the payer back to.
 *
 * The query string is not believed about anything except which reference to
 * ask about -- the server verifies with Flutterwave directly. This races the
 * webhook by design and whichever arrives second is a no-op, so arriving here
 * and finding it already settled is the expected happy path, not an error.
 */
export default function OrderPaid() {
  const { orderId } = useParams();
  const [params] = useSearchParams();
  const [outcome, setOutcome] = useState<Outcome>("checking");
  const [problem, setProblem] = useState<string | null>(null);

  // React 18+ runs effects twice in development. Confirming is idempotent on
  // the server, but there is no reason to ask twice.
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;

    const reference = params.get("tx_ref");

    if (!reference) {
      setOutcome("problem");
      setProblem("That link is missing its payment reference.");

      return;
    }

    api
      .post<{ data: { paid: boolean } }>("/payments/confirm", { reference })
      .then((response) => setOutcome(response.data.paid ? "paid" : "not-paid"))
      .catch((error: unknown) => {
        setOutcome("problem");
        setProblem(errorMessage(error));
      });
  }, [params]);

  return (
    <div className="card form-card" style={{ textAlign: "center" }}>
      {outcome === "checking" ? (
        <>
          <h1>Checking with the bank…</h1>
          <p className="hint">This takes a moment. Do not close this page.</p>
        </>
      ) : null}

      {outcome === "paid" ? (
        <>
          <h1>Payment received</h1>
          <p>Your tailor has been told and can start.</p>
        </>
      ) : null}

      {/*
        Not an error. Bank transfer and USSD settle late, so "not yet" is a
        normal answer and the webhook will finish the job without her.
      */}
      {outcome === "not-paid" ? (
        <>
          <h1>Not confirmed yet</h1>
          <p>
            If you paid by transfer or USSD it can take a few minutes. You do not need to pay
            again — check the order shortly.
          </p>
        </>
      ) : null}

      {outcome === "problem" ? (
        <>
          <h1>Something went wrong</h1>
          <p className="notice bad">{problem}</p>
          <p className="hint">If money left your account, do not pay again. Show this to the tailor.</p>
        </>
      ) : null}

      {outcome !== "checking" ? (
        <Link className="btn" to={`/orders/${orderId}`}>
          Back to the order
        </Link>
      ) : null}
    </div>
  );
}
