import { create } from 'zustand';

type SelectedCrewPayload = {
  id: string;
  name?: string;
  avatarUrl?: string;
};

type CrewCalendarState = {
  selectedCrewMemberId: string | null;
  selectedCrewMemberName: string | null;
  selectedCrewMemberAvatarUrl: string | null;
  setSelectedCrew: (payload: SelectedCrewPayload) => void;
  clearSelectedCrew: () => void;
};

export const useCrewCalendarStore = create<CrewCalendarState>((set) => ({
  selectedCrewMemberId: null,
  selectedCrewMemberName: null,
  selectedCrewMemberAvatarUrl: null,
  setSelectedCrew: ({ id, name, avatarUrl }) =>
    set({
      selectedCrewMemberId: id,
      selectedCrewMemberName: name ?? null,
      selectedCrewMemberAvatarUrl: avatarUrl ?? null,
    }),
  clearSelectedCrew: () =>
    set({
      selectedCrewMemberId: null,
      selectedCrewMemberName: null,
      selectedCrewMemberAvatarUrl: null,
    }),
}));
