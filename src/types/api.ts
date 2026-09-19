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
