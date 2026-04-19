import { supabase } from '@/lib/supabase';

export type WaitingListItem = {
  id: string;
  preferred_date: string;
  status?: string | null;
  crew_member_id?: string | null;
  customer_id?: string | null;
  appointment_type_id?: string | null;
  created_at?: string | null;
  customer?: {
    id: string;
    full_name?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
  } | null;
  appointment_type?: {
    id: string;
    name?: string | null;
    duration_minutes?: number | null;
    price?: number | null;
  } | null;
};

const ACTIVE_STATUSES = ['active', 'notified'] as const;

export async function fetchWaitingListByDate(
  crewMemberId: string,
  date: string
): Promise<{ data: WaitingListItem[]; error: any }> {
  try {
    const { data: baseRows, error } = await supabase
      .from('waiting_list')
      .select(
        `
        id,
        preferred_date,
        status,
        crew_member_id,
        customer_id,
        appointment_type_id,
        created_at
      `
      )
      .eq('crew_member_id', crewMemberId)
      .eq('preferred_date', date)
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: [], error };
    }

    const rows = ((baseRows || []) as WaitingListItem[]).sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return aTime - bTime;
    });
    if (!rows.length) {
      return { data: [], error: null };
    }

    const customerIds = rows
      .map((row) => row.customer_id)
      .filter(Boolean) as string[];
    const appointmentTypeIds = rows
      .map((row) => row.appointment_type_id)
      .filter(Boolean) as string[];

    const [{ data: customers }, { data: appointmentTypes }] = await Promise.all([
      customerIds.length
        ? supabase
            .from('profiles')
            .select('id, full_name, phone, avatar_url')
            .in('id', customerIds)
        : Promise.resolve({ data: [] }),
      appointmentTypeIds.length
        ? supabase
            .from('appointment_types')
            .select('id, name, duration_minutes, price')
            .in('id', appointmentTypeIds)
        : Promise.resolve({ data: [] }),
    ]);

    const customerMap = new Map(
      (customers || []).map((customer: any) => [customer.id, customer])
    );
    const appointmentTypeMap = new Map(
      (appointmentTypes || []).map((type: any) => [type.id, type])
    );

    const enriched = rows.map((row) => ({
      ...row,
      customer: row.customer_id ? customerMap.get(row.customer_id) || null : null,
      appointment_type: row.appointment_type_id
        ? appointmentTypeMap.get(row.appointment_type_id) || null
        : null,
    }));

    return { data: enriched, error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function fetchWaitingListCount(params: {
  crewMemberId: string;
  startDate: string;
  endDate: string;
}): Promise<{ count: number; error: any }> {
  try {
    const { count, error } = await supabase
      .from('waiting_list')
      .select('id', { count: 'exact', head: true })
      .eq('crew_member_id', params.crewMemberId)
      .gte('preferred_date', params.startDate)
      .lte('preferred_date', params.endDate)
      .in('status', ACTIVE_STATUSES);

    if (error) {
      return { count: 0, error };
    }

    return { count: count ?? 0, error: null };
  } catch (error) {
    return { count: 0, error };
  }
}
