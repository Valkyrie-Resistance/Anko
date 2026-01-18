import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  checkForUpdate,
  fetchChangelogForVersion,
  isVersionSkipped,
  shouldRemindLater,
} from '@/lib/updater'
import { useUpdateStore } from '@/stores/update'

const UPDATE_CHECK_DELAY = 3000 // 3 seconds after app startup

export function useUpdateChecker() {
  const hasChecked = useRef(false)
  const setUpdateAvailable = useUpdateStore((s) => s.setUpdateAvailable)
  const setModalOpen = useUpdateStore((s) => s.setModalOpen)

  useEffect(() => {
    if (hasChecked.current) return
    hasChecked.current = true

    const timeoutId = setTimeout(async () => {
      // Skip if user chose "remind later" within the last 24 hours
      if (shouldRemindLater()) {
        return
      }

      const result = await checkForUpdate()

      if (result.available && result.info && result.update) {
        // Skip if user previously skipped this version
        if (isVersionSkipped(result.info.version)) {
          return
        }

        // Fetch changelog from CHANGELOG.md for the new version
        const changelogBody = await fetchChangelogForVersion(result.info.version)
        const enrichedInfo = {
          ...result.info,
          body: changelogBody ?? result.info.body,
        }

        setUpdateAvailable(true, enrichedInfo, result.update)

        toast('Update Available', {
          description: `Version ${result.info.version} is ready to download`,
          duration: 10000,
          action: {
            label: 'View Details',
            onClick: () => setModalOpen(true),
          },
        })
      }
    }, UPDATE_CHECK_DELAY)

    return () => clearTimeout(timeoutId)
  }, [setUpdateAvailable, setModalOpen])
}
