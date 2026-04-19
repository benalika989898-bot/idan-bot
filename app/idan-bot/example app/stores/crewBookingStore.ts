import { create } from 'zustand';
import { User } from '@/types/auth';
import { AppointmentType } from '@/types/appointments';

export interface CrewBookingStoreState {
  currentStep: number;
  isExistingCustomer: boolean;
  selectedCustomer: User | null;
  guestName: string;
  selectedAppointmentType: AppointmentType | null;
  selectedDate: string;
  disabledDates: string[];
  selectedTimeSlot: string;
  isRefreshing: boolean;
}

interface CrewBookingStoreActions {
  setCurrentStep: (step: number) => void;
  setIsExistingCustomer: (value: boolean) => void;
  setSelectedCustomer: (customer: User | null) => void;
  setGuestName: (name: string) => void;
  setSelectedAppointmentType: (type: AppointmentType | null) => void;
  setSelectedDate: (date: string) => void;
  setDisabledDates: (dates: string[]) => void;
  setSelectedTimeSlot: (slot: string) => void;
  setIsRefreshing: (refreshing: boolean) => void;
  clearSelections: (fromStep: number) => void;
  reset: () => void;
}

export type CrewBookingStore = CrewBookingStoreState & CrewBookingStoreActions;

const initialState: CrewBookingStoreState = {
  currentStep: 0,
  isExistingCustomer: true,
  selectedCustomer: null,
  guestName: '',
  selectedAppointmentType: null,
  selectedDate: '',
  disabledDates: [],
  selectedTimeSlot: '',
  isRefreshing: false,
};

export const useCrewBookingStore = create<CrewBookingStore>((set) => ({
  ...initialState,
  setCurrentStep: (currentStep) => set({ currentStep }),
  setIsExistingCustomer: (isExistingCustomer) => set({ isExistingCustomer }),
  setSelectedCustomer: (selectedCustomer) => set({ selectedCustomer }),
  setGuestName: (guestName) => set({ guestName }),
  setSelectedAppointmentType: (selectedAppointmentType) => set({ selectedAppointmentType }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setDisabledDates: (disabledDates) => set({ disabledDates }),
  setSelectedTimeSlot: (selectedTimeSlot) => set({ selectedTimeSlot }),
  setIsRefreshing: (isRefreshing) => set({ isRefreshing }),
  clearSelections: (fromStep) =>
    set((state) => ({
      selectedDate: fromStep <= 2 ? '' : state.selectedDate,
      selectedTimeSlot: fromStep <= 3 ? '' : state.selectedTimeSlot,
    })),
  reset: () => set(initialState),
}));
