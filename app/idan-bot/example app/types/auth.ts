export interface User {
  id: string;
  phone?: string | null;
  full_name?: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
  role: 'customer' | 'crew' | 'admin';
  schedule_mode?: 'static' | 'dynamic';
  is_blocked?: boolean | null;
  display_order?: number | null;
  slot_interval_minutes?: number | null;
}

export interface CollectionSettings {
  privacy: 'private' | 'public' | 'friends';
  show_prices: boolean;
}
