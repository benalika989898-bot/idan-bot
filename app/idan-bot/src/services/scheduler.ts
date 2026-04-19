import { supabase } from '@/lib/supabase';
import type { FacebookAccount, GroupRecord, ScheduledPostRecord } from '@/types/scheduler';

export function normalizeGroupUrl(url: string) {
  const trimmed = url.trim();

  if (!trimmed) {
    return '';
  }

  try {
    const normalized = new URL(trimmed);
    normalized.hash = '';
    normalized.search = '';
    normalized.pathname = normalized.pathname.replace(/\/+$/, '');
    return normalized.toString();
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

export function parseGroupUrls(input: string) {
  return Array.from(
    new Set(
      input
        .split('\n')
        .map(normalizeGroupUrl)
        .filter(Boolean)
    )
  );
}

function deriveGroupName(url: string) {
  const fallback = 'Facebook group';

  try {
    const { pathname } = new URL(url);
    const parts = pathname.split('/').filter(Boolean);
    const lastSegment = parts[parts.length - 1];
    if (!lastSegment) {
      return fallback;
    }

    return lastSegment.replace(/[-_]/g, ' ');
  } catch {
    return fallback;
  }
}

export async function getPrimaryAccount() {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    throw error;
  }

  return (data?.[0] as FacebookAccount | undefined) ?? null;
}

export async function savePrimaryAccount(input: {
  existingId?: string | null;
  userId: string;
  email: string;
  password: string;
}) {
  if (input.existingId) {
    const { data, error } = await supabase
      .from('accounts')
      .update({
        email: input.email,
        password: input.password,
      })
      .eq('id', input.existingId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return data as FacebookAccount;
  }

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      user_id: input.userId,
      email: input.email,
      password: input.password,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as FacebookAccount;
}

export async function listGroups(accountId: string) {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as GroupRecord[];
}

export async function ensureGroups(accountId: string, urls: string[]) {
  const normalizedUrls = Array.from(new Set(urls.map(normalizeGroupUrl).filter(Boolean)));

  if (!normalizedUrls.length) {
    throw new Error('Add at least one Facebook group URL.');
  }

  const { data: existingData, error: existingError } = await supabase
    .from('groups')
    .select('*')
    .eq('account_id', accountId);

  if (existingError) {
    throw existingError;
  }

  const existingGroups = (existingData ?? []) as GroupRecord[];
  const groupsByUrl = new Map(existingGroups.map((group) => [normalizeGroupUrl(group.url), group]));

  const missingUrls = normalizedUrls.filter((url) => !groupsByUrl.has(url));

  if (missingUrls.length > 0) {
    const { data: insertedData, error: insertError } = await supabase
      .from('groups')
      .insert(
        missingUrls.map((url) => ({
          account_id: accountId,
          url,
          name: deriveGroupName(url),
        }))
      )
      .select('*');

    if (insertError) {
      throw insertError;
    }

    for (const group of (insertedData ?? []) as GroupRecord[]) {
      groupsByUrl.set(normalizeGroupUrl(group.url), group);
    }
  }

  return normalizedUrls
    .map((url) => groupsByUrl.get(url))
    .filter((group): group is GroupRecord => Boolean(group));
}

export async function createScheduledPost(input: {
  accountId: string;
  groupIds: string[];
  content: string;
  imageUrl?: string;
  scheduledAt: string;
}) {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .insert({
      account_id: input.accountId,
      group_ids: input.groupIds,
      content: input.content,
      image_url: input.imageUrl?.trim() ? input.imageUrl.trim() : null,
      scheduled_at: input.scheduledAt,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as ScheduledPostRecord;
}

export async function getScheduledPost(id: string) {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  return data as ScheduledPostRecord;
}

export async function updateScheduledPost(
  id: string,
  fields: Partial<Pick<ScheduledPostRecord, 'content' | 'image_url' | 'scheduled_at' | 'status' | 'group_ids'>>
) {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .update(fields)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as ScheduledPostRecord;
}

export async function deleteScheduledPost(id: string) {
  const { error } = await supabase
    .from('scheduled_posts')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function listScheduledPosts() {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .order('scheduled_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ScheduledPostRecord[];
}
