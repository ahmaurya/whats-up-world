
import { create } from 'zustand';

interface TransitStore {
  showTransit: boolean;
  toggleTransit: () => void;
  setShowTransit: (show: boolean) => void;
}

export const useTransitStore = create<TransitStore>((set) => ({
  showTransit: false,
  toggleTransit: () => set((state) => ({ showTransit: !state.showTransit })),
  setShowTransit: (show: boolean) => set({ showTransit: show }),
}));
