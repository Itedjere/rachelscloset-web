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
