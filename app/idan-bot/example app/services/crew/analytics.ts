import { supabase } from '../../lib/supabase';

export interface AnalyticsData {
  totalAppointments: number;
  totalRevenue: number;
  totalCustomers: number;
  appointmentsByDay: { day: string; count: number; revenue: number }[];
  appointmentsByService: { service: string; count: number; revenue: number }[];
  dailyStats: { date: string; appointments: number; revenue: number }[];
  // Product sales data
  totalProductsSold: number;
  totalProductRevenue: number;
  productsByCategory: { product: string; quantity: number; revenue: number }[];
  dailyProductStats: { date: string; quantity: number; revenue: number }[];
  // Ticket revenue data
  totalTicketRevenue: number;
}

export interface CrewMemberAnalytics {
  crewMemberId: string;
  crewMemberName: string;
  crewMemberAvatar?: string;
  totalEarnings: number;
  totalAppointments: number;
  appointmentsByService: { service: string; count: number; revenue: number }[];
  // Product sales data
  totalProductsSold: number;
  totalProductEarnings: number;
  productsByCategory: { product: string; quantity: number; revenue: number }[];
  // Ticket sales data
  totalTicketsGranted?: number;
  ticketRecipients?: { customerName: string; amount: number }[];
}

export interface AllCrewAnalytics extends AnalyticsData {
  crewMemberBreakdown: CrewMemberAnalytics[];
  totalTicketsGranted?: number;
}

/** Format year/month to YYYY-MM-DD strings without timezone shift */
function getMonthDateRange(year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}

/** Returns appointment revenue only for non-ticket (cash) appointments */
const getAptRevenue = (apt: any) =>
  apt.payment_type === 'ticket' ? 0 : (apt.appointment_type?.price || 0);

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

/**
 * Single-pass processing of appointments into all aggregation buckets at once.
 * Replaces separate O(n) passes for byDay, byService, dailyStats, totals.
 */
function processAppointmentsSinglePass(appointments: any[]) {
  const byDayCount = new Array(7).fill(0);
  const byDayRevenue = new Array(7).fill(0);
  const serviceGroups: Record<string, { count: number; revenue: number }> = {};
  const dailyGroups: Record<string, { appointments: number; revenue: number }> = {};
  const customerIds = new Set<string>();
  let totalRevenue = 0;

  for (const apt of appointments) {
    const revenue = getAptRevenue(apt);
    totalRevenue += revenue;
    customerIds.add(apt.customer_id);

    // By day of week
    const dayIndex = new Date(apt.appointment_date).getDay();
    byDayCount[dayIndex]++;
    byDayRevenue[dayIndex] += revenue;

    // By service type
    const serviceName = apt.appointment_type?.name || 'אחר';
    if (!serviceGroups[serviceName]) {
      serviceGroups[serviceName] = { count: 0, revenue: 0 };
    }
    serviceGroups[serviceName].count++;
    serviceGroups[serviceName].revenue += revenue;

    // Daily stats
    const date = apt.appointment_date;
    if (!dailyGroups[date]) {
      dailyGroups[date] = { appointments: 0, revenue: 0 };
    }
    dailyGroups[date].appointments++;
    dailyGroups[date].revenue += revenue;
  }

  const appointmentsByDay = DAY_NAMES.map((day, index) => ({
    day,
    count: byDayCount[index],
    revenue: byDayRevenue[index],
  }));

  const appointmentsByService = Object.entries(serviceGroups).map(([service, data]) => ({
    service,
    count: data.count,
    revenue: data.revenue,
  }));

  const dailyStats = Object.entries(dailyGroups).map(([date, data]) => ({
    date,
    appointments: data.appointments,
    revenue: data.revenue,
  }));

  return {
    totalAppointments: appointments.length,
    totalRevenue,
    totalCustomers: customerIds.size,
    appointmentsByDay,
    appointmentsByService,
    dailyStats,
  };
}

/**
 * Helper function to fetch product sales for appointments
 */
async function fetchProductSalesForAppointments(appointmentIds: string[]) {
  if (appointmentIds.length === 0) {
    return { data: [], error: null };
  }

  // Batch IDs to avoid URL length limits (HTTP 400 "Bad Request")
  const BATCH_SIZE = 200;
  const allData: any[] = [];

  for (let i = 0; i < appointmentIds.length; i += BATCH_SIZE) {
    const batch = appointmentIds.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('appointment_product_sales')
      .select(`
        *,
        product:products (
          id,
          name,
          category
        )
      `)
      .in('appointment_id', batch);

    if (error) {
      return { data: [], error };
    }

    if (data) {
      allData.push(...data);
    }
  }

  return { data: allData, error: null };
}

/**
 * Helper function to process product sales data
 */
function processProductSalesData(productSales: any[], appointments: any[]) {
  const totalProductsSold = productSales.reduce((sum, sale) => sum + sale.quantity, 0);
  const totalProductRevenue = productSales.reduce((sum, sale) => sum + (sale.unit_price * sale.quantity), 0);

  // Group products by name
  const productGroups = productSales.reduce((acc, sale) => {
    const productName = sale.product?.name || 'לא ידוע';
    if (!acc[productName]) {
      acc[productName] = { quantity: 0, revenue: 0 };
    }
    acc[productName].quantity += sale.quantity;
    acc[productName].revenue += sale.unit_price * sale.quantity;
    return acc;
  }, {} as Record<string, { quantity: number; revenue: number }>);

  const productsByCategory = Object.entries(productGroups).map(([product, data]) => ({
    product,
    quantity: data.quantity,
    revenue: data.revenue
  }));

  // Create appointment date lookup
  const appointmentDateMap = appointments.reduce((acc, apt) => {
    acc[apt.id] = apt.appointment_date;
    return acc;
  }, {} as Record<string, string>);

  // Daily product stats
  const dailyProductGroups = productSales.reduce((acc, sale) => {
    const date = appointmentDateMap[sale.appointment_id];
    if (!date) return acc;
    
    if (!acc[date]) {
      acc[date] = { quantity: 0, revenue: 0 };
    }
    acc[date].quantity += sale.quantity;
    acc[date].revenue += sale.unit_price * sale.quantity;
    return acc;
  }, {} as Record<string, { quantity: number; revenue: number }>);

  const dailyProductStats = Object.entries(dailyProductGroups).map(([date, data]) => ({
    date,
    quantity: data.quantity,
    revenue: data.revenue
  }));

  return {
    totalProductsSold,
    totalProductRevenue,
    productsByCategory,
    dailyProductStats
  };
}

/**
 * Fetch analytics data for a specific month
 */
export async function fetchMonthlyAnalytics(
  crewMemberId: string,
  year: number,
  month: number
): Promise<{ data: AnalyticsData | null; error: any }> {
  try {
    const { startDate, endDate } = getMonthDateRange(year, month);

    // Fetch appointments and ticket revenue in parallel
    const [appointmentsResult, ticketResult] = await Promise.all([
      supabase
        .from('appointments')
        .select(`
          *,
          customer:profiles!customer_id (
            id,
            full_name
          ),
          appointment_type:appointment_types (
            id,
            name,
            price
          )
        `)
        .eq('crew_member_id', crewMemberId)
        .neq('status', 'cancelled')
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .order('appointment_date', { ascending: true }),
      supabase
        .from('ticket_transactions')
        .select('price')
        .eq('transaction_type', 'granted')
        .eq('granted_by', crewMemberId)
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`),
    ]);

    const { data: appointments, error } = appointmentsResult;

    if (error) {
      console.error('Error fetching appointments:', error);
      return { data: null, error };
    }

    // Fetch product sales (depends on appointment IDs)
    const appointmentIds = appointments.map(apt => apt.id);
    const { data: productSales, error: productError } = await fetchProductSalesForAppointments(appointmentIds);

    if (productError) {
      console.error('Error fetching product sales:', productError);
      return { data: null, error: productError };
    }

    const totalTicketRevenue = (ticketResult.data || []).reduce((sum, t) => sum + (t.price || 0), 0);

    // Single-pass processing of all appointment aggregations
    const processed = processAppointmentsSinglePass(appointments);
    const productData = processProductSalesData(productSales, appointments);

    const analyticsData: AnalyticsData = {
      ...processed,
      ...productData,
      totalTicketRevenue,
    };

    return { data: analyticsData, error: null };
  } catch (error) {
    console.error('Unexpected analytics error:', error);
    return { data: null, error };
  }
}

/**
 * Fetch all crew members analytics for admin view
 */
export async function fetchAllCrewAnalytics(
  year: number,
  month: number
): Promise<{ data: AllCrewAnalytics | null; error: any }> {
  try {
    const { startDate, endDate } = getMonthDateRange(year, month);
    const startDateTime = `${startDate}T00:00:00`;
    const endDateTime = `${endDate}T23:59:59`;

    // First, fetch all crew members to get their IDs
    const { data: crewMembers, error: crewError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('role', ['crew', 'admin']);

    if (crewError) {
      console.error('Error fetching crew members:', crewError);
      return { data: null, error: crewError };
    }

    if (!crewMembers || crewMembers.length === 0) {
      return { 
        data: {
          totalAppointments: 0,
          totalRevenue: 0,
          totalCustomers: 0,
          appointmentsByDay: [],
          appointmentsByService: [],
          dailyStats: [],
          totalProductsSold: 0,
          totalProductRevenue: 0,
          productsByCategory: [],
          dailyProductStats: [],
          crewMemberBreakdown: []
        }, 
        error: null 
      };
    }

    const crewMemberIds = crewMembers.map(member => member.id);

    // Fetch appointments and ticket grants in parallel
    const [appointmentsResult, ticketGrantsResult] = await Promise.all([
      supabase
        .from('appointments')
        .select(`
          *,
          crew_member:profiles!crew_member_id (
            id,
            full_name
          ),
          customer:profiles!customer_id (
            id,
            full_name
          ),
          appointment_type:appointment_types (
            id,
            name,
            price
          )
        `)
        .in('crew_member_id', crewMemberIds)
        .neq('status', 'cancelled')
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .order('appointment_date', { ascending: true }),
      supabase
        .from('ticket_transactions')
        .select(
          `
          id,
          customer_id,
          amount,
          price,
          granted_by,
          created_at,
          customer:profiles!customer_id (
            id,
            full_name
          ),
          granter:profiles!granted_by (
            id,
            full_name,
            avatar_url
          )
        `
        )
        .eq('transaction_type', 'granted')
        .in('granted_by', crewMemberIds)
        .gte('created_at', startDateTime)
        .lte('created_at', endDateTime),
    ]);

    const { data: appointments, error } = appointmentsResult;
    if (error) {
      console.error('Error fetching all crew appointments:', error);
      return { data: null, error };
    }

    const { data: ticketGrants, error: ticketError } = ticketGrantsResult;
    if (ticketError) {
      console.error('Error fetching ticket grants:', ticketError);
      return { data: null, error: ticketError };
    }

    // Fetch product sales (depends on appointment IDs)
    const appointmentIds = appointments.map(apt => apt.id);
    const { data: productSales, error: productError } = await fetchProductSalesForAppointments(appointmentIds);

    if (productError) {
      return { data: null, error: productError };
    }

    // Single-pass processing of all appointment aggregations
    const processed = processAppointmentsSinglePass(appointments);
    const overallProductData = processProductSalesData(productSales, appointments);

    // Create a crew members map for quick lookup
    const crewMembersMap = crewMembers?.reduce((map, member) => {
      map[member.id] = member;
      return map;
    }, {} as Record<string, any>) || {};

    // Crew member breakdown
    const crewGroups = appointments.reduce((acc, apt) => {
      const crewMemberId = apt.crew_member_id;
      const crewMemberData = crewMembersMap[crewMemberId];
      const crewMemberName = apt.crew_member?.full_name || crewMemberData?.full_name || 'לא ידוע';
      const crewMemberAvatar = crewMemberData?.avatar_url;
      
      if (!acc[crewMemberId]) {
        acc[crewMemberId] = {
          crewMemberId,
          crewMemberName,
          crewMemberAvatar,
          totalEarnings: 0,
          totalAppointments: 0,
          services: {} as Record<string, { count: number; revenue: number }>,
          totalProductsSold: 0,
          totalProductEarnings: 0,
          products: {} as Record<string, { quantity: number; revenue: number }>
        };
      }
      
      acc[crewMemberId].totalEarnings += getAptRevenue(apt);
      acc[crewMemberId].totalAppointments++;
      
      const serviceName = apt.appointment_type?.name || 'אחר';
      if (!acc[crewMemberId].services[serviceName]) {
        acc[crewMemberId].services[serviceName] = { count: 0, revenue: 0 };
      }
      acc[crewMemberId].services[serviceName].count++;
      acc[crewMemberId].services[serviceName].revenue += getAptRevenue(apt);
      
      return acc;
    }, {} as Record<string, any>);

    // Build appointment lookup map for O(1) access
    const appointmentMap = new Map(appointments.map(apt => [apt.id, apt]));

    // Add product sales data to crew members breakdown
    productSales.forEach(sale => {
      const appointment = appointmentMap.get(sale.appointment_id);
      if (!appointment) return;

      const crewMemberId = appointment.crew_member_id;
      const crewMemberData = crewMembersMap[crewMemberId];
      const crewMemberName = crewMemberData?.full_name || 'לא ידוע';
      const crewMemberAvatar = crewMemberData?.avatar_url;
      
      if (!crewGroups[crewMemberId]) {
        crewGroups[crewMemberId] = {
          crewMemberId,
          crewMemberName,
          crewMemberAvatar,
          totalEarnings: 0,
          totalAppointments: 0,
          services: {} as Record<string, { count: number; revenue: number }>,
          totalProductsSold: 0,
          totalProductEarnings: 0,
          products: {} as Record<string, { quantity: number; revenue: number }>
        };
      }
      
      crewGroups[crewMemberId].totalProductsSold += sale.quantity;
      crewGroups[crewMemberId].totalProductEarnings += sale.unit_price * sale.quantity;
      
      const productName = sale.product?.name || 'לא ידוע';
      if (!crewGroups[crewMemberId].products[productName]) {
        crewGroups[crewMemberId].products[productName] = { quantity: 0, revenue: 0 };
      }
      crewGroups[crewMemberId].products[productName].quantity += sale.quantity;
      crewGroups[crewMemberId].products[productName].revenue += sale.unit_price * sale.quantity;
    });

    // Add ticket grants to crew breakdown
    const ticketGrantGroups = (ticketGrants || []).reduce((acc, grant) => {
      const crewMemberId = grant.granted_by || 'unknown';
      const crewMemberData = crewMembersMap[crewMemberId];
      const crewMemberName =
        crewMemberData?.full_name || grant.granter?.full_name || 'לא ידוע';
      const crewMemberAvatar = crewMemberData?.avatar_url || grant.granter?.avatar_url;

      if (!acc[crewMemberId]) {
        acc[crewMemberId] = {
          crewMemberId,
          crewMemberName,
          crewMemberAvatar,
          totalTicketsGranted: 0,
          ticketRecipients: [],
        };
      }

      acc[crewMemberId].totalTicketsGranted += grant.amount || 0;
      acc[crewMemberId].ticketRecipients.push({
        customerName: grant.customer?.full_name || 'לקוח',
        amount: grant.amount || 0,
      });

      return acc;
    }, {} as Record<string, any>);

    // Ensure crew groups exist for ticket-only activity
    Object.keys(ticketGrantGroups).forEach((crewMemberId) => {
      if (crewGroups[crewMemberId]) return;
      const crewMemberData = crewMembersMap[crewMemberId];
      crewGroups[crewMemberId] = {
        crewMemberId,
        crewMemberName: crewMemberData?.full_name || 'לא ידוע',
        crewMemberAvatar: crewMemberData?.avatar_url,
        totalEarnings: 0,
        totalAppointments: 0,
        services: {} as Record<string, { count: number; revenue: number }>,
        totalProductsSold: 0,
        totalProductEarnings: 0,
        products: {} as Record<string, { quantity: number; revenue: number }>,
      };
    });

    const crewMemberBreakdown: CrewMemberAnalytics[] = Object.values(crewGroups).map((crew: any) => {
      const ticketInfo = ticketGrantGroups[crew.crewMemberId] || {
        totalTicketsGranted: 0,
        ticketRecipients: [],
      };
      return {
        crewMemberId: crew.crewMemberId,
        crewMemberName: crew.crewMemberName,
        crewMemberAvatar: crew.crewMemberAvatar,
        totalEarnings: crew.totalEarnings,
        totalAppointments: crew.totalAppointments,
        appointmentsByService: Object.entries(crew.services).map(([service, data]: [string, any]) => ({
          service,
          count: data.count,
          revenue: data.revenue
        })),
        totalProductsSold: crew.totalProductsSold || 0,
        totalProductEarnings: crew.totalProductEarnings || 0,
        productsByCategory: Object.entries(crew.products || {}).map(([product, data]: [string, any]) => ({
          product,
          quantity: data.quantity,
          revenue: data.revenue
        })),
        totalTicketsGranted: ticketInfo.totalTicketsGranted || 0,
        ticketRecipients: ticketInfo.ticketRecipients || [],
      };
    });

    const totalTicketRevenue = (ticketGrants || []).reduce((sum, grant) => sum + (grant.price || 0), 0);

    const allCrewAnalytics: AllCrewAnalytics = {
      ...processed,
      ...overallProductData,
      totalTicketRevenue,
      crewMemberBreakdown,
      totalTicketsGranted: (ticketGrants || []).reduce((sum, grant) => sum + (grant.amount || 0), 0),
    };

    return { data: allCrewAnalytics, error: null };
  } catch (error) {
    console.error('Unexpected analytics error:', error);
    return { data: null, error };
  }
}

/**
 * Fetch list of all crew members
 */
export async function fetchCrewMembersList(): Promise<{ data: Array<{id: string; name: string; avatar_url?: string}> | null; error: any }> {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('role', ['crew', 'admin'])
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching crew members:', error);
      return { data: null, error };
    }

    const crewMembers = profiles.map(profile => ({
      id: profile.id,
      name: profile.full_name || 'ללא שם',
      avatar_url: profile.avatar_url
    }));

    return { data: crewMembers, error: null };
  } catch (error) {
    console.error('Unexpected analytics error:', error);
    return { data: null, error };
  }
}

/**
 * Fetch analytics data for a specific date range
 */
export async function fetchAnalyticsByDateRange(
  crewMemberId: string,
  startDate: string,
  endDate: string
): Promise<{ data: AnalyticsData | null; error: any }> {
  try {
    // Fetch appointments and ticket revenue in parallel
    const [appointmentsResult, ticketResult] = await Promise.all([
      supabase
        .from('appointments')
        .select(`
          *,
          customer:profiles!customer_id (
            id,
            full_name
          ),
          appointment_type:appointment_types (
            id,
            name,
            price
          )
        `)
        .eq('crew_member_id', crewMemberId)
        .neq('status', 'cancelled')
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .order('appointment_date', { ascending: true }),
      supabase
        .from('ticket_transactions')
        .select('price')
        .eq('transaction_type', 'granted')
        .eq('granted_by', crewMemberId)
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`),
    ]);

    const { data: appointments, error } = appointmentsResult;
    if (error) {
      console.error('Error fetching appointments:', error);
      return { data: null, error };
    }

    // Fetch product sales (depends on appointment IDs)
    const appointmentIds = appointments.map(apt => apt.id);
    const { data: productSales, error: productError } = await fetchProductSalesForAppointments(appointmentIds);

    if (productError) {
      return { data: null, error: productError };
    }

    const totalTicketRevenue = (ticketResult.data || []).reduce((sum, t) => sum + (t.price || 0), 0);

    // Single-pass processing of all appointment aggregations
    const processed = processAppointmentsSinglePass(appointments);
    const productData = processProductSalesData(productSales, appointments);

    const analyticsData: AnalyticsData = {
      ...processed,
      ...productData,
      totalTicketRevenue,
    };

    return { data: analyticsData, error: null };
  } catch (error) {
    console.error('Unexpected analytics error:', error);
    return { data: null, error };
  }
}
