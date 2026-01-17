import { create } from 'zustand'
import type { UpdateStore } from './definitions/types'

export const useUpdateStore = create<UpdateStore>((set) => ({
  updateAvailable: false,
  updateInfo: null,
  update: null,
  isDownloading: false,
  downloadProgress: 0,
  downloadTotal: 0,
  isModalOpen: false,
  isInstalled: false,

  setUpdateAvailable: (available, info, update) =>
    set({ updateAvailable: available, updateInfo: info, update }),

  setDownloading: (downloading) => set({ isDownloading: downloading }),

  setDownloadProgress: (progress, total) =>
    set({ downloadProgress: progress, downloadTotal: total }),

  setModalOpen: (open) => set({ isModalOpen: open }),

  setInstalled: (installed) => set({ isInstalled: installed }),

  reset: () =>
    set({
      updateAvailable: false,
      updateInfo: null,
      update: null,
      isDownloading: false,
      downloadProgress: 0,
      downloadTotal: 0,
      isModalOpen: false,
      isInstalled: false,
    }),
}))
