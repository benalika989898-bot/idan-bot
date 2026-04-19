import { supabase } from '../../lib/supabase';

function translateCreateCustomerError(message: string, status?: number) {
  if (status === 409 || message === 'Customer already exists') {
    return 'לקוח כבר קיים';
  }

  if (message === 'Phone number already registered by another user') {
    return 'מספר הטלפון כבר קיים במערכת';
  }

  if (message === 'Unauthorized') {
    return 'פג תוקף ההתחברות, יש להתחבר מחדש';
  }

  if (message === 'Forbidden') {
    return 'אין הרשאה להוסיף לקוח';
  }

  if (message === 'Invalid customer data') {
    return 'יש למלא שם מלא ומספר טלפון תקין';
  }

  if (message === 'Create profile failed') {
    return 'יצירת הלקוח נכשלה';
  }

  return message;
}

async function invokeCreateCustomer(body: Record<string, unknown>) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    return {
      data: null,
      error: {
        message: 'יש להתחבר מחדש כדי להוסיף לקוח',
      },
    };
  }

  return supabase.functions.invoke('create-customer', {
    body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });
}

/**
 * Fetch all profiles (customers and crew members)
 */
export async function fetchAllProfiles(): Promise<{ data: any[] | null; error: any }> {
  try {
    console.log('🔵 [CrewProfiles] Fetching all profiles');

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        phone,
        avatar_url,
        role,
        is_blocked,
        display_order,
        created_at,
        updated_at
      `)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('🔴 [CrewProfiles] Error fetching profiles:', error);
      return { data: null, error };
    }

    console.log('🟢 [CrewProfiles] Profiles fetched successfully:', data?.length || 0);
    return { data, error: null };
  } catch (error) {
    console.error('🔴 [CrewProfiles] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Fetch profiles by role (customers or crew_member)
 */
export async function fetchProfilesByRole(role: 'customer' | 'crew_member'): Promise<{ data: any[] | null; error: any }> {
  try {
    console.log('🔵 [CrewProfiles] Fetching profiles by role:', role);

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        phone,
        avatar_url,
        role,
        is_blocked,
        display_order,
        created_at,
        updated_at
      `)
      .eq('role', role)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('🔴 [CrewProfiles] Error fetching profiles by role:', error);
      return { data: null, error };
    }

    console.log('🟢 [CrewProfiles] Profiles by role fetched successfully:', data?.length || 0);
    return { data, error: null };
  } catch (error) {
    console.error('🔴 [CrewProfiles] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Fetch customers only
 */
export async function fetchCustomers(): Promise<{ data: any[] | null; error: any }> {
  return fetchProfilesByRole('customer');
}

/**
 * Fetch a single customer profile by id
 */
export async function fetchCustomerProfile(
  customerId: string
): Promise<{ data: any | null; error: any }> {
  try {
    console.log('🔵 [CrewProfiles] Fetching customer profile:', customerId);

    const { data, error } = await supabase
      .from('profiles')
      .select(
        `
        id,
        full_name,
        phone,
        avatar_url,
        role,
        is_blocked,
        display_order,
        created_at,
        updated_at
      `
      )
      .eq('id', customerId)
      .single();

    if (error) {
      console.error('🔴 [CrewProfiles] Error fetching customer profile:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('🔴 [CrewProfiles] Unexpected error fetching customer profile:', error);
    return { data: null, error };
  }
}

/**
 * Fetch crew members only
 */
export async function fetchCrewMembers(): Promise<{ data: any[] | null; error: any }> {
  try {
    console.log('🔵 [CrewProfiles] Fetching crew members and admins');

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        phone,
        avatar_url,
        role,
        is_blocked,
        display_order,
        created_at,
        updated_at
      `)
      .in('role', ['crew', 'admin'])
      .order('full_name', { ascending: true });

    if (error) {
      console.error('🔴 [CrewProfiles] Error fetching crew members and admins:', error);
      return { data: null, error };
    }

    console.log('🟢 [CrewProfiles] Crew members and admins fetched successfully:', data?.length || 0);
    return { data, error: null };
  } catch (error) {
    console.error('🔴 [CrewProfiles] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Update user profile avatar
 */
export async function updateUserAvatar(avatarUrl: string): Promise<{ data: any | null; error: any }> {
  try {
    console.log('🔵 [CrewProfiles] Updating user avatar');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('🔴 [CrewProfiles] Error updating avatar:', error);
      return { data: null, error };
    }

    console.log('🟢 [CrewProfiles] Avatar updated successfully');
    return { data, error: null };
  } catch (error) {
    console.error('🔴 [CrewProfiles] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Bulk create customer profiles in parallel
 */
export async function bulkCreateCustomerProfiles(
  customers: { full_name: string; phone: string }[]
): Promise<{ successCount: number; skippedCount: number; failCount: number }> {
  try {
    const { data, error } = await invokeCreateCustomer({ customers });

    if (error) {
      console.error('🔴 [CrewProfiles] Bulk create error:', error);
      return { successCount: 0, skippedCount: 0, failCount: customers.length };
    }

    return {
      successCount: data?.success || 0,
      skippedCount: data?.skipped || 0,
      failCount: data?.failed || 0,
    };
  } catch (error) {
    console.error('🔴 [CrewProfiles] Unexpected bulk create error:', error);
    return { successCount: 0, skippedCount: 0, failCount: customers.length };
  }
}

/**
 * Create a new customer profile
 */
export async function createCustomerProfile(input: {
  full_name: string;
  phone: string;
}): Promise<{ data: any | null; error: any }> {
  try {
    const { data, error } = await invokeCreateCustomer({
      full_name: input.full_name,
      phone: input.phone,
    });

    if (error) {
      let message = error.message;
      const context = (error as any)?.context;
      if (context?.body) {
        try {
          const parsed = typeof context.body === 'string' ? JSON.parse(context.body) : context.body;
          if (parsed?.error) message = parsed.error;
        } catch {
          // ignore parse errors
        }
      }
      message = translateCreateCustomerError(message, context?.status);
      console.error('🔴 [CrewProfiles] Error creating customer profile:', error);
      return { data: null, error: { ...error, message } };
    }

    console.log('🟢 [CrewProfiles] Customer profile created successfully');
    return { data: data?.data || null, error: null };
  } catch (error) {
    console.error('🔴 [CrewProfiles] Unexpected error creating customer profile:', error);
    return { data: null, error };
  }
}
