import { useQuery } from '@tanstack/react-query';
import { fetchActiveCrewMembers } from '@/services/crew/members';
import { fetchAllAppointmentTypes, fetchAppointmentTypesByCrewMember } from '@/services/crew/appointmentTypes';
import { getAvailableTimeSlots, fetchCrewSchedule } from '@/services/crew/schedules';
import { User } from '@/types/auth';
import { AppointmentType } from '@/types/appointments';

export const useCrewMembers = () => {
  return useQuery({
    queryKey: ['activeCrewMembers'],
    queryFn: async () => {
      const { data, error } = await fetchActiveCrewMembers();
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
  });
};

export const useAppointmentTypes = () => {
  return useQuery({
    queryKey: ['appointmentTypes'],
    queryFn: async () => {
      const { data, error } = await fetchAllAppointmentTypes();
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
  });
};

export const useAppointmentTypesByCrewMember = (crewMemberId: string | undefined) => {
  return useQuery({
    queryKey: ['appointmentTypes', crewMemberId],
    queryFn: async () => {
      if (!crewMemberId) return [];
      const { data, error } = await fetchAppointmentTypesByCrewMember(crewMemberId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!crewMemberId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
  });
};

export const useCrewSchedules = (crewMembers: User[]) => {
  return useQuery({
    queryKey: ['allCrewSchedules'],
    queryFn: async () => {
      if (!crewMembers.length) return {};

      const schedulePromises = crewMembers.map(async (member) => {
        const { data, error } = await fetchCrewSchedule(member.id);
        return { memberId: member.id, schedule: data || [] };
      });

      const results = await Promise.all(schedulePromises);
      const scheduleMap = results.reduce(
        (acc, { memberId, schedule }) => {
          acc[memberId] = schedule;
          return acc;
        },
        {} as Record<string, any[]>
      );

      return scheduleMap;
    },
    enabled: crewMembers.length > 0,
  });
};

export const useAvailableTimeSlots = (
  crewMemberId: string | undefined,
  selectedDate: string,
  appointmentType: AppointmentType | null
) => {
  return useQuery({
    queryKey: ['availableSlots', crewMemberId, selectedDate, appointmentType?.id],
    queryFn: async () => {
      if (!crewMemberId || !selectedDate || !appointmentType) return [];
      const { data, error } = await getAvailableTimeSlots(
        crewMemberId,
        selectedDate,
        appointmentType.duration_minutes
      );
      if (error) throw error;
      return data || [];
    },
    enabled: !!crewMemberId && !!selectedDate && !!appointmentType,
    staleTime: 0, // Always fetch fresh data to prevent showing booked slots
    gcTime: 1000 * 60 * 2, // Keep in cache for 2 minutes
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window comes back into focus
  });
};