import { supabase } from '@/lib/supabase';

export type MessageBoardEntry = {
  id: string;
  title: string;
  message: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export async function fetchLatestMessage(): Promise<MessageBoardEntry | null> {
  const { data, error } = await supabase
    .from('message_board')
    .select('id, title, message, active, created_at, updated_at')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createMessageBoardMessage(payload: {
  title: string;
  message: string;
  active?: boolean;
}): Promise<MessageBoardEntry> {
  const { data, error } = await supabase
    .from('message_board')
    .insert({
      title: payload.title.trim(),
      message: payload.message.trim(),
      active: payload.active ?? true,
    })
    .select('id, title, message, active, created_at, updated_at')
    .single();

  if (error) throw error;
  if (data.active) {
    const { error: deactivateOthersError } = await supabase
      .from('message_board')
      .update({ active: false })
      .neq('id', data.id);
    if (deactivateOthersError) throw deactivateOthersError;
  }
  return data;
}

export async function fetchMessageBoardMessages(): Promise<MessageBoardEntry[]> {
  const { data, error } = await supabase
    .from('message_board')
    .select('id, title, message, active, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchMessageBoardMessageById(id: string): Promise<MessageBoardEntry | null> {
  const { data, error } = await supabase
    .from('message_board')
    .select('id, title, message, active, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateMessageBoardMessage(
  id: string,
  payload: { title: string; message: string; active?: boolean }
): Promise<MessageBoardEntry> {
  const { data, error } = await supabase
    .from('message_board')
    .update({
      title: payload.title.trim(),
      message: payload.message.trim(),
      ...(payload.active !== undefined ? { active: payload.active } : {}),
    })
    .eq('id', id)
    .select('id, title, message, active, created_at, updated_at')
    .single();

  if (error) throw error;
  if (data.active) {
    const { error: deactivateOthersError } = await supabase
      .from('message_board')
      .update({ active: false })
      .neq('id', data.id);
    if (deactivateOthersError) throw deactivateOthersError;
  }
  return data;
}

export async function deleteMessageBoardMessage(id: string): Promise<void> {
  const { error } = await supabase.from('message_board').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchMessageBoardEditorMessage(): Promise<MessageBoardEntry | null> {
  const { data, error } = await supabase
    .from('message_board')
    .select('id, title, message, active, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
