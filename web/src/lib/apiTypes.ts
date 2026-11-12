export type Role = 'ADMIN' | 'OPERATOR';
export type TicketStatus = 'WAITING' | 'SERVING' | 'COMPLETED' | 'CANCELLED';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  id: string;
  role: Role;
  full_name: string;
}

export interface MeResponse {
  id: string;
  username: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  location_ids: number[];
}

export interface TabletInLocation {
  id: number;
  name: string;
  is_active: boolean;
}

export interface LocationResponse {
  id: number;
  name: string;
  description: string | null;
  category: string;
  is_active: boolean;
  queue_code: string;
  accepting_new_tickets: boolean;
  tablet: TabletInLocation | null;
  user_ids: string[];
}

export interface TabletResponse {
  id: number;
  name: string;
  location_id: number | null;
  is_active: boolean;
  last_seen_at: string | null;
  online: boolean;
  pairing_token: string | null;
}

export interface UserResponse {
  id: string;
  username: string;
  full_name: string;
  position: string | null;
  role: Role;
  is_active: boolean;
  location_ids: number[];
  online: boolean;
}

export interface TicketResponse {
  id: string;
  ticket_code: string;
  status: TicketStatus;
  location_id: number;
  joined_at: string;
  called_at: string | null;
  served_at: string | null;
  customer_name: string | null;
  appointment_time: string | null;
  served_by_user_id: string | null;
  /** Tylko dla CANCELLED. Starsze bilety mogą mieć null. */
  close_reason: CloseReason | null;
}

export type CloseReason = 'NO_SHOW' | 'PATIENT_CANCELLED' | 'STAFF_CANCELLED';

/** Zakończony bilet z GET /admin/tickets/history. */
export interface TicketHistoryEntry extends TicketResponse {
  served_by_name: string | null;
}

export type ThemePreference = 'light' | 'dark' | 'system';
export type TextSize = 'normal' | 'large' | 'xlarge';
export type UndoSeconds = 6 | 10 | 20;

/** Ustawienia panelu zapisane na koncie (GET/PUT /auth/me/preferences). */
export interface UserPreferences {
  theme: ThemePreference;
  text_size: TextSize;
  high_contrast: boolean;
  reduce_motion: boolean;
  undo_seconds: UndoSeconds;
  sound_on_new_ticket: boolean;
  default_location_id: number | null;
  single_key_shortcuts: boolean;
}

export interface QueueResponse {
  location_id: number;
  waiting: TicketResponse[];
  serving: TicketResponse | null;
}

export interface RefreshHandle {
  refetch: () => Promise<void>;
}
