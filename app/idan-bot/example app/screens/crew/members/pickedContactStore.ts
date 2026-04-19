import { create } from 'zustand';

export interface PickedContact {
  name: string;
  phone: string;
}

interface PickedContactState {
  contacts: PickedContact[];
  set: (contacts: PickedContact[]) => void;
  clear: () => void;
}

export const usePickedContact = create<PickedContactState>((set) => ({
  contacts: [],
  set: (contacts) => set({ contacts }),
  clear: () => set({ contacts: [] }),
}));
