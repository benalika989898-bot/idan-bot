export type FacebookAccount = {
  id: string;
  user_id: string;
  email: string;
  password: string;
  session_state?: Record<string, unknown> | null;
  created_at: string;
};

export type GroupRecord = {
  id: string;
  account_id: string;
  url: string;
  name?: string | null;
  created_at: string;
};

export type ScheduledPostStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'disabled';

export type ScheduledPostRecord = {
  id: string;
  account_id: string;
  group_ids: string[];
  content: string;
  image_url?: string | null;
  scheduled_at: string;
  status: ScheduledPostStatus;
  result?: unknown;
  created_at: string;
  updated_at: string;
};
