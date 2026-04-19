import { create } from 'zustand';
import { User } from '@/types/auth';
import { AppointmentType } from '@/types/appointments';
import type { CrewSchedule } from '@/services/crew/schedules';

type DayInput = { date: string };

type AppointmentBookingState = {
  selectedCrewMember: User | null;
  selectedAppointmentType: AppointmentType | null;
  crewSchedule: CrewSchedule[];
  dateAvailability: Map<string, boolean>;
  calculatingAvailability: boolean;
  setSelectedCrewMember: (member: User | null) => void;
  setSelectedAppointmentType: (appointmentType: AppointmentType | null) => void;
  setCrewSchedule: (schedule: CrewSchedule[]) => void;
  setDateAvailability: (availability: Map<string, boolean>) => void;
  calculateDateAvailability: (availableDays: DayInput[]) => Promise<void>;
  reset: () => void;
};

const initialState = {
  selectedCrewMember: null,
  selectedAppointmentType: null,
  crewSchedule: [],
  dateAvailability: new Map<string, boolean>(),
  calculatingAvailability: false,
};

export const useAppointmentBookingStore = create<AppointmentBookingState>((set) => ({
  ...initialState,
  setSelectedCrewMember: (member) => set({ selectedCrewMember: member }),
  setSelectedAppointmentType: (appointmentType) =>
    set({ selectedAppointmentType: appointmentType }),
  setCrewSchedule: (schedule) => set({ crewSchedule: schedule }),
  setDateAvailability: (availability) => set({ dateAvailability: availability }),
  calculateDateAvailability: async (availableDays) => {
    set({ calculatingAvailability: true });

    const availability = new Map<string, boolean>();
    for (const day of availableDays) {
      availability.set(day.date, true);
    }

    set({
      dateAvailability: availability,
      calculatingAvailability: false,
    });
  },
  reset: () => set({ ...initialState, dateAvailability: new Map<string, boolean>() }),
}));
