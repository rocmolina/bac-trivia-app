// src/lib/store/appStatusStore.ts
import { create } from 'zustand';

interface AppStatusModalState {
    isAppDisabledModalOpen: boolean;
    showAppDisabledModal: () => void;
    closeAppDisabledModal: () => void;
}

const useAppStatusStore = create<AppStatusModalState>((set) => ({
    isAppDisabledModalOpen: false,
    showAppDisabledModal: () => set({ isAppDisabledModalOpen: true }),
    closeAppDisabledModal: () => set({ isAppDisabledModalOpen: false }),
}));

export default useAppStatusStore;