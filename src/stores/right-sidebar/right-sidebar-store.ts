import { create } from 'zustand'
import type { RightSidebarStore } from './definitions/types'

export const useRightSidebarStore = create<RightSidebarStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((state) => ({ open: !state.open })),
}))
