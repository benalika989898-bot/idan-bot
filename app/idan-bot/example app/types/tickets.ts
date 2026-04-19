export interface CustomerTickets {
  id: string;
  customer_id: string;
  crew_member_id?: string | null;
  ticket_balance: number;
  created_at: string;
  updated_at: string;
}

export interface TicketTransaction {
  id: string;
  customer_id: string;
  crew_member_id?: string | null;
  transaction_type: 'granted' | 'used' | 'refunded';
  amount: number;
  balance_after: number;
  appointment_id?: string;
  granted_by?: string;
  reason?: string;
  price?: number;
  created_at: string;
  
  // Related data
  appointment?: {
    id: string;
    appointment_date: string;
    start_time: string;
    appointment_type?: {
      name: string;
    };
  };
  granter?: {
    id: string;
    full_name: string;
  };
}

export interface GrantTicketsRequest {
  customer_id: string;
  ticket_amount: number;
  crew_member_id?: string | null;
  reason?: string;
}
