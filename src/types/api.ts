/** Laravel's validation bag: field name to the messages against it. */
export type ValidationErrors = Record<string, string[]>;

export type Role = "customer" | "tailor" | "admin";

export interface User {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  role: Role;
  avatar_url: string | null;
  status: "active" | "suspended";
}

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  url: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationGroup {
  key: string;
  label: string;
  hint: string;
}

export type Preferences = Record<string, boolean>;

export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; total: number };
}

export interface ServerConfig {
  max_upload_kb: number;
  max_upload_label: string;
  push: { enabled: boolean; public_key: string | null };
}

export interface ResourceResponse<T> {
  data: T;
}

export interface GarmentType {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  retired: boolean;
  arrangements_count?: number | null;
}

export interface LibraryStep {
  id: number;
  label: string;
  instructions: string | null;
  voice_note_url: string | null;
  has_voice_note?: boolean;
  retired?: boolean;
}

export interface ArrangedStep extends LibraryStep {
  position: number;
}

export interface Arrangement {
  id: number;
  name: string;
  is_own: boolean;
  is_default: boolean;
  steps: ArrangedStep[];
}

export type OrderStatus =
  | "pending_payment"
  | "in_progress"
  | "ready"
  | "collected"
  | "completed"
  | "cancelled"
  | "disputed";

export interface OrderParty {
  id: number;
  name: string;
  phone: string;
  avatar_url: string | null;
}

/**
 * One stage of an order, as the customer was shown it.
 *
 * These are snapshots taken when the order was opened, not live reads of the
 * step library -- renaming a library step must not rewrite a timeline she has
 * already read. See the order_steps migration.
 */
export interface StepPhoto {
  id: number;
  url: string;
  created_at: string;
}

export interface OrderStep {
  id: number;
  position: number;
  label: string;
  instructions: string | null;
  voice_note_url: string | null;
  complete: boolean;
  completed_at: string | null;
  photos?: StepPhoto[];
}

export interface Order {
  id: number;
  reference: string;
  status: OrderStatus;
  description: string | null;
  amount: string;
  deposit_amount: string;
  paid_total: string;
  amount_due_up_front: string;
  is_paid_up_front: boolean;
  escrow: boolean;
  due_date: string | null;
  ready_at: string | null;
  collection_deadline: string | null;
  collected_at: string | null;
  steps_total: number;
  steps_completed: number;
  steps_with_photo: number;
  steps?: OrderStep[];
  can_release: boolean;
  payout?: {
    net_amount: string;
    refunded_amount: string;
    status: "pending" | "released" | "failed";
    failure_reason: string | null;
  } | null;
  payments?: {
    id: number;
    reference: string;
    amount: string;
    status: "pending" | "successful" | "failed";
    paid_at: string | null;
  }[];
  garment_type?: { id: number; name: string };
  customer?: OrderParty;
  tailor?: OrderParty;
  created_at: string;
}

export interface FoundCustomer {
  id: number;
  name: string;
  phone: string;
  avatar_url: string | null;
  claimed: boolean;
}
