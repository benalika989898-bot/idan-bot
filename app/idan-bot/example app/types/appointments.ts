export interface Appointment {
  id: string;
  customer_id: string;
  crew_member_id: string;
  appointment_type_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
  payment_type?: 'cash' | 'ticket';
  status?: 'active' | 'cancelled';
  cancellation_reason?: string;

  // Related data
  customer?: {
    id: string;
    full_name: string;
    phone?: string;
    avatar_url?: string;
    role: string;
  };
  
  crew_member?: {
    id: string;
    full_name: string;
    phone?: string;
    avatar_url?: string;
    role: string;
  };

  appointment_type?: AppointmentType;
}

// Unified AppointmentType interface matching database schema
export interface AppointmentType {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  color?: string | null;
  can_use_tickets?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppointmentFilters {
  crew_member_id?: string;
  date?: string;
  service_type?: string;
}

export interface CreateAppointmentRequest {
  customer_id: string;
  crew_member_id: string;
  appointment_type_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
}

export interface UpdateAppointmentRequest {
  appointment_type_id?: string;
  appointment_date?: string;
  start_time?: string;
  end_time?: string;
}

// AppointmentType request interfaces
export interface CreateAppointmentTypeRequest {
  name: string;
  description?: string;
  duration_minutes: number;
  price?: number;
  color?: string;
  can_use_tickets?: boolean;
  is_active?: boolean;
}

export interface UpdateAppointmentTypeRequest {
  name?: string;
  description?: string;
  duration_minutes?: number;
  price?: number;
  color?: string;
  can_use_tickets?: boolean;
  is_active?: boolean;
}
