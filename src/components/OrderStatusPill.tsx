import type { OrderStatus } from "../types/api";

/*
 * What the status is called, in words a customer would use.
 *
 * Not the raw enum. "pending_payment" is what the database calls it; "Waiting
 * for payment" is what it is. And the tone matters -- somebody reads this to
 * find out whether her clothes are ready.
 */
const LABELS: Record<OrderStatus, string> = {
  pending_payment: "Waiting for payment",
  in_progress: "Being made",
  ready: "Ready to collect",
  collected: "Collected",
  completed: "Finished",
  cancelled: "Cancelled",
  disputed: "Being looked into",
};

export default function OrderStatusPill({ status }: { status: OrderStatus }) {
  return <span className={`status-pill status-${status}`}>{LABELS[status] ?? status}</span>;
}

export { LABELS as ORDER_STATUS_LABELS };
