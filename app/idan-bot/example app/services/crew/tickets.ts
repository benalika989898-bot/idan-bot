import { supabase } from '../../lib/supabase';
import { CustomerTickets, TicketTransaction, GrantTicketsRequest } from '../../types/tickets';

/**
 * Get customer ticket balance
 */
export async function getCustomerTicketBalance(
  customerId: string
): Promise<{ data: number | null; error: any }> {
  try {
    console.log('🔵 [CrewTickets] Fetching ticket balance for customer:', customerId);

    const { data, error } = await supabase.rpc('get_customer_ticket_balance', {
      customer_uuid: customerId,
    });

    if (error) {
      console.error('🔴 [CrewTickets] Error fetching ticket balance:', error);
      return { data: null, error };
    }

    console.log('🟢 [CrewTickets] Ticket balance fetched successfully:', data);
    return { data: data || 0, error: null };
  } catch (error) {
    console.error('🔴 [CrewTickets] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Get customer ticket balance available for a specific crew member
 */
export async function getCustomerTicketBalanceForCrew(
  customerId: string,
  crewMemberId: string
): Promise<{ data: number | null; error: any }> {
  try {
    console.log('🔵 [CrewTickets] Fetching crew-scoped ticket balance:', {
      customerId,
      crewMemberId,
    });

    const { data, error } = await supabase.rpc('get_customer_ticket_balance_for_crew', {
      customer_uuid: customerId,
      crew_member_uuid: crewMemberId,
    });

    if (error) {
      console.error('🔴 [CrewTickets] Error fetching crew-scoped ticket balance:', error);
      return { data: null, error };
    }

    console.log('🟢 [CrewTickets] Crew-scoped ticket balance fetched successfully:', data);
    return { data: data || 0, error: null };
  } catch (error) {
    console.error('🔴 [CrewTickets] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Get customer ticket balance for a specific scope (crew member or global)
 */
export async function getCustomerTicketBalanceForScope(
  customerId: string,
  crewMemberId: string
): Promise<{ data: number | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('customer_tickets')
      .select('ticket_balance')
      .eq('customer_id', customerId)
      .eq('crew_member_id', crewMemberId)
      .maybeSingle();

    if (error) {
      console.error('🔴 [CrewTickets] Error fetching scoped ticket balance:', error);
      return { data: null, error };
    }

    return { data: data?.ticket_balance ?? 0, error: null };
  } catch (error) {
    console.error('🔴 [CrewTickets] Unexpected error fetching scoped ticket balance:', error);
    return { data: null, error };
  }
}

/**
 * Set customer ticket balance for a specific scope and log a transaction
 */
export async function setCustomerTicketBalance(params: {
  customerId: string;
  crewMemberId: string;
  newBalance: number;
  adjustedBy: string;
  reason?: string;
  price?: number;
}): Promise<{ data: boolean | null; error: any }> {
  try {
    const { customerId, crewMemberId, newBalance, adjustedBy, reason, price } = params;

    if (!crewMemberId) {
      return { data: null, error: new Error('Missing crew member') };
    }

    if (newBalance < 0) {
      return { data: null, error: new Error('Invalid ticket balance') };
    }

    const { data: currentBalance, error: balanceError } = await getCustomerTicketBalanceForScope(
      customerId,
      crewMemberId
    );

    if (balanceError) {
      return { data: null, error: balanceError };
    }

    const delta = newBalance - (currentBalance ?? 0);

    const { error: upsertError } = await supabase.from('customer_tickets').upsert(
      {
        customer_id: customerId,
        crew_member_id: crewMemberId,
        ticket_balance: newBalance,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'customer_id,crew_member_id' }
    );

    if (upsertError) {
      console.error('🔴 [CrewTickets] Error updating scoped ticket balance:', upsertError);
      return { data: null, error: upsertError };
    }

    if (delta !== 0) {
      const transactionType = delta > 0 ? 'granted' : 'used';

      const { error: transactionError } = await supabase.from('ticket_transactions').insert({
        customer_id: customerId,
        crew_member_id: crewMemberId,
        transaction_type: transactionType,
        amount: delta,
        balance_after: newBalance,
        granted_by: adjustedBy,
        reason: reason || 'Manual adjustment',
        ...(transactionType === 'granted' && price ? { price } : {}),
      });

      if (transactionError) {
        console.error('🔴 [CrewTickets] Error logging ticket adjustment:', transactionError);
        return { data: null, error: transactionError };
      }
    }

    return { data: true, error: null };
  } catch (error) {
    console.error('🔴 [CrewTickets] Unexpected error setting ticket balance:', error);
    return { data: null, error };
  }
}

/**
 * Get customer tickets record
 */
export async function getCustomerTickets(
  customerId: string
): Promise<{ data: CustomerTickets | null; error: any }> {
  try {
    console.log('🔵 [CrewTickets] Fetching tickets record for customer:', customerId);

    const { data, error } = await supabase
      .from('customer_tickets')
      .select('*')
      .eq('customer_id', customerId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('🔴 [CrewTickets] Error fetching tickets record:', error);
      return { data: null, error };
    }

    console.log('🟢 [CrewTickets] Tickets record fetched successfully');
    return { data: data as CustomerTickets, error: null };
  } catch (error) {
    console.error('🔴 [CrewTickets] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Grant tickets to a customer
 */
export async function grantTicketsToCustomer(
  request: GrantTicketsRequest,
  grantedBy: string
): Promise<{ data: boolean | null; error: any }> {
  try {
    console.log('🔵 [CrewTickets] Granting tickets:', request, 'by:', grantedBy);

    const { data, error } = await supabase.rpc('grant_tickets_to_customer', {
      customer_uuid: request.customer_id,
      ticket_amount: request.ticket_amount,
      granted_by_uuid: grantedBy,
      grant_reason: request.reason || null,
      crew_member_uuid: request.crew_member_id ?? null,
    });

    if (error) {
      console.error('🔴 [CrewTickets] Error granting tickets:', error);
      return { data: null, error };
    }

    console.log('🟢 [CrewTickets] Tickets granted successfully');
    return { data: data, error: null };
  } catch (error) {
    console.error('🔴 [CrewTickets] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Check if customer can use a ticket for appointment
 */
export async function canUseTicketForAppointment(
  customerId: string,
  crewMemberId?: string
): Promise<{ canUse: boolean; balance: number }> {
  try {
    const { data: balance, error } = crewMemberId
      ? await getCustomerTicketBalanceForCrew(customerId, crewMemberId)
      : await getCustomerTicketBalance(customerId);
    
    if (error) {
      return { canUse: false, balance: 0 };
    }
    
    return { canUse: (balance || 0) >= 1, balance: balance || 0 };
  } catch (error) {
    console.error('🔴 [CrewTickets] Error checking ticket availability:', error);
    return { canUse: false, balance: 0 };
  }
}

/**
 * Get customer ticket transactions
 */
export async function getCustomerTicketTransactions(
  customerId: string
): Promise<{ data: TicketTransaction[] | null; error: any }> {
  try {
    console.log('🔵 [CrewTickets] Fetching ticket transactions for customer:', customerId);

    const { data, error } = await supabase
      .from('ticket_transactions')
      .select(`
        *,
        appointment:appointments (
          id,
          appointment_date,
          start_time,
          appointment_type:appointment_types (
            name
          )
        ),
        granter:profiles!granted_by (
          id,
          full_name
        )
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('🔴 [CrewTickets] Error fetching ticket transactions:', error);
      return { data: null, error };
    }

    console.log('🟢 [CrewTickets] Ticket transactions fetched successfully:', data?.length || 0);
    return { data: data as TicketTransaction[], error: null };
  } catch (error) {
    console.error('🔴 [CrewTickets] Unexpected error:', error);
    return { data: null, error };
  }
}
