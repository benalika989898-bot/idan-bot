import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/auth';
import { AppointmentType } from '@/types/appointments';
import { calculateComprehensiveAvailability, ComprehensiveAvailability, DateAvailability } from '@/services/comprehensiveAvailability';
import { recalculateSpecificDates } from '@/services/availabilityUpdater';
import { generateAvailableDays } from '@/utils/appointment';

export const useComprehensiveAvailability = (
  selectedCrewMember: User | null,
  selectedAppointmentType: AppointmentType | null
) => {
  const queryClient = useQueryClient();
  
  const { data: availabilityData, isLoading, error } = useQuery({
    queryKey: ['comprehensiveAvailability', selectedCrewMember?.id, selectedAppointmentType?.id],
    queryFn: async () => {
      if (!selectedCrewMember?.id || !selectedAppointmentType?.id) {
        console.log('🔍 [ComprehensiveAvailability] Missing crew member or appointment type');
        return null;
      }

      console.log(`🔍 [ComprehensiveAvailability] Calculating for crew ${selectedCrewMember.id}, type ${selectedAppointmentType.id}`);
      const { data, error } = await calculateComprehensiveAvailability(
        selectedCrewMember.id,
        selectedAppointmentType.id,
        selectedAppointmentType.duration_minutes
      );

      if (error) {
        console.error('🔴 [ComprehensiveAvailability] Error:', error);
        throw error;
      }
      
      console.log(`✅ [ComprehensiveAvailability] Got data:`, data?.dates.map(d => `${d.date}: ${d.timeSlots.length} slots`));
      return data;
    },
    enabled: !!selectedCrewMember?.id && !!selectedAppointmentType?.id,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
  });

  // Subscribe to realtime updates for schedule changes, appointments, and breaks
  useQuery({
    queryKey: ['availabilityRealtime', selectedCrewMember?.id],
    queryFn: () => null, // No-op query function
    enabled: !!selectedCrewMember?.id && !!availabilityData,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    gcTime: 0, // Don't cache this "query"
    meta: {
      subscriptionSetup: () => {
        if (!selectedCrewMember?.id) return () => {};

        console.log('📡 [ComprehensiveAvailability] Setting up realtime subscriptions');

        // Helper function to update specific dates in the cache
        const updateSpecificDates = async (datesToUpdate: string[], reason: 'schedule' | 'appointment' | 'break') => {
          const queryKey = ['comprehensiveAvailability', selectedCrewMember.id, selectedAppointmentType?.id];
          const existingData = queryClient.getQueryData<ComprehensiveAvailability>(queryKey);
          
          if (existingData) {
            console.log(`🎯 [ComprehensiveAvailability] Updating specific dates due to ${reason} change:`, datesToUpdate);
            
            const updatedData = await recalculateSpecificDates(existingData, datesToUpdate, reason);
            if (updatedData) {
              queryClient.setQueryData(queryKey, updatedData);
              console.log(`✅ [ComprehensiveAvailability] Successfully updated ${datesToUpdate.length} dates`);
            } else {
              console.warn(`⚠️ [ComprehensiveAvailability] Failed to update specific dates, falling back to full invalidation`);
              queryClient.invalidateQueries({ queryKey });
            }
          }
        };

        // Get available days for date mapping
        const availableDays = generateAvailableDays();
        const availableDatesSet = new Set(availableDays.map(d => d.date));

        // Schedule updates subscription
        const scheduleSubscription = supabase
          .channel(`schedule-updates`)
          .on('broadcast', { event: 'schedule_updated' }, (payload) => {
            const { crew_member_id } = payload.payload;
            if (crew_member_id === selectedCrewMember.id) {
              // Schedule changes affect all dates, so recalculate all
              console.log('📅 [ComprehensiveAvailability] Schedule updated for this crew member');
              const allDates = Array.from(availableDatesSet);
              updateSpecificDates(allDates, 'schedule');
            }
          })
          .subscribe();

        // Appointment changes subscription  
        const appointmentSubscription = supabase
          .channel(`crew-appointments-${selectedCrewMember.id}`)
          .on('broadcast', { event: 'appointment_booked' }, (payload) => {
            const { appointment_date } = payload.payload;
            if (appointment_date && availableDatesSet.has(appointment_date)) {
              console.log(`📅 [ComprehensiveAvailability] Appointment booked on ${appointment_date}`);
              updateSpecificDates([appointment_date], 'appointment');
            }
          })
          .on('broadcast', { event: 'appointment_cancelled' }, (payload) => {
            const { appointment_date } = payload.payload;
            if (appointment_date && availableDatesSet.has(appointment_date)) {
              console.log(`❌ [ComprehensiveAvailability] Appointment cancelled on ${appointment_date}`);
              updateSpecificDates([appointment_date], 'appointment');
            }
          })
          .subscribe();

        // Break hours subscription
        const breakSubscription = supabase
          .channel(`break-hours`)
          .on('broadcast', { event: 'break_hours_updated' }, (payload) => {
            if (payload.payload.crew_member_id === selectedCrewMember.id) {
              const { start_date, end_date } = payload.payload;
              console.log(`🚫 [ComprehensiveAvailability] Break hours updated from ${start_date} to ${end_date}`);
              
              // Calculate affected dates within our available date range
              const affectedDates: string[] = [];
              const startDate = new Date(start_date);
              const endDate = new Date(end_date);
              
              for (let current = new Date(startDate); current <= endDate; current.setDate(current.getDate() + 1)) {
                const dateStr = current.toISOString().split('T')[0];
                if (availableDatesSet.has(dateStr)) {
                  affectedDates.push(dateStr);
                }
              }
              
              if (affectedDates.length > 0) {
                updateSpecificDates(affectedDates, 'break');
              }
            }
          })
          .subscribe();

        return () => {
          scheduleSubscription.unsubscribe();
          appointmentSubscription.unsubscribe();
          breakSubscription.unsubscribe();
        };
      }
    }
  });

  // Derived data for easy consumption
  const processedData = (() => {
    if (!availabilityData) {
      return {
        disabledDates: [],
        availabilityByDate: new Map<string, DateAvailability>(),
        hasAnyAvailableSlots: false,
        totalAvailableSlots: 0,
      };
    }

    const disabledDates: string[] = [];
    const availabilityByDate = new Map<string, DateAvailability>();
    let totalAvailableSlots = 0;

    for (const dateAvailability of availabilityData.dates) {
      availabilityByDate.set(dateAvailability.date, dateAvailability);

      if (!dateAvailability.isAvailable) {
        disabledDates.push(dateAvailability.date);
      } else {
        totalAvailableSlots += dateAvailability.timeSlots.length;
      }
    }

    return {
      disabledDates,
      availabilityByDate,
      hasAnyAvailableSlots: totalAvailableSlots > 0,
      totalAvailableSlots,
    };
  })();

  const getTimeSlotsForDate = (date: string) => {
    return processedData.availabilityByDate.get(date)?.timeSlots || [];
  };

  const isDateAvailable = (date: string) => {
    return processedData.availabilityByDate.get(date)?.isAvailable || false;
  };

  const getUnavailabilityReason = (date: string) => {
    return processedData.availabilityByDate.get(date)?.reason;
  };

  return {
    // Raw data
    availabilityData,
    isLoading,
    error,

    // Processed data
    disabledDates: processedData.disabledDates,
    hasAnyAvailableSlots: processedData.hasAnyAvailableSlots,
    totalAvailableSlots: processedData.totalAvailableSlots,

    // Helper functions
    getTimeSlotsForDate,
    isDateAvailable,
    getUnavailabilityReason,

    // For compatibility with existing code
    availabilityCalculated: !isLoading && !error,
  };
};
