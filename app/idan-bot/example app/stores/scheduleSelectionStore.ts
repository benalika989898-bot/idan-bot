import { create } from 'zustand';

type ScheduleSelectionState = {
  selectedScheduleId: string | null;
  setSelectedScheduleId: (scheduleId: string | null) => void;
  clearSelectedScheduleId: () => void;
};

export const useScheduleSelectionStore = create<ScheduleSelectionState>((set) => ({
  selectedScheduleId: null,
  setSelectedScheduleId: (scheduleId) => set({ selectedScheduleId: scheduleId }),
  clearSelectedScheduleId: () => set({ selectedScheduleId: null }),
}));
