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
  /** Who a locked-out person rings. Null until an admin sets one. */
  support_phone: string | null;
  /** wa.me link to that number, built server-side. */
  support_whatsapp: string | null;
  /** Nigeria's states, spelled the one way the directory filters by. */
  states: string[];
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
  /** False for a customer added from the shop floor who has not set a PIN yet. */
  claimed: boolean;
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

export interface DirectPayment {
  id: number;
  amount: string;
  paid_at: string;
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
  /** Money handed to the tailor on a direct order, as she recorded it. Empty on escrow orders. */
  direct_payments: DirectPayment[];
  due_date: string | null;
  ready_at: string | null;
  collection_deadline: string | null;
  collected_at: string | null;
  received_at: string | null;
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

/** One of the tailor's own customers: somebody she has had an order with. */
export interface MyCustomer extends FoundCustomer {
  orders_count: number;
  /** Waiting to pay, being made, or ready to collect. */
  live_orders_count: number;
  last_order_at: string | null;
  /** A live order or her consent; a finished order does not keep granting it. */
  can_see_measurements: boolean;
}

/* ---- Measurements (Section 11) ------------------------------------------ */

export interface MeasurementValue {
  id: number;
  label: string;
  value: string;
  unit: string | null;
}

/** The photograph is the record; `values` is the optional typed version. */
export interface MeasurementSet {
  id: number;
  label: string | null;
  notes: string | null;
  taken_on: string | null;
  photo_url: string | null;
  recorded_by: { id: number; name: string } | null;
  values: MeasurementValue[];
  created_at: string;
}

/** One row of "who can see my measurements". */
export interface MeasurementAccessRow {
  /** Null for a tailor whose access comes from a live order and no link. */
  id: number | null;
  tailor: {
    id: number | null;
    name: string | null;
    business_name: string | null;
    avatar_url: string | null;
  };
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  has_live_order: boolean;
  /** Whether revoking would actually stop her seeing them today. */
  can_see_now: boolean;
  reason: string;
}

export interface ClaimInvite {
  code: string;
  /** Where a spoken code is typed in, e.g. https://…/claim. */
  claim_page: string;
  link: string;
  qr_svg: string;
  whatsapp_url: string;
  expires_at: string;
}

export interface ClaimPreview {
  name: string;
  invited_by: string | null;
  invited_by_business: string | null;
}

/* ---- Reviews (Section 13) ------------------------------------------------ */

export type ReviewDirection = "customer_to_tailor" | "tailor_to_customer";

export interface OrderReview {
  id: number;
  direction: ReviewDirection;
  rating: number;
  body: string | null;
  /** "held" is only ever returned to the person who wrote it. */
  status: "published" | "held";
  author: { id: number | null; name: string | null; avatar_url: string | null };
  published_at: string | null;
  created_at: string;
}

/** A review the proof gate is holding, as the admin queue shows it. */
export interface HeldReview {
  id: number;
  rating: number;
  body: string | null;
  author: { id: number; name: string } | null;
  subject: { id: number; name: string } | null;
  order: {
    id: number;
    reference: string | null;
    garment: string | null;
    steps_completed: number | null;
    steps_with_photo: number | null;
  };
  proof_ratio: string | null;
  created_at: string;
}

/* ---- Portfolio and settings (Section 15) -------------------------------- */

/** One photograph in a tailor's public gallery. `url` is a public URL. */
export interface PortfolioPhoto {
  id: number;
  url: string;
  caption: string | null;
  position: number;
  hidden: boolean;
  /** True when the tailor uploaded it herself, false when a customer did. */
  mine: boolean;
  uploaded_by: { id: number; name: string } | null;
  order: { id: number; reference: string | null; garment: string | null } | null;
  created_at: string;
}

export interface PlatformSettingRow {
  key: string;
  value: string;
  label: string;
  help: string;
  min: number;
  max: number;
  group: string;
  /** Naira rather than days or a percentage, so the field groups digits. */
  money: boolean;
  /** A phone number rather than a number of anything; min and max mean nothing. */
  phone: boolean;
}

/* ---- The business card (Section 16) -------------------------------------- */

export interface BusinessCardData {
  business_name: string;
  name: string;
  location: string;
  whatsapp: string | null;
  url: string;
  /** Without the scheme: shorter on card, and nobody types it in. */
  url_label: string;
  slug: string;
  /** One string of '0'/'1' per row. Drawn module by module on canvas. */
  qr: string[];
}

/* ---- Subscriptions (Section 14) ------------------------------------------ */

export interface SubscriptionPlan {
  plan: string;
  days: number;
  price: string;
}

export interface SubscriptionTermRow {
  id: number;
  plan: string;
  days: number;
  amount: string;
  starts_at: string;
  ends_at: string;
  /** True when an admin gave her the days rather than her buying them. */
  granted: boolean;
  note: string | null;
}

export interface SubscriptionState {
  /** A label for wording only. Decisions read the timestamps. */
  status: "active" | "grace" | "lapsed";
  listed: boolean;
  current_period_end: string | null;
  grace_ends_at: string | null;
  days_remaining: number | null;
  in_grace: boolean;
  plans: SubscriptionPlan[];
  grace_days: number;
  terms: SubscriptionTermRow[];
}

/* ---- The admin dashboard (Section 17) ------------------------------------ */

export interface AttentionItem {
  key: string;
  count: number;
  label: string;
  /** Null when there is nowhere useful to send somebody. */
  href: string | null;
  tone: "normal" | "bad";
}

/** Whether a scheduled command is still running. None is load-bearing. */
export interface HealthRow {
  key: string;
  label: string;
  note: string;
  last_run_at: string | null;
  state: "ok" | "stale" | "never";
}

export interface AdminDashboardData {
  attention: AttentionItem[];
  health: HealthRow[];
  numbers: {
    orders_in_progress: number;
    orders_this_month: number;
    tailors: number;
    tailors_listed: number;
    customers: number;
    subscription_income_this_month: string;
    held_in_escrow: string;
  };
}

export interface AdminUser {
  id: number;
  name: string;
  phone: string;
  role: Role;
  status: "active" | "suspended";
  suspended_until: string | null;
  claimed: boolean;
  avatar_url: string | null;
  business_name: string | null;
  slug: string | null;
  created_at: string;
}

/** An admin-issued way back in for somebody locked out. All channels free. */
export interface PinResetIssue {
  code: string;
  /** Where a spoken code is typed in, e.g. https://…/reset. */
  reset_page: string;
  link: string;
  qr_svg: string;
  whatsapp_url: string;
  expires_at: string;
  expires_in_hours: number;
}

/* ---- Disputes ------------------------------------------------------------ */

export interface OrderDispute {
  id: number;
  status: "open" | "resolved";
  reason: string;
  raised_by: { id: number; name: string } | null;
  /** Taken down over the phone by staff rather than tapped by her. */
  opened_by_staff: boolean;
  outcome: "refunded" | "released" | "withdrawn" | null;
  refunded_amount: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
}

/** A dispute as the admin queue shows it: both numbers, and what is held. */
export interface AdminDispute extends OrderDispute {
  order: {
    id: number;
    reference: string | null;
    garment: string | null;
    amount: string;
    paid: string;
    escrow: boolean;
    collected_at: string | null;
    received_at: string | null;
    held: string;
  } | null;
  customer: DisputeParty | null;
  tailor: DisputeParty | null;
}

export interface DisputeParty {
  id: number;
  name: string;
  phone: string;
  whatsapp: string;
}
