import { supabase } from '@/lib/supabase';

export interface AppointmentProductSale {
  appointment_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  sold_by: string;
  notes?: string;
}

export interface AppointmentProductSaleRecord extends AppointmentProductSale {
  id: string;
  total_price: number;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
  };
}

/**
 * Record multiple product sales for an appointment
 */
export const recordAppointmentProductSales = async (salesData: AppointmentProductSale[]) => {
  try {
    const { data, error } = await supabase
      .from('appointment_product_sales')
      .insert(salesData)
      .select('*');

    if (!error) {
      try {
        const channel = supabase.channel('analytics-updates');
        await channel.send({
          type: 'broadcast',
          event: 'analytics_updated',
          payload: {
            type: 'product_sales',
            appointment_id: salesData[0]?.appointment_id,
            sold_by: salesData[0]?.sold_by,
          },
        });
      } catch (broadcastError) {
        console.warn('⚠️ [AppointmentSales] Failed to broadcast analytics update:', broadcastError);
      }
    }

    return { data, error };
  } catch (error) {
    console.error('Error recording appointment product sales:', error);
    return { data: null, error };
  }
};

/**
 * Get product sales for a specific appointment
 */
export const fetchAppointmentProductSales = async (appointmentId: string) => {
  try {
    const { data, error } = await supabase
      .from('appointment_product_sales')
      .select(`
        *,
        product:products(
          id,
          name,
          description,
          price,
          image_url
        )
      `)
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false });

    return { data, error };
  } catch (error) {
    console.error('Error fetching appointment product sales:', error);
    return { data: null, error };
  }
};

/**
 * Get all product sales by a specific crew member
 */
export const fetchProductSalesByCrewMember = async (crewMemberId: string, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('appointment_product_sales')
      .select(`
        *,
        product:products(
          id,
          name,
          description,
          price,
          image_url
        ),
        appointment:appointments(
          id,
          appointment_date,
          start_time,
          customer:profiles!appointments_customer_id_fkey(
            id,
            full_name
          )
        )
      `)
      .eq('sold_by', crewMemberId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data, error };
  } catch (error) {
    console.error('Error fetching product sales by crew member:', error);
    return { data: null, error };
  }
};

/**
 * Get product sales for a specific customer (via their appointments)
 */
export const fetchProductSalesByCustomer = async (customerId: string) => {
  try {
    const { data, error } = await supabase
      .from('appointment_product_sales')
      .select(`
        *,
        product:products(
          id,
          name,
          price,
          image_url
        ),
        appointment:appointments!inner(
          id,
          appointment_date,
          start_time,
          customer_id
        )
      `)
      .eq('appointment.customer_id', customerId)
      .order('created_at', { ascending: false });

    return { data, error };
  } catch (error) {
    console.error('Error fetching product sales by customer:', error);
    return { data: null, error };
  }
};

/**
 * Get product sales analytics
 */
export const fetchProductSalesAnalytics = async (startDate?: string, endDate?: string) => {
  try {
    let query = supabase
      .from('appointment_product_sales')
      .select(`
        *,
        product:products(
          id,
          name,
          category
        )
      `);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    return { data, error };
  } catch (error) {
    console.error('Error fetching product sales analytics:', error);
    return { data: null, error };
  }
};
